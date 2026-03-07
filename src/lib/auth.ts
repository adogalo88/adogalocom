import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'adogalo-super-secret-jwt-key-change-in-production-2024'
);

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  iat: number;
  exp: number;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  ktpNumber: string | null;
  ktpPhoto: string | null;
  npwpNumber: string | null;
  address: string | null;
  cityId: string | null;
  postalCode: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  specialty: string | null;
  experience: number | null;
  description: string | null;
  rating: number;
  totalReviews: number;
  totalProjects: number;
  isVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  city?: {
    id: string;
    name: string;
    province: { id: string; name: string };
  } | null;
}

// Hash password with bcrypt (OWASP recommended)
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // OWASP recommends at least 10
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token expires in 7 days
    .sign(JWT_SECRET);
  
  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // OWASP recommends strict for auth cookies
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Get auth cookie
export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}

// Clear auth cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

// Get current user from token
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const token = await getAuthCookie();
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) {
      await clearAuthCookie();
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            province: {
              select: { id: true, name: true }
            }
          }
        },
        materialCategories: {
          select: { id: true, name: true }
        },
        vendorCategories: {
          select: { id: true, name: true }
        },
        skills: {
          select: { id: true, name: true }
        }
      }
    });

    if (!user) {
      await clearAuthCookie();
      return null;
    }

    const { password: _, ...safeUser } = user;
    return safeUser as SafeUser;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Validate password strength (OWASP guidelines)
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password harus minimal 8 karakter');
  }
  
  if (password.length > 128) {
    errors.push('Password maksimal 128 karakter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password harus mengandung huruf kecil');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password harus mengandung huruf besar');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password harus mengandung angka');
  }
  
  // Check for common patterns
  const commonPatterns = [
    'password',
    '123456',
    'qwerty',
    'admin',
    'user',
  ];
  
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password mengandung pola umum yang tidak aman');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if user has required role
export function hasRole(user: SafeUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Convert DB user (with password) to SafeUser (without password)
export function toSafeUser<T extends { password: string }>(user: T): SafeUser {
  const { password: _, ...safeUser } = user;
  return safeUser as SafeUser;
}

// Check if user is verified
export function isUserVerified(user: SafeUser | null): boolean {
  if (!user) return false;
  return user.isVerified && user.status === 'ACTIVE';
}
