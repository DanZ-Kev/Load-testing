import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EnterpriseSecurityManager {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  private static readonly JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
  private static readonly MFA_SECRET = process.env.MFA_SECRET || crypto.randomBytes(32).toString('hex');

  // Database Security
  static async enableRowLevelSecurity() {
    // Enable RLS on all tables
    const tables = ['users', 'load_test_jobs', 'test_nodes', 'load_scripts', 'audit_logs'];
    
    for (const table of tables) {
      await prisma.$executeRaw`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`;
    }
  }

  static async createSecurityPolicies() {
    // Create RLS policies for users table
    await prisma.$executeRaw`
      CREATE POLICY "Users can only access their own data" ON users
      FOR ALL USING (auth.uid() = id);
    `;

    // Create RLS policies for load test jobs
    await prisma.$executeRaw`
      CREATE POLICY "Users can only access their own load tests" ON load_test_jobs
      FOR ALL USING (auth.uid() = userId);
    `;

    // Create RLS policies for audit logs
    await prisma.$executeRaw`
      CREATE POLICY "Users can only access their own audit logs" ON audit_logs
      FOR ALL USING (auth.uid() = userId);
    `;
  }

  // Encryption Utilities
  static encryptData(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.ENCRYPTION_KEY);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decryptData(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Multi-Factor Authentication
  static generateMFASecret(): string {
    return crypto.randomBytes(20).toString('base32');
  }

  static generateMFABackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  static verifyMFAToken(token: string, secret: string): boolean {
    const counter = Math.floor(Date.now() / 30000); // 30-second window
    
    // Generate expected token
    const expectedToken = this.generateTOTP(secret, counter);
    
    // Check current and adjacent windows
    return token === expectedToken ||
           token === this.generateTOTP(secret, counter - 1) ||
           token === this.generateTOTP(secret, counter + 1);
  }

  private static generateTOTP(secret: string, counter: number): string {
    const key = Buffer.from(secret, 'base32');
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter), 0);
    
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);
    
    return (code % 1000000).toString().padStart(6, '0');
  }

  // JWT Management
  static generateJWT(payload: any, expiresIn: string = '15m'): string {
    return jwt.sign(payload, this.JWT_SECRET, { 
      expiresIn,
      issuer: 'loadtester-pro',
      audience: 'loadtester-users'
    });
  }

  static verifyJWT(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      this.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  // Password Security
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // API Key Management
  static generateAPIKey(): string {
    return `lt_${crypto.randomBytes(32).toString('hex')}`;
  }

  static hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  // Security Monitoring
  static async logSecurityEvent(
    type: string,
    severity: string,
    description: string,
    userId?: string,
    ipAddress?: string,
    details?: any
  ) {
    await prisma.securityEvent.create({
      data: {
        type: type as any,
        severity: severity as any,
        description,
        userId,
        ipAddress,
        details
      }
    });
  }

  static async logAuditEvent(
    action: string,
    userId: string,
    resource?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        resource,
        details,
        ipAddress,
        userAgent,
        severity: 'INFO'
      }
    });
  }

  // Rate Limiting
  static async checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    
    // This would typically use Redis for production
    // For now, we'll use a simple in-memory approach
    return true; // Placeholder
  }

  // Input Validation & Sanitization
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Session Management
  static async createUserSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        expires,
        ipAddress,
        userAgent
      }
    });
    
    return sessionToken;
  }

  static async validateSession(sessionToken: string): Promise<any> {
    const session = await prisma.userSession.findUnique({
      where: { sessionToken },
      include: { user: true }
    });
    
    if (!session || !session.isActive || session.expires < new Date()) {
      return null;
    }
    
    return session.user;
  }

  static async invalidateSession(sessionToken: string): Promise<void> {
    await prisma.userSession.update({
      where: { sessionToken },
      data: { isActive: false }
    });
  }

  // Database Connection Security
  static getSecureDatabaseConfig() {
    return {
      url: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production',
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    };
  }

  // Cleanup expired sessions and tokens
  static async cleanupExpiredData(): Promise<void> {
    const now = new Date();
    
    // Cleanup expired sessions
    await prisma.userSession.deleteMany({
      where: {
        expires: { lt: now }
      }
    });
    
    // Cleanup expired password reset tokens
    await prisma.user.updateMany({
      where: {
        passwordResetExpires: { lt: now }
      },
      data: {
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });
  }
}

// Export individual functions for easier use
export const {
  encryptData,
  decryptData,
  generateMFASecret,
  generateMFABackupCodes,
  verifyMFAToken,
  generateJWT,
  verifyJWT,
  generateRefreshToken,
  hashPassword,
  verifyPassword,
  generateAPIKey,
  hashAPIKey,
  logSecurityEvent,
  logAuditEvent,
  sanitizeInput,
  validateEmail,
  validatePassword,
  createUserSession,
  validateSession,
  invalidateSession
} = EnterpriseSecurityManager;