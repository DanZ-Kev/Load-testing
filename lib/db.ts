import { PrismaClient } from '@prisma/client';
import { EnterpriseSecurityManager } from './security';

declare global {
  var __prisma: PrismaClient | undefined;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;
  private isConnected = false;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getPrisma(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.prisma.$connect();
      this.isConnected = true;
      
      // Enable Row Level Security in production
      if (process.env.NODE_ENV === 'production') {
        await this.enableSecurityFeatures();
      }
      
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  private async enableSecurityFeatures(): Promise<void> {
    try {
      // Enable Row Level Security
      await EnterpriseSecurityManager.enableRowLevelSecurity();
      
      // Create security policies
      await EnterpriseSecurityManager.createSecurityPolicies();
      
      console.log('✅ Database security features enabled');
    } catch (error) {
      console.warn('⚠️ Could not enable all security features:', error);
    }
  }

  // Connection pooling configuration
  public getConnectionConfig() {
    return {
      maxConnections: 20,
      minConnections: 5,
      acquireTimeout: 60000,
      timeout: 60000,
      idleTimeout: 30000,
      reapInterval: 1000,
      createRetryInterval: 200,
      createTimeout: 30000,
      destroyTimeout: 5000,
      log: process.env.NODE_ENV === 'development',
    };
  }

  // Transaction management
  public async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      maxWait: 5000,
      timeout: 10000,
      isolationLevel: 'ReadCommitted',
    });
  }

  // Backup and recovery
  public async createBackup(): Promise<string> {
    // This would typically use pg_dump or similar
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/backup-${timestamp}.sql`;
    
    console.log(`📦 Creating backup at: ${backupPath}`);
    return backupPath;
  }

  public async restoreBackup(backupPath: string): Promise<void> {
    // This would typically use psql or similar
    console.log(`🔄 Restoring backup from: ${backupPath}`);
  }

  // Performance monitoring
  public async getPerformanceMetrics(): Promise<any> {
    try {
      const metrics = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY n_distinct DESC
        LIMIT 20
      `;
      
      return metrics;
    } catch (error) {
      console.error('❌ Failed to get performance metrics:', error);
      return null;
    }
  }

  public async getSlowQueries(): Promise<any[]> {
    try {
      const slowQueries = await this.prisma.$queryRaw`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT 10
      `;
      
      return slowQueries as any[];
    } catch (error) {
      console.error('❌ Failed to get slow queries:', error);
      return [];
    }
  }

  // Cleanup and maintenance
  public async cleanup(): Promise<void> {
    try {
      // Cleanup expired sessions
      await EnterpriseSecurityManager.cleanupExpiredData();
      
      // Cleanup old metrics (keep last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await this.prisma.realTimeMetrics.deleteMany({
        where: {
          timestamp: { lt: thirtyDaysAgo }
        }
      });
      
      await this.prisma.nodeMetrics.deleteMany({
        where: {
          timestamp: { lt: thirtyDaysAgo }
        }
      });
      
      console.log('✅ Database cleanup completed');
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();

// Export Prisma client for direct use
export const prisma = db.getPrisma();

// Export connection functions
export const connectDB = () => db.connect();
export const disconnectDB = () => db.disconnect();
export const healthCheck = () => db.healthCheck();

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDB();
});

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});