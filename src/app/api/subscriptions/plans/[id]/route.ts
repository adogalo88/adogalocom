import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';

// DELETE /api/subscriptions/plans/[id] - Delete a plan (admin only)
export const DELETE = withRole(['ADMIN'], async (_user: SafeUser, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    // Check if any active subscriptions use this plan
    const activeSubscriptions = await db.subscription.count({
      where: {
        planId: id,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptions > 0) {
      return apiError('Tidak dapat menghapus paket yang masih memiliki subscriber aktif', 400);
    }

    await db.subscriptionPlanConfig.delete({
      where: { id },
    });

    return apiSuccess({ message: 'Paket berhasil dihapus' });
  } catch (error) {
    console.error('Delete plan error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
