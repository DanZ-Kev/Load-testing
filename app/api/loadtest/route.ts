import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';
import { SecureScriptRunner } from '@/lib/scriptEngine';
import { z } from 'zod';

// Validation schemas
const CreateTestSchema = z.object({
  name: z.string().min(1).max(100),
  targetUrl: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  concurrency: z.number().min(1).max(10000),
  duration: z.number().min(1).max(3600), // seconds
  rampUp: z.number().min(0).max(300), // seconds
  customHeaders: z.record(z.string()).optional(),
  requestBody: z.string().optional(),
  script: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

const UpdateTestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PAUSED', 'RESUMED', 'CANCELLED']).optional(),
  concurrency: z.number().min(1).max(10000).optional(),
  duration: z.number().min(1).max(3600).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateTestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const testData = validation.data;

    // Check user's subscription limits
    const user = await db.prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's test count for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyTestCount = await db.prisma.loadTestJob.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: currentMonth }
      }
    });

    // Check subscription limits
    const subscriptionLimits = {
      FREE: 10,
      BASIC: 100,
      PRO: 1000,
      ENTERPRISE: Infinity
    };

    const userLimit = subscriptionLimits[user.subscription?.tier || 'FREE'];
    if (monthlyTestCount >= userLimit) {
      return NextResponse.json({
        error: 'Monthly test limit exceeded',
        current: monthlyTestCount,
        limit: userLimit,
        tier: user.subscription?.tier || 'FREE'
      }, { status: 429 });
    }

    // Find available test node
    const availableNode = await db.prisma.testNode.findFirst({
      where: {
        status: 'ACTIVE',
        currentLoad: { lt: db.prisma.testNode.fields.maxConcurrent }
      },
      orderBy: { currentLoad: 'asc' }
    });

    if (!availableNode) {
      return NextResponse.json({
        error: 'No available test nodes',
        message: 'All test nodes are currently at capacity'
      }, { status: 503 });
    }

    // Create the load test job
    const loadTestJob = await db.prisma.loadTestJob.create({
      data: {
        name: testData.name,
        targetUrl: testData.targetUrl,
        method: testData.method,
        concurrency: testData.concurrency,
        duration: testData.duration,
        rampUp: testData.rampUp,
        customHeaders: testData.customHeaders || {},
        requestBody: testData.requestBody || null,
        script: testData.script || null,
        priority: testData.priority,
        status: 'PENDING',
        userId: session.user.id,
        nodeId: availableNode.id,
        estimatedStartTime: new Date(Date.now() + 5000), // 5 seconds from now
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'LOAD_TEST_CREATED',
      resource: 'load_test_job',
      details: {
        testId: loadTestJob.id,
        targetUrl: testData.targetUrl,
        concurrency: testData.concurrency,
        duration: testData.duration,
        priority: testData.priority
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Update node load
    await db.prisma.testNode.update({
      where: { id: availableNode.id },
      data: { currentLoad: availableNode.currentLoad + testData.concurrency }
    });

    // Queue the test for execution
    const scriptRunner = SecureScriptRunner.getInstance();
    scriptRunner.queueTest(loadTestJob.id, testData);

    return NextResponse.json({
      success: true,
      data: {
        testId: loadTestJob.id,
        status: 'PENDING',
        estimatedStartTime: loadTestJob.estimatedStartTime,
        assignedNode: availableNode.name,
        queuePosition: 1, // Will be calculated based on actual queue
      },
      message: 'Load test queued successfully'
    });

  } catch (error) {
    console.error('Error creating load test:', error);
    return NextResponse.json(
      { error: 'Failed to create load test' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateTestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Get the test job
    const testJob = await db.prisma.loadTestJob.findUnique({
      where: { id: updateData.id },
      include: { node: true }
    });

    if (!testJob) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check if user owns the test or is admin
    if (testJob.userId !== session.user.id && 
        session.user.role !== 'ADMIN' && 
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the test
    const updatedJob = await db.prisma.loadTestJob.update({
      where: { id: updateData.id },
      data: {
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.concurrency && { concurrency: updateData.concurrency }),
        ...(updateData.duration && { duration: updateData.duration }),
        updatedAt: new Date(),
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'LOAD_TEST_UPDATED',
      resource: 'load_test_job',
      details: {
        testId: updateData.id,
        updates: updateData,
        previousStatus: testJob.status
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // If status changed, handle accordingly
    if (updateData.status) {
      const scriptRunner = SecureScriptRunner.getInstance();
      
      switch (updateData.status) {
        case 'PAUSED':
          scriptRunner.pauseTest(updateData.id);
          break;
        case 'RESUMED':
          scriptRunner.resumeTest(updateData.id);
          break;
        case 'CANCELLED':
          scriptRunner.cancelTest(updateData.id);
          // Update node load
          if (testJob.nodeId) {
            await db.prisma.testNode.update({
              where: { id: testJob.nodeId },
              data: { currentLoad: { decrement: testJob.concurrency } }
            });
          }
          break;
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: 'Load test updated successfully'
    });

  } catch (error) {
    console.error('Error updating load test:', error);
    return NextResponse.json(
      { error: 'Failed to update load test' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = DatabaseManager.getInstance();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    if (userId && (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN')) {
      where.userId = userId;
    } else {
      where.userId = session.user.id;
    }

    // Get tests with pagination
    const [tests, total] = await Promise.all([
      db.prisma.loadTestJob.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          },
          node: {
            select: {
              id: true,
              name: true,
              location: true,
            }
          },
          script: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.prisma.loadTestJob.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        tests,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching load tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch load tests' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('id');

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
    }

    // Get the test job
    const testJob = await db.prisma.loadTestJob.findUnique({
      where: { id: testId },
      include: { node: true }
    });

    if (!testJob) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check if user owns the test or is admin
    if (testJob.userId !== session.user.id && 
        session.user.role !== 'ADMIN' && 
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Cancel the test if it's running
    if (testJob.status === 'RUNNING' || testJob.status === 'PENDING') {
      const scriptRunner = SecureScriptRunner.getInstance();
      scriptRunner.cancelTest(testId);
    }

    // Update node load if test was assigned to a node
    if (testJob.nodeId && testJob.status !== 'COMPLETED' && testJob.status !== 'FAILED') {
      await db.prisma.testNode.update({
        where: { id: testJob.nodeId },
        data: { currentLoad: { decrement: testJob.concurrency } }
      });
    }

    // Delete the test
    await db.prisma.loadTestJob.delete({
      where: { id: testId }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'LOAD_TEST_DELETED',
      resource: 'load_test_job',
      details: {
        testId,
        testName: testJob.name,
        status: testJob.status,
        targetUrl: testJob.targetUrl
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Load test deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting load test:', error);
    return NextResponse.json(
      { error: 'Failed to delete load test' },
      { status: 500 }
    );
  }
}