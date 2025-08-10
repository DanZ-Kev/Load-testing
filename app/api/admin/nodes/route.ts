import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DatabaseManager } from '@/lib/db';
import { EnterpriseSecurityManager } from '@/lib/security';
import { z } from 'zod';

// Validation schemas
const CreateNodeSchema = z.object({
  name: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  ipAddress: z.string().ip(),
  maxConcurrent: z.number().min(1).max(10000),
  region: z.string().min(1).max(50),
  isActive: z.boolean().default(true),
  autoScaling: z.boolean().default(false),
  minInstances: z.number().min(1).optional(),
  maxInstances: z.number().min(1).optional(),
  healthCheckUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(100).optional(),
  ipAddress: z.string().ip().optional(),
  maxConcurrent: z.number().min(1).max(10000).optional(),
  region: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  autoScaling: z.boolean().optional(),
  minInstances: z.number().min(1).optional(),
  maxInstances: z.number().min(1).optional(),
  healthCheckUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
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
    const validation = CreateNodeSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const nodeData = validation.data;

    // Check if node with same IP already exists
    const existingNode = await db.prisma.testNode.findFirst({
      where: { ipAddress: nodeData.ipAddress }
    });

    if (existingNode) {
      return NextResponse.json({
        error: 'Node with this IP address already exists',
        existingNodeId: existingNode.id
      }, { status: 409 });
    }

    // Create the test node
    const testNode = await db.prisma.testNode.create({
      data: {
        name: nodeData.name,
        location: nodeData.location,
        ipAddress: nodeData.ipAddress,
        maxConcurrent: nodeData.maxConcurrent,
        region: nodeData.region,
        status: nodeData.isActive ? 'ACTIVE' : 'INACTIVE',
        currentLoad: 0,
        autoScaling: nodeData.autoScaling,
        minInstances: nodeData.minInstances || 1,
        maxInstances: nodeData.maxInstances || 1,
        healthCheckUrl: nodeData.healthCheckUrl || null,
        tags: nodeData.tags || [],
        lastHealthCheck: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'TEST_NODE_CREATED',
      resource: 'test_node',
      details: {
        nodeId: testNode.id,
        nodeName: nodeData.name,
        ipAddress: nodeData.ipAddress,
        maxConcurrent: nodeData.maxConcurrent,
        region: nodeData.region
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: testNode,
      message: 'Test node created successfully'
    });

  } catch (error) {
    console.error('Error creating test node:', error);
    return NextResponse.json(
      { error: 'Failed to create test node' },
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
    const status = searchParams.get('status');
    const region = searchParams.get('region');
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status.toUpperCase();
    }
    
    if (region) {
      where.region = region;
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get nodes with pagination
    const [nodes, total] = await Promise.all([
      db.prisma.testNode.findMany({
        where,
        include: {
          _count: {
            select: {
              loadTestJobs: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.prisma.testNode.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get node statistics
    const nodeStats = await db.prisma.testNode.aggregate({
      _count: { id: true },
      _sum: { currentLoad: true, maxConcurrent: true },
      _avg: { currentLoad: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        nodes,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        statistics: {
          totalNodes: nodeStats._count.id,
          totalCapacity: nodeStats._sum.maxConcurrent,
          currentLoad: nodeStats._sum.currentLoad,
          averageLoad: nodeStats._avg.currentLoad,
          utilizationRate: nodeStats._sum.maxConcurrent ? 
            (nodeStats._sum.currentLoad / nodeStats._sum.maxConcurrent * 100).toFixed(2) : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching test nodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test nodes' },
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
    const validation = UpdateNodeSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Get the existing node
    const existingNode = await db.prisma.testNode.findUnique({
      where: { id: updateData.id }
    });

    if (!existingNode) {
      return NextResponse.json({ error: 'Test node not found' }, { status: 404 });
    }

    // Check if IP address is being changed and if it conflicts with another node
    if (updateData.ipAddress && updateData.ipAddress !== existingNode.ipAddress) {
      const conflictingNode = await db.prisma.testNode.findFirst({
        where: { 
          ipAddress: updateData.ipAddress,
          id: { not: updateData.id }
        }
      });

      if (conflictingNode) {
        return NextResponse.json({
          error: 'IP address already in use by another node',
          conflictingNodeId: conflictingNode.id
        }, { status: 409 });
      }
    }

    // Update the node
    const updatedNode = await db.prisma.testNode.update({
      where: { id: updateData.id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.location && { location: updateData.location }),
        ...(updateData.ipAddress && { ipAddress: updateData.ipAddress }),
        ...(updateData.maxConcurrent && { maxConcurrent: updateData.maxConcurrent }),
        ...(updateData.region && { region: updateData.region }),
        ...(updateData.isActive !== undefined && { 
          status: updateData.isActive ? 'ACTIVE' : 'INACTIVE' 
        }),
        ...(updateData.autoScaling !== undefined && { autoScaling: updateData.autoScaling }),
        ...(updateData.minInstances && { minInstances: updateData.minInstances }),
        ...(updateData.maxInstances && { maxInstances: updateData.maxInstances }),
        ...(updateData.healthCheckUrl && { healthCheckUrl: updateData.healthCheckUrl }),
        ...(updateData.tags && { tags: updateData.tags }),
        updatedAt: new Date(),
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'TEST_NODE_UPDATED',
      resource: 'test_node',
      details: {
        nodeId: updateData.id,
        updates: updateData,
        previousStatus: existingNode.status
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: updatedNode,
      message: 'Test node updated successfully'
    });

  } catch (error) {
    console.error('Error updating test node:', error);
    return NextResponse.json(
      { error: 'Failed to update test node' },
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
    const nodeId = searchParams.get('id');

    if (!nodeId) {
      return NextResponse.json({ error: 'Node ID required' }, { status: 400 });
    }

    // Get the node
    const node = await db.prisma.testNode.findUnique({
      where: { id: nodeId },
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

    if (!node) {
      return NextResponse.json({ error: 'Test node not found' }, { status: 404 });
    }

    // Check if node has active tests
    if (node._count.loadTestJobs > 0) {
      return NextResponse.json({
        error: 'Cannot delete node with active tests',
        activeTestsCount: node._count.loadTestJobs
      }, { status: 400 });
    }

    // Delete the node
    await db.prisma.testNode.delete({
      where: { id: nodeId }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      userId: session.user.id,
      action: 'TEST_NODE_DELETED',
      resource: 'test_node',
      details: {
        nodeId,
        nodeName: node.name,
        ipAddress: node.ipAddress,
        region: node.region
      },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Test node deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting test node:', error);
    return NextResponse.json(
      { error: 'Failed to delete test node' },
      { status: 500 }
    );
  }
}