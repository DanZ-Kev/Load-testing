import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseSecurityManager } from '@/lib/security';
import { DatabaseManager } from '@/lib/db';
import { z } from 'zod';

const securityManager = new EnterpriseSecurityManager();
const dbManager = new DatabaseManager();

// Validation schema
const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address').max(100, 'Email too long'),
  company: z.string().max(100, 'Company name too long').optional(),
  subscription: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).default('FREE'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number')
    .max(128, 'Password too long')
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `register:${clientIP}`;
    
    const isAllowed = await securityManager.checkRateLimit(rateLimitKey, 'register', 5, 3600); // 5 attempts per hour
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Connect to database
    const db = await dbManager.connect();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await securityManager.hashPassword(validatedData.password);

    // Generate API key
    const apiKey = securityManager.generateAPIKey();

    // Set subscription limits based on plan
    const subscriptionLimits = {
      FREE: { dailyTestLimit: 10, concurrentLimit: 5 },
      BASIC: { dailyTestLimit: 100, concurrentLimit: 20 },
      PRO: { dailyTestLimit: 1000, concurrentLimit: 100 },
      ENTERPRISE: { dailyTestLimit: -1, concurrentLimit: 500 } // -1 means unlimited
    };

    const limits = subscriptionLimits[validatedData.subscription];

    // Create user
    const user = await db.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        passwordHash,
        apiKey,
        subscription: validatedData.subscription,
        dailyTestLimit: limits.dailyTestLimit,
        concurrentLimit: limits.concurrentLimit,
        role: 'USER', // Default role for new users
        isActive: true,
        testsUsed: 0
      }
    });

    // Log user creation
    await securityManager.logAuditEvent({
      userId: user.id,
      action: 'USER_CREATE',
      resource: 'auth',
      details: {
        method: 'registration',
        subscription: validatedData.subscription,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent')
      }
    });

    // Log security event
    await securityManager.logSecurityEvent({
      type: 'USER_REGISTRATION',
      severity: 'INFO',
      userId: user.id,
      details: {
        email: validatedData.email,
        subscription: validatedData.subscription,
        ipAddress: clientIP
      }
    });

    // Return success response (without sensitive data)
    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        subscription: user.subscription,
        role: user.role
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}