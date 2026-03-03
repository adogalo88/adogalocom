import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withAuth, SafeUser } from '@/lib/api-utils';

// GET /api/subscriptions/current - Get user's current active subscription
export const GET = withAuth(async (user: SafeUser) => {
  try {
    const subscription = await db.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        OR: [
          { endDate: null }, // Lifetime
          { endDate: { gt: new Date() } }, // Not expired
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return apiSuccess({ subscription: null });
    }

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (subscription.endDate) {
      const now = new Date();
      const end = new Date(subscription.endDate);
      const diff = end.getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return apiSuccess({
      subscription: {
        ...subscription,
        daysRemaining,
      },
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
