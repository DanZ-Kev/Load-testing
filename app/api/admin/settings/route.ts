import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';
import { z } from 'zod';

// Validation schemas
const SystemSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  category: z.enum(['GENERAL', 'SECURITY', 'PERFORMANCE', 'INTEGRATION', 'NOTIFICATION', 'BILLING', 'CUSTOM']),
  description: z.string().min(1).max(500),
  isPublic: z.boolean().default(false),
  isEncrypted: z.boolean().default(false),
  validation: z.object({
    type: z.enum(['string', 'number', 'boolean', 'json', 'url', 'email', 'regex']),
    required: z.boolean().default(false),
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(0).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    pattern: z.string().optional(),
    allowedValues: z.array(z.any()).optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateSettingSchema = z.object({
  id: z.string().uuid(),
  value: z.any(),
  description: z.string().min(1).max(500).optional(),
  isPublic: z.boolean().optional(),
  isEncrypted: z.boolean().optional(),
  validation: z.object({
    type: z.enum(['string', 'number', 'boolean', 'json', 'url', 'email', 'regex']),
    required: z.boolean().default(false),
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(0).optional(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    pattern: z.string().optional(),
    allowedValues: z.array(z.any()).optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

const BulkSettingOperationSchema = z.object({
  settingKeys: z.array(z.string()),
  operation: z.enum(['RESET_TO_DEFAULT', 'ENABLE', 'DISABLE', 'UPDATE_CATEGORY', 'ADD_TAGS', 'REMOVE_TAGS']),
  category: z.enum(['GENERAL', 'SECURITY', 'PERFORMANCE', 'INTEGRATION', 'NOTIFICATION', 'BILLING', 'CUSTOM']).optional(),
  tags: z.array(z.string()).optional(),
  removeTags: z.array(z.string()).optional(),
});

const ImportSettingsSchema = z.object({
  settings: z.array(SystemSettingSchema),
  overwrite: z.boolean().default(false),
  validateOnly: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const search = searchParams.get('search');
    const includeEncrypted = searchParams.get('includeEncrypted') === 'true';

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Build where clause
    const where: any = {};
    if (category) where.category = category;
    if (isPublic !== null) where.isPublic = isPublic === 'true';
    if (!includeEncrypted) where.isEncrypted = false;
    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    // Get settings
    const settings = await db.prisma.systemSetting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });

    // Get categories with counts
    const categoryStats = await db.prisma.systemSetting.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    // Get public vs private counts
    const visibilityStats = await db.prisma.systemSetting.groupBy({
      by: ['isPublic'],
      _count: { id: true },
    });

    // Get encrypted vs plain text counts
    const encryptionStats = await db.prisma.systemSetting.groupBy({
      by: ['isEncrypted'],
      _count: { id: true },
    });

    // Group settings by category for easier consumption
    const settingsByCategory = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, any[]>);

    // Log settings access
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'LOW',
      description: 'System settings accessed by admin',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        category,
        isPublic,
        search,
        includeEncrypted,
        resultCount: settings.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        settings,
        settingsByCategory,
        statistics: {
          total: settings.length,
          byCategory: categoryStats,
          byVisibility: visibilityStats,
          byEncryption: encryptionStats,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ error: 'Failed to fetch system settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settingData = SystemSettingSchema.parse(body);

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check for key conflicts
    const existingSetting = await db.prisma.systemSetting.findFirst({
      where: { key: settingData.key },
    });

    if (existingSetting) {
      return NextResponse.json({ error: 'Setting key already exists' }, { status: 409 });
    }

    // Validate setting value based on validation rules
    if (settingData.validation) {
      const validationResult = validateSettingValue(settingData.value, settingData.validation);
      if (!validationResult.isValid) {
        return NextResponse.json({ 
          error: 'Setting value validation failed', 
          details: validationResult.errors 
        }, { status: 400 });
      }
    }

    // Encrypt value if required
    let finalValue = settingData.value;
    if (settingData.isEncrypted) {
      // In production, you would use proper encryption here
      finalValue = `ENCRYPTED:${Buffer.from(JSON.stringify(settingData.value)).toString('base64')}`;
    }

    // Create the setting
    const newSetting = await db.prisma.systemSetting.create({
      data: {
        ...settingData,
        value: finalValue,
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the creation
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      description: 'System setting created by admin',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        settingKey: settingData.key,
        settingCategory: settingData.category,
        isEncrypted: settingData.isEncrypted,
        isPublic: settingData.isPublic,
      },
    });

    return NextResponse.json({
      success: true,
      data: newSetting,
    });
  } catch (error) {
    console.error('Error creating system setting:', error);
    return NextResponse.json({ error: 'Failed to create system setting' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = UpdateSettingSchema.parse(body);

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check if setting exists
    const existingSetting = await db.prisma.systemSetting.findUnique({
      where: { id: updateData.id },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'System setting not found' }, { status: 404 });
    }

    // Validate new value if validation rules exist
    if (updateData.validation) {
      const validationResult = validateSettingValue(updateData.value, updateData.validation);
      if (!validationResult.isValid) {
        return NextResponse.json({ 
          error: 'Setting value validation failed', 
          details: validationResult.errors 
        }, { status: 400 });
      }
    }

    // Handle encryption if needed
    let finalValue = updateData.value;
    if (updateData.isEncrypted !== undefined && updateData.isEncrypted) {
      // In production, you would use proper encryption here
      finalValue = `ENCRYPTED:${Buffer.from(JSON.stringify(updateData.value)).toString('base64')}`;
    } else if (existingSetting.isEncrypted && !updateData.isEncrypted) {
      // Decrypt the value if encryption is being disabled
      try {
        const encryptedValue = existingSetting.value as string;
        if (encryptedValue.startsWith('ENCRYPTED:')) {
          const decrypted = Buffer.from(encryptedValue.substring(10), 'base64').toString();
          finalValue = JSON.parse(decrypted);
        }
      } catch (error) {
        console.error('Error decrypting setting value:', error);
        return NextResponse.json({ error: 'Failed to decrypt existing setting value' }, { status: 500 });
      }
    }

    // Update the setting
    const updatedSetting = await db.prisma.systemSetting.update({
      where: { id: updateData.id },
      data: {
        value: finalValue,
        description: updateData.description,
        isPublic: updateData.isPublic,
        isEncrypted: updateData.isEncrypted,
        validation: updateData.validation,
        tags: updateData.tags,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      },
    });

    // Log the update
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      description: 'System setting updated by admin',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        settingId: updateData.id,
        settingKey: existingSetting.key,
        originalValue: existingSetting.value,
        newValue: finalValue,
        changes: updateData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSetting,
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    return NextResponse.json({ error: 'Failed to update system setting' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bulkData = BulkSettingOperationSchema.parse(body);

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Verify all settings exist
    const existingSettings = await db.prisma.systemSetting.findMany({
      where: { key: { in: bulkData.settingKeys } },
    });

    if (existingSettings.length !== bulkData.settingKeys.length) {
      return NextResponse.json({ error: 'Some settings not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: session.user.id,
    };

    switch (bulkData.operation) {
      case 'RESET_TO_DEFAULT':
        // This would require default values to be stored somewhere
        updateData.value = null; // Placeholder
        break;
      case 'ENABLE':
        updateData.isActive = true;
        break;
      case 'DISABLE':
        updateData.isActive = false;
        break;
      case 'UPDATE_CATEGORY':
        if (bulkData.category) {
          updateData.category = bulkData.category;
        }
        break;
      case 'ADD_TAGS':
        if (bulkData.tags && bulkData.tags.length > 0) {
          updateData.tags = {
            push: bulkData.tags,
          };
        }
        break;
      case 'REMOVE_TAGS':
        if (bulkData.removeTags && bulkData.removeTags.length > 0) {
          // For tag removal, we need to handle it differently
          updateData.tags = {
            set: existingSettings[0].tags?.filter((tag: string) => !bulkData.removeTags?.includes(tag)) || [],
          };
        }
        break;
    }

    // Perform bulk update
    const updatedSettings = await db.prisma.systemSetting.updateMany({
      where: { key: { in: bulkData.settingKeys } },
      data: updateData,
    });

    // Log the bulk operation
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      description: `Bulk system setting operation: ${bulkData.operation}`,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        operation: bulkData.operation,
        settingKeys: bulkData.settingKeys,
        updateData,
        affectedCount: updatedSettings.count,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully updated ${updatedSettings.count} system settings`,
        affectedCount: updatedSettings.count,
        operation: bulkData.operation,
      },
    });
  } catch (error) {
    console.error('Error performing bulk setting operation:', error);
    return NextResponse.json({ error: 'Failed to perform bulk operation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - SUPER_ADMIN required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const settingId = searchParams.get('id');

    if (!settingId) {
      return NextResponse.json({ error: 'Setting ID is required' }, { status: 400 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check if setting exists
    const existingSetting = await db.prisma.systemSetting.findUnique({
      where: { id: settingId },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: 'System setting not found' }, { status: 404 });
    }

    // Check if setting is critical (prevent deletion of critical settings)
    const criticalSettings = [
      'SYSTEM_ENCRYPTION_KEY',
      'DATABASE_CONNECTION_STRING',
      'AUTH_SECRET',
      'ADMIN_EMAIL',
    ];

    if (criticalSettings.includes(existingSetting.key)) {
      return NextResponse.json({ error: 'Cannot delete critical system setting' }, { status: 400 });
    }

    // Delete the setting
    await db.prisma.systemSetting.delete({
      where: { id: settingId },
    });

    // Log the deletion
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'HIGH',
      description: 'System setting deleted by SUPER_ADMIN',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        deletedSetting: existingSetting,
        reason: 'Admin deletion',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'System setting deleted successfully',
        deletedSettingId: settingId,
        deletedSettingKey: existingSetting.key,
      },
    });
  } catch (error) {
    console.error('Error deleting system setting:', error);
    return NextResponse.json({ error: 'Failed to delete system setting' }, { status: 500 });
  }
}

// Helper function to validate setting values
function validateSettingValue(value: any, validation: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Type validation
  if (validation.type === 'string' && typeof value !== 'string') {
    errors.push('Value must be a string');
  } else if (validation.type === 'number' && typeof value !== 'number') {
    errors.push('Value must be a number');
  } else if (validation.type === 'boolean' && typeof value !== 'boolean') {
    errors.push('Value must be a boolean');
  } else if (validation.type === 'json' && typeof value !== 'object') {
    errors.push('Value must be a valid JSON object');
  } else if (validation.type === 'url' && typeof value === 'string') {
    try {
      new URL(value);
    } catch {
      errors.push('Value must be a valid URL');
    }
  } else if (validation.type === 'email' && typeof value === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push('Value must be a valid email address');
    }
  }

  // Required validation
  if (validation.required && (value === null || value === undefined || value === '')) {
    errors.push('Value is required');
  }

  // Length validation for strings
  if (validation.type === 'string' && typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      errors.push(`Value must be at least ${validation.minLength} characters long`);
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      errors.push(`Value must be no more than ${validation.maxLength} characters long`);
    }
  }

  // Value range validation for numbers
  if (validation.type === 'number' && typeof value === 'number') {
    if (validation.minValue !== undefined && value < validation.minValue) {
      errors.push(`Value must be at least ${validation.minValue}`);
    }
    if (validation.maxValue !== undefined && value > validation.maxValue) {
      errors.push(`Value must be no more than ${validation.maxValue}`);
    }
  }

  // Pattern validation for strings
  if (validation.type === 'string' && validation.pattern && typeof value === 'string') {
    try {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push('Value does not match required pattern');
      }
    } catch {
      errors.push('Invalid pattern validation rule');
    }
  }

  // Allowed values validation
  if (validation.allowedValues && validation.allowedValues.length > 0) {
    if (!validation.allowedValues.includes(value)) {
      errors.push(`Value must be one of: ${validation.allowedValues.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}