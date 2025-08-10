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

    // Get current system metrics
    const currentMetrics = await db.prisma.realTimeMetrics.findFirst({
      orderBy: { timestamp: 'desc' },
      take: 1,
    });

    // Get active tests count
    const activeTestsCount = await db.prisma.loadTestJob.count({
      where: { status: 'RUNNING' },
    });

    // Get total users count
    const totalUsers = await db.prisma.user.count({
      where: { isActive: true },
    });

    // Get node status
    const nodeStatus = await db.prisma.testNode.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        status: true,
        currentLoad: true,
        maxConcurrent: true,
        lastHealthCheck: true,
      },
    });

    // Get recent system metrics for charts (last 24 data points)
    const recentMetrics = await db.prisma.realTimeMetrics.findMany({
      orderBy: { timestamp: 'desc' },
      take: 24,
      select: {
        timestamp: true,
        systemLoad: true,
        memoryUsage: true,
        networkTraffic: true,
      },
    });

    // Calculate global stats
    const globalStats = {
      activeTests: activeTestsCount,
      uniqueUsers: totalUsers,
      totalNodes: nodeStatus.length,
      activeNodes: nodeStatus.filter(n => n.status === 'ACTIVE').length,
      systemLoad: currentMetrics?.systemLoad || 0,
      memoryUsage: currentMetrics?.memoryUsage || 0,
      networkTraffic: currentMetrics?.networkTraffic || { in: 0, out: 0 },
    };

    // Log the status request
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'REALTIME_STATUS_REQUEST',
      resource: 'system_status',
      details: { timestamp: new Date().toISOString() },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: {
        globalStats,
        nodeStatus,
        recentMetrics,
        lastUpdate: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching real-time status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system status' },
      { status: 500 }
    );
  }
}