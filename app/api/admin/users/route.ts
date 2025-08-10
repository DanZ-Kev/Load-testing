import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';
import { z } from 'zod';

// Validation schemas
const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).default('USER'),
  subscriptionTier: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).default('FREE'),
  isActive: z.boolean().default(true),
  maxConcurrentTests: z.number().min(1).max(1000).optional(),
  apiKeyLimit: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  subscriptionTier: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
  maxConcurrentTests: z.number().min(1).max(1000).optional(),
  apiKeyLimit: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
});

const BulkUserOperationSchema = z.object({
  userIds: z.array(z.string().uuid()),
  operation: z.enum(['ACTIVATE', 'DEACTIVATE', 'DELETE', 'CHANGE_ROLE', 'CHANGE_SUBSCRIPTION']),
  newRole: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  newSubscriptionTier: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
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

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const userData = validation.data;

    // Check if user with same email already exists
    const existingUser = await db.prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      return NextResponse.json({
        error: 'User with this email already exists',
        existingUserId: existingUser.id
      }, { status: 409 });
    }

    // Check if admin is trying to create a SUPER_ADMIN (only SUPER_ADMIN can do this)
    if (userData.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only SUPER_ADMIN can create SUPER_ADMIN users'
      }, { status: 403 });
    }

    // Create the user
    const user = await db.prisma.user.create({
      data: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: userData.isActive,
        maxConcurrentTests: userData.maxConcurrentTests || 10,
        apiKeyLimit: userData.apiKeyLimit || 5,
        tags: userData.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: {
          create: {
            tier: userData.subscriptionTier,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            maxTestsPerMonth: userData.subscriptionTier === 'FREE' ? 10 :
                             userData.subscriptionTier === 'BASIC' ? 100 :
                             userData.subscriptionTier === 'PRO' ? 1000 : Infinity,
            features: userData.subscriptionTier === 'FREE' ? ['BASIC_LOAD_TESTING'] :
                     userData.subscriptionTier === 'BASIC' ? ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS'] :
                     userData.subscriptionTier === 'PRO' ? ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS', 'CUSTOM_SCRIPTS'] :
                     ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS', 'CUSTOM_SCRIPTS', 'PRIORITY_SUPPORT', 'WHITE_LABEL'],
          }
        }
      },
      include: {
        subscription: true
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'USER_CREATED',
      resource: 'user',
      details: {
        newUserId: user.id,
        newUserEmail: userData.email,
        newUserRole: userData.role,
        subscriptionTier: userData.subscriptionTier
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
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
    const role = searchParams.get('role');
    const subscriptionTier = searchParams.get('subscriptionTier');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};
    
    if (role) {
      where.role = role.toUpperCase();
    }
    
    if (subscriptionTier) {
      where.subscription = {
        tier: subscriptionTier.toUpperCase()
      };
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      db.prisma.user.findMany({
        where,
        include: {
          subscription: {
            select: {
              tier: true,
              status: true,
              startDate: true,
              endDate: true,
              maxTestsPerMonth: true,
            }
          },
          _count: {
            select: {
              loadTestJobs: true,
              apiKeys: true,
              securityEvents: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.prisma.user.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get user statistics
    const userStats = await db.prisma.user.aggregate({
      _count: { id: true },
      _count: { 
        id: true,
        isActive: true,
        role: true
      },
    });

    const subscriptionStats = await db.prisma.subscription.groupBy({
      by: ['tier'],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        statistics: {
          totalUsers: userStats._count.id,
          activeUsers: userStats._count.isActive,
          adminUsers: userStats._count.role,
          subscriptionDistribution: subscriptionStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Get the existing user
    const existingUser = await db.prisma.user.findUnique({
      where: { id: updateData.id },
      include: { subscription: true }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if admin is trying to change role to SUPER_ADMIN (only SUPER_ADMIN can do this)
    if (updateData.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only SUPER_ADMIN can promote users to SUPER_ADMIN'
      }, { status: 403 });
    }

    // Check if admin is trying to modify a SUPER_ADMIN (only SUPER_ADMIN can do this)
    if (existingUser.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only SUPER_ADMIN can modify SUPER_ADMIN users'
      }, { status: 403 });
    }

    // Update the user
    const updatedUser = await db.prisma.user.update({
      where: { id: updateData.id },
      data: {
        ...(updateData.firstName && { firstName: updateData.firstName }),
        ...(updateData.lastName && { lastName: updateData.lastName }),
        ...(updateData.role && { role: updateData.role }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
        ...(updateData.maxConcurrentTests && { maxConcurrentTests: updateData.maxConcurrentTests }),
        ...(updateData.apiKeyLimit && { apiKeyLimit: updateData.apiKeyLimit }),
        ...(updateData.tags && { tags: updateData.tags }),
        updatedAt: new Date(),
      }
    });

    // Update subscription if tier changed
    if (updateData.subscriptionTier && existingUser.subscription?.tier !== updateData.subscriptionTier) {
      await db.prisma.subscription.update({
        where: { userId: updateData.id },
        data: {
          tier: updateData.subscriptionTier,
          maxTestsPerMonth: updateData.subscriptionTier === 'FREE' ? 10 :
                           updateData.subscriptionTier === 'BASIC' ? 100 :
                           updateData.subscriptionTier === 'PRO' ? 1000 : Infinity,
          features: updateData.subscriptionTier === 'FREE' ? ['BASIC_LOAD_TESTING'] :
                   updateData.subscriptionTier === 'BASIC' ? ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS'] :
                   updateData.subscriptionTier === 'PRO' ? ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS', 'CUSTOM_SCRIPTS'] :
                   ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS', 'CUSTOM_SCRIPTS', 'PRIORITY_SUPPORT', 'WHITE_LABEL'],
          updatedAt: new Date(),
        }
      });
    }

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'USER_UPDATED',
      resource: 'user',
      details: {
        targetUserId: updateData.id,
        updates: updateData,
        previousRole: existingUser.role,
        previousSubscriptionTier: existingUser.subscription?.tier
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
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
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get the user
    const user = await db.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if admin is trying to delete a SUPER_ADMIN (only SUPER_ADMIN can do this)
    if (user.role === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only SUPER_ADMIN can delete SUPER_ADMIN users'
      }, { status: 403 });
    }

    // Check if user has active tests
    if (user._count.loadTestJobs > 0) {
      return NextResponse.json({
        error: 'Cannot delete user with active tests',
        activeTestsCount: user._count.loadTestJobs
      }, { status: 400 });
    }

    // Delete the user (this will cascade to related records)
    await db.prisma.user.delete({
      where: { id: userId }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'USER_DELETED',
      resource: 'user',
      details: {
        deletedUserId: userId,
        deletedUserEmail: user.email,
        deletedUserRole: user.role
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

// Bulk operations endpoint
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Parse and validate request body
    const body = await request.json();
    const validation = BulkUserOperationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { userIds, operation, newRole, newSubscriptionTier } = validation.data;

    // Check if admin is trying to change roles to SUPER_ADMIN (only SUPER_ADMIN can do this)
    if (newRole === 'SUPER_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only SUPER_ADMIN can promote users to SUPER_ADMIN'
      }, { status: 403 });
    }

    // Get users to verify permissions
    const users = await db.prisma.user.findMany({
      where: { id: { in: userIds } }
    });

    // Check if admin is trying to modify SUPER_ADMIN users (only SUPER_ADMIN can do this)
    if (users.some(user => user.role === 'SUPER_ADMIN') && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Only SUPER_ADMIN can modify SUPER_ADMIN users'
      }, { status: 403 });
    }

    let updatedCount = 0;
    const results = [];

    // Perform bulk operation
    for (const userId of userIds) {
      try {
        switch (operation) {
          case 'ACTIVATE':
            await db.prisma.user.update({
              where: { id: userId },
              data: { isActive: true, updatedAt: new Date() }
            });
            break;

          case 'DEACTIVATE':
            await db.prisma.user.update({
              where: { id: userId },
              data: { isActive: false, updatedAt: new Date() }
            });
            break;

          case 'CHANGE_ROLE':
            if (newRole) {
              await db.prisma.user.update({
                where: { id: userId },
                data: { role: newRole, updatedAt: new Date() }
              });
            }
            break;

          case 'CHANGE_SUBSCRIPTION':
            if (newSubscriptionTier) {
              await db.prisma.subscription.update({
                where: { userId },
                data: {
                  tier: newSubscriptionTier,
                  maxTestsPerMonth: newSubscriptionTier === 'FREE' ? 10 :
                                   newSubscriptionTier === 'BASIC' ? 100 :
                                   newSubscriptionTier === 'PRO' ? 1000 : Infinity,
                  features: newSubscriptionTier === 'FREE' ? ['BASIC_LOAD_TESTING'] :
                           newSubscriptionTier === 'BASIC' ? ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS'] :
                           newSubscriptionTier === 'PRO' ? ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS', 'CUSTOM_SCRIPTS'] :
                           ['BASIC_LOAD_TESTING', 'ADVANCED_METRICS', 'CUSTOM_SCRIPTS', 'PRIORITY_SUPPORT', 'WHITE_LABEL'],
                  updatedAt: new Date(),
                }
              });
            }
            break;

          case 'DELETE':
            // Check if user has active tests
            const activeTests = await db.prisma.loadTestJob.count({
              where: {
                userId,
                status: { in: ['PENDING', 'RUNNING'] }
              }
            });

            if (activeTests > 0) {
              results.push({ userId, success: false, error: 'User has active tests' });
              continue;
            }

            await db.prisma.user.delete({ where: { id: userId } });
            break;
        }

        updatedCount++;
        results.push({ userId, success: true });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: `BULK_USER_${operation}`,
      resource: 'user',
      details: {
        operation,
        targetUserIds: userIds,
        updatedCount,
        results,
        newRole,
        newSubscriptionTier
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: {
        operation,
        totalUsers: userIds.length,
        updatedCount,
        results
      },
      message: `Bulk operation completed: ${updatedCount}/${userIds.length} users processed`
    });

  } catch (error) {
    console.error('Error performing bulk user operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}