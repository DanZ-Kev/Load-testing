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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily analytics for the specified period
    const dailyStats = await db.prisma.dailyAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get system metrics for the period (for charts)
    const systemMetrics = await db.prisma.realTimeMetrics.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        activeTests: true,
        totalUsers: true,
        systemLoad: true,
        memoryUsage: true,
        networkTraffic: true,
      },
    });

    // Get test volume by day
    const testVolumeByDay = await db.prisma.loadTestJob.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get user activity by day
    const userActivityByDay = await db.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isActive: true,
      },
      _count: {
        id: true,
      },
    });

    // Calculate summary statistics
    const totalTests = dailyStats.reduce((sum, day) => sum + day.totalTests, 0);
    const avgSuccessRate = dailyStats.length > 0 
      ? dailyStats.reduce((sum, day) => sum + day.successRate, 0) / dailyStats.length 
      : 0;
    const avgDuration = dailyStats.length > 0
      ? dailyStats.reduce((sum, day) => sum + day.avgDuration, 0) / dailyStats.length
      : 0;
    const peakConcurrent = Math.max(...dailyStats.map(day => day.peakConcurrent), 0);

    // Prepare chart data
    const chartData = dailyStats.map(day => ({
      date: day.date.toISOString().split('T')[0],
      tests: day.totalTests,
      users: day.uniqueUsers,
      successRate: day.successRate,
      avgDuration: day.avgDuration,
      peakConcurrent: day.peakConcurrent,
      dataTransferred: Number(day.dataTransferred),
    }));

    // Prepare system metrics chart data
    const metricsChartData = systemMetrics.map(metric => ({
      timestamp: metric.timestamp.toISOString(),
      activeTests: metric.activeTests,
      totalUsers: metric.totalUsers,
      systemLoad: metric.systemLoad,
      memoryUsage: metric.memoryUsage,
      networkIn: (metric.networkTraffic as any)?.in || 0,
      networkOut: (metric.networkTraffic as any)?.out || 0,
    }));

    // Log the request
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'DAILY_STATS_REQUEST',
      resource: 'analytics',
      details: { 
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timestamp: new Date().toISOString() 
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTests,
          avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
          avgDuration: Math.round(avgDuration * 100) / 100,
          peakConcurrent,
          period: `${days} days`,
        },
        dailyStats: chartData,
        systemMetrics: metricsChartData,
        testVolumeByDay,
        userActivityByDay,
        lastUpdate: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily statistics' },
      { status: 500 }
    );
  }
}