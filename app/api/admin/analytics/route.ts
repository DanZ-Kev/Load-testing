import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';
import { z } from 'zod';

// Validation schemas
const AnalyticsFilterSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  userId: z.string().uuid().optional(),
  nodeId: z.string().uuid().optional(),
  scriptId: z.string().uuid().optional(),
  status: z.enum(['SUCCESS', 'FAILED', 'CANCELLED', 'TIMEOUT']).optional(),
  exportFormat: z.enum(['json', 'csv', 'xlsx']).optional(),
});

const CustomReportSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  filters: z.record(z.any()),
  metrics: z.array(z.string()),
  groupBy: z.array(z.string()),
  schedule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL']).optional(),
  recipients: z.array(z.string().email()).optional(),
  isActive: z.boolean().default(true),
});

const UpdateReportSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  filters: z.record(z.any()).optional(),
  metrics: z.array(z.string()).optional(),
  groupBy: z.array(z.string()).optional(),
  schedule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL']).optional(),
  recipients: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterData = AnalyticsFilterSchema.parse({
      startDate: searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: searchParams.get('endDate') || new Date().toISOString(),
      groupBy: (searchParams.get('groupBy') as any) || 'day',
      userId: searchParams.get('userId') || undefined,
      nodeId: searchParams.get('nodeId') || undefined,
      scriptId: searchParams.get('scriptId') || undefined,
      status: searchParams.get('status') || undefined,
      exportFormat: (searchParams.get('exportFormat') as any) || undefined,
    });

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Build where clause
    const where: any = {
      createdAt: {
        gte: new Date(filterData.startDate),
        lte: new Date(filterData.endDate),
      },
    };

    if (filterData.userId) where.userId = filterData.userId;
    if (filterData.nodeId) where.nodeId = filterData.nodeId;
    if (filterData.scriptId) where.scriptId = filterData.scriptId;
    if (filterData.status) where.status = filterData.status;

    // Get comprehensive analytics data
    const [
      testJobs,
      userActivity,
      nodePerformance,
      scriptUsage,
      systemMetrics,
      securityEvents,
      dailyStats,
      hourlyStats
    ] = await Promise.all([
      // Load test jobs
      db.prisma.loadTestJob.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          node: { select: { id: true, name: true, location: true } },
          script: { select: { id: true, name: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // User activity
      db.prisma.user.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: new Date(filterData.startDate), lte: new Date(filterData.endDate) } },
        _count: { id: true },
        _sum: { lastLoginAt: true },
      }),

      // Node performance
      db.prisma.testNode.groupBy({
        by: ['id', 'name'],
        where: { isActive: true },
        _count: { loadTestJobs: true },
        _avg: { currentLoad: true },
        _max: { currentLoad: true },
      }),

      // Script usage
      db.prisma.loadTestScript.groupBy({
        by: ['id', 'name', 'category'],
        _count: { loadTestJobs: true },
        _avg: { estimatedDuration: true },
      }),

      // System metrics
      db.prisma.realTimeMetrics.findMany({
        where: {
          timestamp: {
            gte: new Date(filterData.startDate),
            lte: new Date(filterData.endDate),
          },
        },
        orderBy: { timestamp: 'asc' },
      }),

      // Security events
      db.prisma.securityEvent.groupBy({
        by: ['severity', 'eventType'],
        where: {
          timestamp: {
            gte: new Date(filterData.startDate),
            lte: new Date(filterData.endDate),
          },
        },
        _count: { id: true },
      }),

      // Daily statistics
      db.prisma.dailyAnalytics.findMany({
        where: {
          date: {
            gte: new Date(filterData.startDate),
            lte: new Date(filterData.endDate),
          },
        },
        orderBy: { date: 'asc' },
      }),

      // Hourly statistics (if grouping by hour)
      filterData.groupBy === 'hour' ? db.prisma.hourlyAnalytics.findMany({
        where: {
          timestamp: {
            gte: new Date(filterData.startDate),
            lte: new Date(filterData.endDate),
          },
        },
        orderBy: { timestamp: 'asc' },
      }) : Promise.resolve([]),
    ]);

    // Calculate aggregated metrics
    const totalTests = testJobs.length;
    const successfulTests = testJobs.filter(job => job.status === 'SUCCESS').length;
    const failedTests = testJobs.filter(job => job.status === 'FAILED').length;
    const successRate = totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;

    const totalDuration = testJobs.reduce((sum, job) => sum + (job.duration || 0), 0);
    const avgDuration = totalTests > 0 ? totalDuration / totalTests : 0;

    const totalConcurrency = testJobs.reduce((sum, job) => sum + (job.concurrency || 0), 0);
    const avgConcurrency = totalTests > 0 ? totalConcurrency / totalTests : 0;

    const peakConcurrency = Math.max(...testJobs.map(job => job.concurrency || 0), 0);

    // Calculate cost metrics (if applicable)
    const totalCost = testJobs.reduce((sum, job) => sum + (job.cost || 0), 0);
    const avgCostPerTest = totalTests > 0 ? totalCost / totalTests : 0;

    // Performance metrics
    const avgLatency = testJobs.reduce((sum, job) => sum + (job.avgLatency || 0), 0) / Math.max(successfulTests, 1);
    const avgThroughput = testJobs.reduce((sum, job) => sum + (job.avgThroughput || 0), 0) / Math.max(successfulTests, 1);

    // User engagement metrics
    const uniqueUsers = new Set(testJobs.map(job => job.userId)).size;
    const avgTestsPerUser = totalTests / Math.max(uniqueUsers, 1);

    // Node utilization
    const activeNodes = nodePerformance.filter(node => node._count.loadTestJobs > 0).length;
    const avgNodeLoad = nodePerformance.reduce((sum, node) => sum + (node._avg.currentLoad || 0), 0) / Math.max(activeNodes, 1);

    // Security metrics
    const criticalSecurityEvents = securityEvents.find(event => event.severity === 'CRITICAL')?._count.id || 0;
    const highSecurityEvents = securityEvents.find(event => event.severity === 'HIGH')?._count.id || 0;

    // Prepare chart data
    const chartData = {
      testVolume: dailyStats.map(day => ({
        date: day.date.toISOString().split('T')[0],
        totalTests: day.totalTests,
        successfulTests: day.successfulTests,
        failedTests: day.failedTests,
        successRate: day.successRate,
      })),

      performance: systemMetrics.map(metric => ({
        timestamp: metric.timestamp.toISOString(),
        cpu: metric.cpu,
        memory: metric.memory,
        network: metric.network,
        disk: metric.disk,
      })),

      concurrency: dailyStats.map(day => ({
        date: day.date.toISOString().split('T')[0],
        peakConcurrent: day.peakConcurrent,
        avgConcurrent: day.avgConcurrent,
      })),

      userActivity: userActivity.map(activity => ({
        date: activity.createdAt.toISOString().split('T')[0],
        newUsers: activity._count.id,
        activeUsers: activity._sum.lastLoginAt ? 1 : 0,
      })),
    };

    // Log analytics access
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'LOW',
      description: 'Analytics data accessed by admin',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        filter: filterData,
        resultCount: totalTests,
        exportFormat: filterData.exportFormat,
      },
    });

    const responseData = {
      summary: {
        period: `${filterData.startDate} to ${filterData.endDate}`,
        totalTests,
        successfulTests,
        failedTests,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration * 100) / 100,
        avgConcurrency: Math.round(avgConcurrency * 100) / 100,
        peakConcurrency,
        totalCost: Math.round(totalCost * 100) / 100,
        avgCostPerTest: Math.round(avgCostPerTest * 100) / 100,
        avgLatency: Math.round(avgLatency * 100) / 100,
        avgThroughput: Math.round(avgThroughput * 100) / 100,
        uniqueUsers,
        avgTestsPerUser: Math.round(avgTestsPerUser * 100) / 100,
        activeNodes,
        avgNodeLoad: Math.round(avgNodeLoad * 100) / 100,
        criticalSecurityEvents,
        highSecurityEvents,
      },
      details: {
        testJobs: testJobs.slice(0, 100), // Limit for performance
        nodePerformance,
        scriptUsage,
        securityEvents,
      },
      charts: chartData,
      metadata: {
        generatedAt: new Date().toISOString(),
        filter: filterData,
        dataPoints: {
          testJobs: testJobs.length,
          systemMetrics: systemMetrics.length,
          dailyStats: dailyStats.length,
          hourlyStats: hourlyStats.length,
        },
      },
    };

    // Handle export if requested
    if (filterData.exportFormat) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="analytics-${filterData.startDate}-${filterData.endDate}.${filterData.exportFormat}"`);
      
      return new Response(JSON.stringify(responseData, null, 2), {
        headers,
        status: 200,
      });
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const reportData = CustomReportSchema.parse(body);

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check for name conflicts
    const existingReport = await db.prisma.customReport.findFirst({
      where: { name: reportData.name },
    });

    if (existingReport) {
      return NextResponse.json({ error: 'Report name already exists' }, { status: 409 });
    }

    // Create the custom report
    const newReport = await db.prisma.customReport.create({
      data: {
        ...reportData,
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the creation
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      description: 'Custom analytics report created',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        reportId: newReport.id,
        reportName: reportData.name,
        reportData,
      },
    });

    return NextResponse.json({
      success: true,
      data: newReport,
    });
  } catch (error) {
    console.error('Error creating custom report:', error);
    return NextResponse.json({ error: 'Failed to create custom report' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = UpdateReportSchema.parse(body);

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check if report exists
    const existingReport = await db.prisma.customReport.findUnique({
      where: { id: updateData.id },
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'Custom report not found' }, { status: 404 });
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingReport.name) {
      const nameConflict = await db.prisma.customReport.findFirst({
        where: { name: updateData.name, id: { not: updateData.id } },
      });

      if (nameConflict) {
        return NextResponse.json({ error: 'Report name already exists' }, { status: 409 });
      }
    }

    // Update the report
    const updatedReport = await db.prisma.customReport.update({
      where: { id: updateData.id },
      data: {
        ...updateData,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      },
    });

    // Log the update
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      description: 'Custom analytics report updated',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        reportId: updateData.id,
        originalReport: existingReport,
        updates: updateData,
        updatedReport,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedReport,
    });
  } catch (error) {
    console.error('Error updating custom report:', error);
    return NextResponse.json({ error: 'Failed to update custom report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - SUPER_ADMIN required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check if report exists
    const existingReport = await db.prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'Custom report not found' }, { status: 404 });
    }

    // Delete the report
    await db.prisma.customReport.delete({
      where: { id: reportId },
    });

    // Log the deletion
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'HIGH',
      description: 'Custom analytics report deleted by SUPER_ADMIN',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        deletedReport: existingReport,
        reason: 'Admin deletion',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Custom report deleted successfully',
        deletedReportId: reportId,
      },
    });
  } catch (error) {
    console.error('Error deleting custom report:', error);
    return NextResponse.json({ error: 'Failed to delete custom report' }, { status: 500 });
  }
}