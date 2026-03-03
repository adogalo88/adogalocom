import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';
import { SubscriptionStatus, TransactionStatus, TransactionType } from '@prisma/client';

// GET /api/subscriptions/stats - Get subscription statistics (admin only)
export const GET = withRole(['ADMIN'], async () => {
  try {
    // Get all active subscriptions
    const subscriptions = await db.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
      include: {
        user: {
          select: { role: true },
        },
      },
    });

    const tukangSubscribers = subscriptions.filter(s => s.user.role === 'TUKANG').length;
    const supplierSubscribers = subscriptions.filter(s => s.user.role === 'SUPPLIER').length;

    // Calculate monthly revenue
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const monthlyTransactions = await db.transaction.aggregate({
      where: {
        type: TransactionType.SUBSCRIPTION,
        status: TransactionStatus.COMPLETED,
        createdAt: {
          gte: firstDayOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const stats = {
      totalSubscribers: subscriptions.length,
      tukangSubscribers,
      supplierSubscribers,
      activeSubscriptions: subscriptions.length,
      monthlyRevenue: monthlyTransactions._sum.amount || 0,
    };

    return apiSuccess({ stats });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
