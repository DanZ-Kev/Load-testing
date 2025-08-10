import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';
import { z } from 'zod';

// Validation schemas
const SecurityEventFilterSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  eventType: z.enum(['LOGIN', 'LOGOUT', 'API_ACCESS', 'DATA_ACCESS', 'ADMIN_ACTION', 'SECURITY_VIOLATION', 'SYSTEM_EVENT']).optional(),
  userId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
});

const UpdateSecurityEventSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']).optional(),
  notes: z.string().max(1000).optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string()).optional(),
});

const BulkSecurityEventOperationSchema = z.object({
  eventIds: z.array(z.string().uuid()),
  operation: z.enum(['MARK_RESOLVED', 'MARK_FALSE_POSITIVE', 'ASSIGN_INVESTIGATOR', 'UPDATE_PRIORITY', 'ADD_TAGS', 'REMOVE_TAGS']),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']).optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string()).optional(),
  removeTags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterData = SecurityEventFilterSchema.parse({
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      severity: searchParams.get('severity') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      userId: searchParams.get('userId') || undefined,
      ipAddress: searchParams.get('ipAddress') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Build where clause
    const where: any = {};
    if (filterData.severity) where.severity = filterData.severity;
    if (filterData.eventType) where.eventType = filterData.eventType;
    if (filterData.userId) where.userId = filterData.userId;
    if (filterData.ipAddress) where.ipAddress = { contains: filterData.ipAddress };
    if (filterData.startDate || filterData.endDate) {
      where.timestamp = {};
      if (filterData.startDate) where.timestamp.gte = new Date(filterData.startDate);
      if (filterData.endDate) where.timestamp.lte = new Date(filterData.endDate);
    }
    if (filterData.search) {
      where.OR = [
        { description: { contains: filterData.search, mode: 'insensitive' } },
        { details: { contains: filterData.search, mode: 'insensitive' } },
        { ipAddress: { contains: filterData.search } },
        { userAgent: { contains: filterData.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const totalCount = await db.prisma.securityEvent.count({ where });

    // Get paginated results
    const events = await db.prisma.securityEvent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { timestamp: 'desc' },
      ],
      skip: (filterData.page - 1) * filterData.limit,
      take: filterData.limit,
    });

    // Get statistics
    const severityStats = await db.prisma.securityEvent.groupBy({
      by: ['severity'],
      where,
      _count: { severity: true },
    });

    const eventTypeStats = await db.prisma.securityEvent.groupBy({
      by: ['eventType'],
      where,
      _count: { eventType: true },
    });

    const recentTrends = await db.prisma.securityEvent.groupBy({
      by: ['timestamp'],
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      _count: { id: true },
      orderBy: { timestamp: 'asc' },
    });

    // Log security event access
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'LOW',
      description: 'Security events accessed by admin',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        filter: filterData,
        resultCount: events.length,
        totalCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page: filterData.page,
          limit: filterData.limit,
          total: totalCount,
          pages: Math.ceil(totalCount / filterData.limit),
        },
        statistics: {
          severity: severityStats,
          eventType: eventTypeStats,
          recentTrends,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching security events:', error);
    return NextResponse.json({ error: 'Failed to fetch security events' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = UpdateSecurityEventSchema.parse(body);

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check if event exists
    const existingEvent = await db.prisma.securityEvent.findUnique({
      where: { id: updateData.id },
      include: { user: true },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Security event not found' }, { status: 404 });
    }

    // Update the event
    const updatedEvent = await db.prisma.securityEvent.update({
      where: { id: updateData.id },
      data: {
        status: updateData.status,
        notes: updateData.notes,
        assignedTo: updateData.assignedTo,
        priority: updateData.priority,
        tags: updateData.tags,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log the update
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      description: 'Security event updated by admin',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        eventId: updateData.id,
        originalEvent: existingEvent,
        updates: updateData,
        updatedEvent,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    console.error('Error updating security event:', error);
    return NextResponse.json({ error: 'Failed to update security event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bulkData = BulkSecurityEventOperationSchema.parse(body);

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Verify all events exist
    const existingEvents = await db.prisma.securityEvent.findMany({
      where: { id: { in: bulkData.eventIds } },
    });

    if (existingEvents.length !== bulkData.eventIds.length) {
      return NextResponse.json({ error: 'Some security events not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: session.user.id,
    };

    switch (bulkData.operation) {
      case 'MARK_RESOLVED':
        updateData.status = 'RESOLVED';
        break;
      case 'MARK_FALSE_POSITIVE':
        updateData.status = 'FALSE_POSITIVE';
        break;
      case 'ASSIGN_INVESTIGATOR':
        if (bulkData.assignedTo) {
          updateData.assignedTo = bulkData.assignedTo;
        }
        break;
      case 'UPDATE_PRIORITY':
        if (bulkData.priority) {
          updateData.priority = bulkData.priority;
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
          // This is a simplified approach - in production you might want to use a more sophisticated method
          updateData.tags = {
            set: existingEvents[0].tags?.filter((tag: string) => !bulkData.removeTags?.includes(tag)) || [],
          };
        }
        break;
    }

    // Perform bulk update
    const updatedEvents = await db.prisma.securityEvent.updateMany({
      where: { id: { in: bulkData.eventIds } },
      data: updateData,
    });

    // Log the bulk operation
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'MEDIUM',
      description: `Bulk security event operation: ${bulkData.operation}`,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        operation: bulkData.operation,
        eventIds: bulkData.eventIds,
        updateData,
        affectedCount: updatedEvents.count,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully updated ${updatedEvents.count} security events`,
        affectedCount: updatedEvents.count,
        operation: bulkData.operation,
      },
    });
  } catch (error) {
    console.error('Error performing bulk security event operation:', error);
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
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const db = DatabaseManager.getInstance();
    const securityManager = EnterpriseSecurityManager.getInstance();

    // Check if event exists
    const existingEvent = await db.prisma.securityEvent.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Security event not found' }, { status: 404 });
    }

    // Delete the event
    await db.prisma.securityEvent.delete({
      where: { id: eventId },
    });

    // Log the deletion
    await securityManager.logSecurityEvent({
      eventType: 'ADMIN_ACTION',
      severity: 'HIGH',
      description: 'Security event deleted by SUPER_ADMIN',
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: {
        deletedEvent: existingEvent,
        reason: 'Admin deletion',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Security event deleted successfully',
        deletedEventId: eventId,
      },
    });
  } catch (error) {
    console.error('Error deleting security event:', error);
    return NextResponse.json({ error: 'Failed to delete security event' }, { status: 500 });
  }
}