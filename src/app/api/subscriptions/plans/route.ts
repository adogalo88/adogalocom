import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';

// GET /api/subscriptions/plans - Get all subscription plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'TUKANG' | 'SUPPLIER' | null;

    const where: Record<string, unknown> = { isActive: true };
    if (type) {
      where.type = type;
    }

    const plans = await db.subscriptionPlanConfig.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });

    // Parse features JSON
    const plansWithFeatures = plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features || '[]'),
    }));

    return apiSuccess({ plans: plansWithFeatures });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
}

// POST /api/subscriptions/plans - Create new plan (admin only)
export const POST = withRole(['ADMIN'], async (_user: SafeUser, request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, type, price, features, maxApplications, priority, sortOrder } = body;

    // Validate
    if (!name || !type || !price) {
      return apiError('Nama, tipe, dan harga harus diisi', 400);
    }

    // Check max 3 plans per type
    const existingCount = await db.subscriptionPlanConfig.count({
      where: { type },
    });

    if (existingCount >= 3) {
      return apiError('Maksimal 3 paket langganan per tipe', 400);
    }

    const plan = await db.subscriptionPlanConfig.create({
      data: {
        name,
        type,
        price: parseFloat(price),
        features: JSON.stringify(features || []),
        maxApplications: maxApplications || 0,
        priority: priority || 0,
        sortOrder: sortOrder || 0,
      },
    });

    return apiSuccess({ plan }, 201);
  } catch (error) {
    console.error('Create subscription plan error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
