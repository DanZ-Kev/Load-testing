import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Get active tests (running and queued)
    const activeTests = await db.prisma.loadTestJob.findMany({
      where: {
        OR: [
          { status: 'RUNNING' },
          { status: 'PENDING' }
        ]
      },
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
            description: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // RUNNING first, then PENDING
        { createdAt: 'desc' }
      ],
      take: 50, // Limit to prevent overwhelming response
    });

    // Transform data for frontend consumption
    const transformedTests = activeTests.map(test => {
      const startTime = test.startedAt || test.createdAt;
      const now = new Date();
      const duration = startTime ? Math.floor((now.getTime() - startTime.getTime()) / 1000) : 0;
      
      // Calculate progress for running tests (estimate based on duration)
      let progress = 0;
      if (test.status === 'RUNNING' && test.duration && duration > 0) {
        progress = Math.min(Math.floor((duration / test.duration) * 100), 99); // Cap at 99% until complete
      }

      return {
        id: test.id,
        name: test.script?.name || `Test ${test.id.slice(-6)}`,
        status: test.status.toLowerCase(),
        users: test.concurrency,
        duration: test.duration,
        startedAt: startTime,
        targetUrl: test.targetUrl,
        method: test.method,
        progress,
        node: test.node?.name || 'Unassigned',
        location: test.node?.location || 'Unknown',
        user: test.user.email,
        createdAt: test.createdAt,
      };
    });

    // Log the request
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'ACTIVE_TESTS_REQUEST',
      resource: 'load_test_jobs',
      details: { 
        count: transformedTests.length,
        timestamp: new Date().toISOString() 
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: {
        activeTests: transformedTests,
        count: transformedTests.length,
        lastUpdate: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching active tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active tests' },
      { status: 500 }
    );
  }
}