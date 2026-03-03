import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword, generateToken, setAuthCookie, toSafeUser } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password harus diisi'),
});

// Rate limiting for login (OWASP recommendation)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkLoginAttempts(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  
  if (entry && now < entry.lockUntil) {
    return { 
      allowed: false, 
      remainingTime: Math.ceil((entry.lockUntil - now) / 1000) 
    };
  }
  
  return { allowed: true };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  
  if (!entry || now > entry.lockUntil) {
    loginAttempts.set(ip, { count: 1, lockUntil: 0 });
    return;
  }
  
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockUntil = now + LOCKOUT_TIME;
  }
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    
    // Check if account is locked
    const attemptCheck = checkLoginAttempts(ip);
    if (!attemptCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil((attemptCheck.remainingTime || 0) / 60)} menit.` 
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Check if user is suspended
    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan. Hubungi administrator.' },
        { status: 403 }
      );
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(ip);

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Set auth cookie
    await setAuthCookie(token);

    // Return user without password
    return NextResponse.json({
      message: 'Login berhasil',
      user: toSafeUser(user),
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
