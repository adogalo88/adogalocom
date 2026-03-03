import { NextResponse } from 'next/server';
import { getCurrentUser, toSafeUser, type SafeUser } from './auth';
import { db } from './db';

// API Response helpers
export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, details },
    { status }
  );
}

export function apiUnauthorized(message = 'Tidak terautentikasi') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function apiForbidden(message = 'Akses ditolak') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function apiNotFound(message = 'Data tidak ditemukan') {
  return NextResponse.json({ error: message }, { status: 404 });
}

// Pagination helper
export interface PaginationParams {
  page?: string;
  limit?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function getPaginationParams(params: PaginationParams) {
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '10', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Auth wrapper for API routes
export type AuthenticatedHandler = (
  user: SafeUser,
  request: Request,
  context?: { params: Record<string, string | string[]> }
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request, context?: { params: Record<string, string | string[]> }) => {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized();
    }
    return handler(user, request, context);
  };
}

// Role-based auth wrapper
export function withRole(roles: string[], handler: AuthenticatedHandler) {
  return withAuth(async (user, request, context) => {
    if (!roles.includes(user.role)) {
      return apiForbidden('Anda tidak memiliki akses untuk operasi ini');
    }
    return handler(user, request, context);
  });
}

// Notification helper
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  try {
    await db.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

// Date formatting
export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Currency formatting
export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
