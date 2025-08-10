import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';
import { SecureScriptRunner } from '@/lib/scriptEngine';
import { z } from 'zod';

// Validation schemas
const CreateScriptSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.enum(['REST_API', 'WEBSOCKET', 'GRAPHQL', 'CUSTOM', 'TEMPLATE']),
  content: z.string().min(1).max(10000), // Max 10KB script
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  parameters: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    required: z.boolean(),
    default: z.any().optional(),
    description: z.string().optional(),
  })).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'),
  minConcurrency: z.number().min(1).optional(),
  maxConcurrency: z.number().min(1).optional(),
  estimatedDuration: z.number().min(1).optional(),
});

const UpdateScriptSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  category: z.enum(['REST_API', 'WEBSOCKET', 'GRAPHQL', 'CUSTOM', 'TEMPLATE']).optional(),
  content: z.string().min(1).max(10000).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  parameters: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    required: z.boolean(),
    default: z.any().optional(),
    description: z.string().optional(),
  })).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  minConcurrency: z.number().min(1).optional(),
  maxConcurrency: z.number().min(1).optional(),
  estimatedDuration: z.number().min(1).optional(),
});

const ValidateScriptSchema = z.object({
  content: z.string().min(1).max(10000),
  parameters: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();
    const scriptRunner = SecureScriptRunner.getInstance();

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateScriptSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const scriptData = validation.data;

    // Check if script with same name already exists
    const existingScript = await db.prisma.loadTestScript.findFirst({
      where: { name: scriptData.name }
    });

    if (existingScript) {
      return NextResponse.json({
        error: 'Script with this name already exists',
        existingScriptId: existingScript.id
      }, { status: 409 });
    }

    // Validate script content for security
    const validationResult = await scriptRunner.validateScript(scriptData.content);
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Script validation failed',
        details: validationResult.errors
      }, { status: 400 });
    }

    // Create the script
    const script = await db.prisma.loadTestScript.create({
      data: {
        name: scriptData.name,
        description: scriptData.description,
        category: scriptData.category,
        content: scriptData.content,
        isPublic: scriptData.isPublic,
        tags: scriptData.tags || [],
        parameters: scriptData.parameters || {},
        version: scriptData.version,
        minConcurrency: scriptData.minConcurrency || 1,
        maxConcurrency: scriptData.maxConcurrency || 1000,
        estimatedDuration: scriptData.estimatedDuration || 60,
        createdBy: session.user.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'LOAD_TEST_SCRIPT_CREATED',
      resource: 'load_test_script',
      details: {
        scriptId: script.id,
        scriptName: scriptData.name,
        category: scriptData.category,
        contentLength: scriptData.content.length,
        isPublic: scriptData.isPublic
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: script,
      message: 'Load test script created successfully'
    });

  } catch (error) {
    console.error('Error creating load test script:', error);
    return NextResponse.json(
      { error: 'Failed to create load test script' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = DatabaseManager.getInstance();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const createdBy = searchParams.get('createdBy');

    // Build where clause
    const where: any = {};
    
    if (category) {
      where.category = category.toUpperCase();
    }
    
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true';
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    if (createdBy) {
      where.createdBy = createdBy;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    // Get scripts with pagination
    const [scripts, total] = await Promise.all([
      db.prisma.loadTestScript.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          },
          _count: {
            select: {
              loadTestJobs: true,
              scriptVersions: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.prisma.loadTestScript.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get script statistics
    const scriptStats = await db.prisma.loadTestScript.aggregate({
      _count: { id: true },
      _count: { 
        isActive: true,
        isPublic: true,
        category: true
      },
    });

    const categoryStats = await db.prisma.loadTestScript.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        scripts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        statistics: {
          totalScripts: scriptStats._count.id,
          activeScripts: scriptStats._count.isActive,
          publicScripts: scriptStats._count.isPublic,
          categoryDistribution: categoryStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching load test scripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch load test scripts' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();
    const scriptRunner = SecureScriptRunner.getInstance();

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateScriptSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Get the existing script
    const existingScript = await db.prisma.loadTestScript.findUnique({
      where: { id: updateData.id }
    });

    if (!existingScript) {
      return NextResponse.json({ error: 'Load test script not found' }, { status: 404 });
    }

    // Check if admin is trying to modify a script they didn't create (unless SUPER_ADMIN)
    if (existingScript.createdBy !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'You can only modify scripts you created'
      }, { status: 403 });
    }

    // Check if script name is being changed and if it conflicts with another script
    if (updateData.name && updateData.name !== existingScript.name) {
      const conflictingScript = await db.prisma.loadTestScript.findFirst({
        where: { 
          name: updateData.name,
          id: { not: updateData.id }
        }
      });

      if (conflictingScript) {
        return NextResponse.json({
          error: 'Script name already in use',
          conflictingScriptId: conflictingScript.id
        }, { status: 409 });
      }
    }

    // Validate script content if it's being updated
    if (updateData.content) {
      const validationResult = await scriptRunner.validateScript(updateData.content);
      if (!validationResult.isValid) {
        return NextResponse.json({
          error: 'Script validation failed',
          details: validationResult.errors
        }, { status: 400 });
      }
    }

    // Create a new version if content or parameters changed
    let newVersion = null;
    if (updateData.content || updateData.parameters) {
      newVersion = await db.prisma.scriptVersion.create({
        data: {
          scriptId: updateData.id,
          version: existingScript.version,
          content: existingScript.content,
          parameters: existingScript.parameters,
          changes: {
            contentChanged: !!updateData.content,
            parametersChanged: !!updateData.parameters,
            updatedBy: session.user.id,
            updatedAt: new Date(),
          },
          createdAt: new Date(),
        }
      });
    }

    // Update the script
    const updatedScript = await db.prisma.loadTestScript.update({
      where: { id: updateData.id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.category && { category: updateData.category }),
        ...(updateData.content && { content: updateData.content }),
        ...(updateData.isPublic !== undefined && { isPublic: updateData.isPublic }),
        ...(updateData.tags && { tags: updateData.tags }),
        ...(updateData.parameters && { parameters: updateData.parameters }),
        ...(updateData.version && { version: updateData.version }),
        ...(updateData.minConcurrency && { minConcurrency: updateData.minConcurrency }),
        ...(updateData.maxConcurrency && { maxConcurrency: updateData.maxConcurrency }),
        ...(updateData.estimatedDuration && { estimatedDuration: updateData.estimatedDuration }),
        updatedAt: new Date(),
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'LOAD_TEST_SCRIPT_UPDATED',
      resource: 'load_test_script',
      details: {
        scriptId: updateData.id,
        updates: updateData,
        newVersionId: newVersion?.id,
        previousVersion: existingScript.version
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: {
        script: updatedScript,
        newVersion: newVersion
      },
      message: 'Load test script updated successfully'
    });

  } catch (error) {
    console.error('Error updating load test script:', error);
    return NextResponse.json(
      { error: 'Failed to update load test script' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get('id');

    if (!scriptId) {
      return NextResponse.json({ error: 'Script ID required' }, { status: 400 });
    }

    // Get the script
    const script = await db.prisma.loadTestScript.findUnique({
      where: { id: scriptId },
      include: {
        _count: {
          select: {
            loadTestJobs: {
              where: {
                status: { in: ['PENDING', 'RUNNING'] }
              }
            }
          }
        }
      }
    });

    if (!script) {
      return NextResponse.json({ error: 'Load test script not found' }, { status: 404 });
    }

    // Check if admin is trying to delete a script they didn't create (unless SUPER_ADMIN)
    if (script.createdBy !== session.user.id && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'You can only delete scripts you created'
      }, { status: 403 });
    }

    // Check if script has active tests
    if (script._count.loadTestJobs > 0) {
      return NextResponse.json({
        error: 'Cannot delete script with active tests',
        activeTestsCount: script._count.loadTestJobs
      }, { status: 400 });
    }

    // Delete the script (this will cascade to related records)
    await db.prisma.loadTestScript.delete({
      where: { id: scriptId }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'LOAD_TEST_SCRIPT_DELETED',
      resource: 'load_test_script',
      details: {
        scriptId,
        scriptName: script.name,
        category: script.category,
        createdBy: script.createdBy
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Load test script deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting load test script:', error);
    return NextResponse.json(
      { error: 'Failed to delete load test script' },
      { status: 500 }
    );
  }
}

// Script validation endpoint
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const scriptRunner = SecureScriptRunner.getInstance();

    // Parse and validate request body
    const body = await request.json();
    const validation = ValidateScriptSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { content, parameters } = validation.data;

    // Validate the script
    const validationResult = await scriptRunner.validateScript(content, parameters);

    return NextResponse.json({
      success: true,
      data: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        estimatedComplexity: validationResult.complexity,
        securityScore: validationResult.securityScore,
      }
    });

  } catch (error) {
    console.error('Error validating script:', error);
    return NextResponse.json(
      { error: 'Failed to validate script' },
      { status: 500 }
    );
  }
}