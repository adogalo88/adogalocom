import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { SafeUser } from '@/lib/auth';
import { apiSuccess, apiError, apiNotFound, apiForbidden, withAuth } from '@/lib/api-utils';

// =====================
// VALIDATION SCHEMAS
// =====================

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

// =====================
// HELPER FUNCTIONS
// =====================

function canAccessNotification(user: SafeUser, notification: { userId: string }): boolean {
  // Users can only access their own notifications
  // Admin can access any notification
  return user.role === 'ADMIN' || user.id === notification.userId;
}

// =====================
// PATCH: Mark Notification as Read
// =====================

export const PATCH = withAuth(async (user: SafeUser, request: NextRequest, context) => {
  try {
    const params = await context?.params;
    const notificationId = params?.id as string;

    if (!notificationId) {
      return apiError('ID notifikasi tidak valid', 400);
    }

    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return apiNotFound('Notifikasi tidak ditemukan');
    }

    // Check access permission
    if (!canAccessNotification(user, notification)) {
      return apiForbidden('Anda tidak memiliki akses ke notifikasi ini');
    }

    const body = await request.json();

    const validationResult = updateNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const updateData = validationResult.data;

    // If marking as read, set readAt timestamp
    const dataToUpdate: Record<string, unknown> = {};

    if (updateData.isRead !== undefined) {
      dataToUpdate.isRead = updateData.isRead;
      dataToUpdate.readAt = updateData.isRead ? new Date() : null;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return apiError('Tidak ada data yang diperbarui', 400);
    }

    // Update notification
    const updatedNotification = await db.notification.update({
      where: { id: notificationId },
      data: dataToUpdate,
    });

    return apiSuccess({
      message: updateData.isRead ? 'Notifikasi ditandai sebagai dibaca' : 'Notifikasi ditandai sebagai belum dibaca',
      data: updatedNotification,
    });
  } catch (error) {
    console.error('Update notification error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// =====================
// DELETE: Delete Notification
// =====================

export const DELETE = withAuth(async (user: SafeUser, request: NextRequest, context) => {
  try {
    const params = await context?.params;
    const notificationId = params?.id as string;

    if (!notificationId) {
      return apiError('ID notifikasi tidak valid', 400);
    }

    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return apiNotFound('Notifikasi tidak ditemukan');
    }

    // Check access permission
    if (!canAccessNotification(user, notification)) {
      return apiForbidden('Anda tidak memiliki akses untuk menghapus notifikasi ini');
    }

    // Delete notification
    await db.notification.delete({
      where: { id: notificationId },
    });

    return apiSuccess({
      message: 'Notifikasi berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
