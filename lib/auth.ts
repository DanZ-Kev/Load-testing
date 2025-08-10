import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { EnterpriseSecurityManager } from './security';
import { DatabaseManager } from './db';

const securityManager = new EnterpriseSecurityManager();
const dbManager = new DatabaseManager();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaToken: { label: 'MFA Token', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const db = await dbManager.connect();
          
          // Find user by email
          const user = await db.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              mfaSecret: true,
              role: true,
              subscription: true,
              isActive: true,
              lastLogin: true
            }
          });

          if (!user || !user.isActive) {
            return null;
          }

          // Verify password
          const isValidPassword = await securityManager.verifyPassword(
            credentials.password,
            user.passwordHash
          );

          if (!isValidPassword) {
            return null;
          }

          // If MFA is enabled, verify MFA token
          if (user.mfaSecret && credentials.mfaToken) {
            const isValidMFA = securityManager.verifyMFAToken(
              credentials.mfaToken,
              user.mfaSecret
            );

            if (!isValidMFA) {
              return null;
            }
          } else if (user.mfaSecret && !credentials.mfaToken) {
            // MFA required but not provided
            throw new Error('MFA_REQUIRED');
          }

          // Update last login
          await db.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });

          // Log successful login
          await securityManager.logAuditEvent({
            userId: user.id,
            action: 'LOGIN',
            resource: 'auth',
            details: { method: 'credentials', ipAddress: 'unknown' }
          });

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            subscription: user.subscription
          };
        } catch (error) {
          console.error('Authentication error:', error);
          
          if (error instanceof Error && error.message === 'MFA_REQUIRED') {
            throw error;
          }
          
          return null;
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.subscription = user.subscription;
        token.userId = user.id;
      }
      
      // Refresh token if needed
      if (token.exp && Date.now() > token.exp * 1000 - 5 * 60 * 1000) {
        // Token expires in less than 5 minutes, refresh it
        try {
          const newToken = await securityManager.refreshJWT(token.userId);
          if (newToken) {
            token.accessToken = newToken;
            token.exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.subscription = token.subscription as string;
        session.accessToken = token.accessToken as string;
      }
      
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after login
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/dashboard`;
      }
      return baseUrl;
    }
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
    verifyRequest: '/verify-request'
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 60 * 60, // 1 hour
  }
};

// MFA verification function
export async function verifyMFA(userId: string, mfaToken: string): Promise<boolean> {
  try {
    const db = await dbManager.connect();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true }
    });

    if (!user?.mfaSecret) {
      return false;
    }

    return securityManager.verifyMFAToken(mfaToken, user.mfaSecret);
  } catch (error) {
    console.error('MFA verification error:', error);
    return false;
  }
}

// Generate MFA setup for user
export async function setupMFA(userId: string): Promise<{
  secret: string;
  qrCode: string;
  backupCodes: string[];
}> {
  try {
    const db = await dbManager.connect();
    
    // Generate new MFA secret
    const secret = securityManager.generateMFASecret();
    
    // Generate backup codes
    const backupCodes = securityManager.generateBackupCodes();
    
    // Update user with MFA secret
    await db.user.update({
      where: { id: userId },
      data: { mfaSecret: secret }
    });
    
    // Generate QR code
    const qrCode = await securityManager.generateMFACode(secret);
    
    // Log MFA setup
    await securityManager.logAuditEvent({
      userId,
      action: 'MFA_SETUP',
      resource: 'auth',
      details: { method: 'totp' }
    });
    
    return { secret, qrCode, backupCodes };
  } catch (error) {
    console.error('MFA setup error:', error);
    throw error;
  }
}

// Disable MFA for user
export async function disableMFA(userId: string): Promise<boolean> {
  try {
    const db = await dbManager.connect();
    
    await db.user.update({
      where: { id: userId },
      data: { mfaSecret: null }
    });
    
    // Log MFA disable
    await securityManager.logAuditEvent({
      userId,
      action: 'MFA_DISABLE',
      resource: 'auth',
      details: { method: 'manual' }
    });
    
    return true;
  } catch (error) {
    console.error('MFA disable error:', error);
    return false;
  }
}

// Verify backup code
export async function verifyBackupCode(userId: string, backupCode: string): Promise<boolean> {
  try {
    const db = await dbManager.connect();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true }
    });

    if (!user?.mfaSecret) {
      return false;
    }

    return securityManager.verifyBackupCode(backupCode, user.mfaSecret);
  } catch (error) {
    console.error('Backup code verification error:', error);
    return false;
  }
}

// Get user permissions
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const db = await dbManager.connect();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, subscription: true }
    });

    if (!user) {
      return [];
    }

    const permissions: string[] = [];
    
    // Role-based permissions
    switch (user.role) {
      case 'SUPER_ADMIN':
        permissions.push('*'); // All permissions
        break;
      case 'ADMIN':
        permissions.push(
          'admin:read',
          'admin:write',
          'users:read',
          'users:write',
          'nodes:read',
          'nodes:write',
          'scripts:read',
          'scripts:write',
          'analytics:read',
          'settings:read',
          'settings:write'
        );
        break;
      case 'USER':
        permissions.push(
          'tests:read',
          'tests:write',
          'scripts:read',
          'analytics:read'
        );
        break;
    }

    // Subscription-based permissions
    switch (user.subscription) {
      case 'ENTERPRISE':
        permissions.push(
          'enterprise:features',
          'priority:support',
          'custom:domains',
          'advanced:analytics'
        );
        break;
      case 'PRO':
        permissions.push(
          'pro:features',
          'advanced:scripts',
          'bulk:operations'
        );
        break;
      case 'BASIC':
        permissions.push(
          'basic:features',
          'standard:scripts'
        );
        break;
      case 'FREE':
        permissions.push(
          'free:features',
          'limited:scripts'
        );
        break;
    }

    return permissions;
  } catch (error) {
    console.error('Get permissions error:', error);
    return [];
  }
}

// Check if user has permission
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId);
    return permissions.includes('*') || permissions.includes(permission);
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

// Session management
export async function createUserSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  try {
    const sessionId = await securityManager.createUserSession(userId, userAgent, ipAddress);
    
    // Log session creation
    await securityManager.logAuditEvent({
      userId,
      action: 'SESSION_CREATE',
      resource: 'auth',
      details: { sessionId, userAgent, ipAddress }
    });
    
    return sessionId;
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
}

export async function validateSession(sessionId: string): Promise<boolean> {
  try {
    return await securityManager.validateSession(sessionId);
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

export async function invalidateSession(sessionId: string): Promise<boolean> {
  try {
    const result = await securityManager.invalidateSession(sessionId);
    
    if (result) {
      // Log session invalidation
      await securityManager.logAuditEvent({
        action: 'SESSION_INVALIDATE',
        resource: 'auth',
        details: { sessionId }
      });
    }
    
    return result;
  } catch (error) {
    console.error('Session invalidation error:', error);
    return false;
  }
}

// Rate limiting
export async function checkRateLimit(identifier: string, action: string, limit: number, window: number): Promise<boolean> {
  try {
    return await securityManager.checkRateLimit(identifier, action, limit, window);
  } catch (error) {
    console.error('Rate limit check error:', error);
    return true; // Allow if rate limiting fails
  }
}

// Export types
export type { NextAuthOptions } from 'next-auth';
export type { JWT } from 'next-auth/jwt';