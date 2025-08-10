import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { prisma } from './db';
import { EnterpriseSecurityManager } from './security';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  role?: string;
  subscriptions: string[];
  lastPing: number;
  ipAddress?: string;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(server: any): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/realtime/monitor',
      clientTracking: true
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    this.startMetricsBroadcast();
    
    console.log('✅ WebSocket server initialized');
  }

  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
      try {
        const client = await this.handleConnection(ws, request);
        if (client) {
          this.clients.set(client.id, client);
          this.sendWelcomeMessage(client);
        }
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        ws.close(1008, 'Authentication failed');
      }
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });
  }

  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<WebSocketClient | null> {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const clientId = this.generateClientId();

    if (!token) {
      ws.close(1008, 'Authentication token required');
      return null;
    }

    try {
      // Verify JWT token
      const decoded = EnterpriseSecurityManager.verifyJWT(token);
      const userId = decoded.userId;
      
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true }
      });

      if (!user || !user.isActive) {
        ws.close(1008, 'User not found or inactive');
        return null;
      }

      const client: WebSocketClient = {
        id: clientId,
        ws,
        userId: user.id,
        role: user.role,
        subscriptions: [],
        lastPing: Date.now(),
        ipAddress: this.getClientIP(request)
      };

      // Log connection
      await EnterpriseSecurityManager.logAuditEvent(
        'WEBSOCKET_CONNECT',
        user.id,
        'websocket',
        { clientId, ipAddress: client.ipAddress },
        client.ipAddress
      );

      return client;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      ws.close(1008, 'Invalid token');
      return null;
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    const realIP = request.headers['x-real-ip'];
    
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    }
    
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }
    
    return request.socket.remoteAddress || 'unknown';
  }

  private sendWelcomeMessage(client: WebSocketClient): void {
    const message: WebSocketMessage = {
      type: 'welcome',
      data: {
        clientId: client.id,
        message: 'Connected to LoadTester Pro real-time monitoring',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    this.sendToClient(client, message);
  }

  public subscribe(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    if (!client.subscriptions.includes(channel)) {
      client.subscriptions.push(channel);
      
      // Send subscription confirmation
      this.sendToClient(client, {
        type: 'subscription_confirmed',
        data: { channel, message: `Subscribed to ${channel}` },
        timestamp: Date.now()
      });
    }

    return true;
  }

  public unsubscribe(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const index = client.subscriptions.indexOf(channel);
    if (index > -1) {
      client.subscriptions.splice(index, 1);
      
      // Send unsubscription confirmation
      this.sendToClient(client, {
        type: 'unsubscription_confirmed',
        data: { channel, message: `Unsubscribed from ${channel}` },
        timestamp: Date.now()
      });
    }

    return true;
  }

  public broadcast(channel: string, message: WebSocketMessage): void {
    let sentCount = 0;
    
    this.clients.forEach((client) => {
      if (client.subscriptions.includes(channel)) {
        if (this.sendToClient(client, message)) {
          sentCount++;
        }
      }
    });

    console.log(`📡 Broadcasted to ${sentCount} clients on channel: ${channel}`);
  }

  public sendToUser(userId: string, message: WebSocketMessage): boolean {
    let sent = false;
    
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        if (this.sendToClient(client, message)) {
          sent = true;
        }
      }
    });

    return sent;
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage): boolean {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        return true;
      }
    } catch (error) {
      console.error(`❌ Failed to send message to client ${client.id}:`, error);
    }
    
    return false;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const heartbeatMessage: WebSocketMessage = {
        type: 'heartbeat',
        data: { timestamp: now },
        timestamp: now
      };

      this.clients.forEach((client) => {
        // Check if client is still responsive
        if (now - client.lastPing > 30000) { // 30 seconds
          console.log(`⚠️ Client ${client.id} unresponsive, closing connection`);
          this.removeClient(client.id);
        } else {
          this.sendToClient(client, heartbeatMessage);
        }
      });
    }, 10000); // Every 10 seconds
  }

  private startMetricsBroadcast(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.broadcastSystemMetrics();
      } catch (error) {
        console.error('❌ Failed to broadcast system metrics:', error);
      }
    }, 5000); // Every 5 seconds
  }

  private async broadcastSystemMetrics(): Promise<void> {
    try {
      // Get real-time metrics
      const metrics = await this.getSystemMetrics();
      
      const message: WebSocketMessage = {
        type: 'system_metrics',
        data: metrics,
        timestamp: Date.now()
      };

      this.broadcast('system_metrics', message);
    } catch (error) {
      console.error('❌ Failed to get system metrics:', error);
    }
  }

  private async getSystemMetrics(): Promise<any> {
    try {
      // Get active tests count
      const activeTests = await prisma.loadTestJob.count({
        where: { status: 'RUNNING' }
      });

      // Get total users
      const totalUsers = await prisma.user.count({
        where: { isActive: true }
      });

      // Get node status
      const nodes = await prisma.testNode.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          currentLoad: true,
          lastHealthCheck: true
        }
      });

      // Get recent metrics
      const recentMetrics = await prisma.realTimeMetrics.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      return {
        activeTests,
        totalUsers,
        nodes,
        systemLoad: recentMetrics?.systemLoad || 0,
        memoryUsage: recentMetrics?.memoryUsage || 0,
        globalLatency: recentMetrics?.globalLatency || 0,
        errorRate: recentMetrics?.errorRate || 0,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Failed to get system metrics:', error);
      return {
        activeTests: 0,
        totalUsers: 0,
        nodes: [],
        systemLoad: 0,
        memoryUsage: 0,
        globalLatency: 0,
        errorRate: 0,
        timestamp: new Date()
      };
    }
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.ws.close(1000, 'Client disconnected');
    } catch (error) {
      console.error(`❌ Error closing client ${clientId}:`, error);
    }

    // Log disconnection
    if (client.userId) {
      EnterpriseSecurityManager.logAuditEvent(
        'WEBSOCKET_DISCONNECT',
        client.userId,
        'websocket',
        { clientId, ipAddress: client.ipAddress },
        client.ipAddress
      ).catch(console.error);
    }

    this.clients.delete(clientId);
    console.log(`👋 Client ${clientId} disconnected`);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getClientInfo(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  public getAllClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all connections
    this.clients.forEach((client) => {
      try {
        client.ws.close(1001, 'Server shutdown');
      } catch (error) {
        console.error('❌ Error closing client during cleanup:', error);
      }
    });

    this.clients.clear();
    
    if (this.wss) {
      this.wss.close();
    }

    console.log('✅ WebSocket manager cleaned up');
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();

// Export utility functions
export const initializeWebSocket = (server: any) => wsManager.initialize(server);
export const broadcastMessage = (channel: string, message: any) => wsManager.broadcast(channel, message);
export const sendToUser = (userId: string, message: any) => wsManager.sendToUser(userId, message);
export const getClientCount = () => wsManager.getClientCount();

// Graceful shutdown
process.on('beforeExit', () => {
  wsManager.cleanup();
});

process.on('SIGINT', () => {
  wsManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  wsManager.cleanup();
  process.exit(0);
});