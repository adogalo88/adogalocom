import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { SafeUser } from '@/lib/auth';
import { apiSuccess, apiError, withAuth, getPaginationParams, PaginatedResponse } from '@/lib/api-utils';
import { NotificationType } from '@prisma/client';

// =====================
// VALIDATION SCHEMAS
// =====================

const notificationFilterSchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  type: z.enum([
    'PROJECT_NEW',
    'PROJECT_APPLICATION',
    'PROJECT_ACCEPTED',
    'PROJECT_REJECTED',
    'PROJECT_COMPLETED',
    'MATERIAL_NEW',
    'MATERIAL_OFFER',
    'MATERIAL_ACCEPTED',
    'PAYMENT_RECEIVED',
    'PAYMENT_VERIFIED',
    'PAYMENT_REJECTED',
    'MESSAGE_NEW',
    'REVIEW_NEW',
    'SYSTEM',
  ]).optional(),
  isRead: z.enum(['true', 'false']).optional(),
});

const createNotificationSchema = z.object({
  userId: z.string().min(1, 'ID pengguna wajib diisi'),
  type: z.enum([
    'PROJECT_NEW',
    'PROJECT_APPLICATION',
    'PROJECT_ACCEPTED',
    'PROJECT_REJECTED',
    'PROJECT_COMPLETED',
    'MATERIAL_NEW',
    'MATERIAL_OFFER',
    'MATERIAL_ACCEPTED',
    'PAYMENT_RECEIVED',
    'PAYMENT_VERIFIED',
    'PAYMENT_REJECTED',
    'MESSAGE_NEW',
    'REVIEW_NEW',
    'SYSTEM',
  ]),
  title: z.string().min(1, 'Judul wajib diisi').max(100, 'Judul maksimal 100 karakter'),
  message: z.string().min(1, 'Pesan wajib diisi').max(500, 'Pesan maksimal 500 karakter'),
  data: z.record(z.unknown()).optional(), // JSON object for additional data
});

// =====================
// GET: List Notifications
// =====================

export const GET = withAuth(async (user: SafeUser, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = notificationFilterSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return apiError('Parameter tidak valid', 400, validationResult.error.flatten());
    }

    const {
      page = '1',
      limit = '20', // Default higher limit for notifications
      type,
      isRead,
    } = validationResult.data;

    const { skip, page: pageNum, limit: limitNum } = getPaginationParams({ page, limit });

    // Build filter - users can only see their own notifications
    const where: Record<string, unknown> = {
      userId: user.id,
    };

    // Apply filters
    if (type) {
      where.type = type;
    }
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    // Get notifications
    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    const response: PaginatedResponse<typeof notifications[0]> & { unreadCount: number } = {
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      unreadCount,
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Get notifications error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// =====================
// POST: Create Notification
// =====================

export const POST = withAuth(async (user: SafeUser, request: NextRequest) => {
  try {
    const body = await request.json();

    const validationResult = createNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const data = validationResult.data;

    // Only ADMIN can create notifications for other users
    // Regular users can only create SYSTEM notifications for themselves (rare case)
    if (user.role !== 'ADMIN' && data.userId !== user.id) {
      return apiError('Anda tidak dapat membuat notifikasi untuk pengguna lain', 403);
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: data.userId },
      select: { id: true, status: true },
    });

    if (!targetUser) {
      return apiError('Pengguna target tidak ditemukan', 404);
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        type: data.type as NotificationType,
        title: data.title,
        message: data.message,
        data: data.data ? JSON.stringify(data.data) : null,
      },
    });

    return apiSuccess({
      message: 'Notifikasi berhasil dibuat',
      data: notification,
    }, 201);
  } catch (error) {
    console.error('Create notification error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
