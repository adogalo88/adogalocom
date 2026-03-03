import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';
import { NotificationType, SubscriptionStatus, TransactionType, TransactionStatus } from '@prisma/client';

const subscribeSchema = z.object({
  planId: z.string().optional(),
  planName: z.string().optional(), // For default plans
  type: z.enum(['TUKANG', 'SUPPLIER']).optional(),
});

// POST /api/subscriptions/subscribe - Subscribe to a plan
export const POST = withRole(['TUKANG', 'SUPPLIER'], async (user: SafeUser, request: NextRequest) => {
  try {
    const body = await request.json();
    const validationResult = subscribeSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const { planId, planName, type } = validationResult.data;

    // Get platform settings
    const settings = await db.platformSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings?.subscriptionEnabled) {
      return apiError('Sistem langganan tidak aktif', 400);
    }

    // Check if user already has active subscription
    const existingSub = await db.subscription.findFirst({
      where: {
        userId: user.id,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    });

    if (existingSub) {
      return apiError('Anda sudah memiliki langganan aktif', 400);
    }

    let price: number;
    let planNameFinal: string;

    if (planId && planId !== 'default') {
      // Custom plan
      const plan = await db.subscriptionPlanConfig.findUnique({
        where: { id: planId },
      });

      if (!plan || !plan.isActive) {
        return apiError('Paket tidak ditemukan', 404);
      }

      price = plan.price;
      planNameFinal = plan.name;
    } else {
      // Default plan
      const userType = user.role as 'TUKANG' | 'SUPPLIER';
      price = userType === 'TUKANG'
        ? settings.tukangSubscriptionPrice
        : settings.supplierSubscriptionPrice;
      planNameFinal = planName || 'Member';
    }

    // Create transaction (for payment)
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        type: TransactionType.SUBSCRIPTION,
        amount: price,
        fee: 0,
        total: price,
        status: TransactionStatus.PENDING,
        notes: `Langganan ${planNameFinal} - ${user.role}`,
      },
    });

    // For demo/testing, auto-activate subscription
    // In production, this should happen after payment confirmation
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month

    const subscription = await db.subscription.create({
      data: {
        userId: user.id,
        plan: planNameFinal,
        price,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        autoRenew: false,
      },
    });

    // Update transaction to completed
    await db.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.COMPLETED,
        verifiedAt: new Date(),
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.SUBSCRIPTION_EXPIRING,
        title: 'Langganan Aktif',
        message: `Selamat! Langganan ${planNameFinal} Anda telah aktif hingga ${endDate.toLocaleDateString('id-ID')}.`,
        data: JSON.stringify({ subscriptionId: subscription.id }),
      },
    });

    return apiSuccess({
      message: 'Langganan berhasil diaktifkan',
      subscription,
      transaction,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
