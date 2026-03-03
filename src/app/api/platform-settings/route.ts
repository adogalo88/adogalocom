import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';

const updateSettingsSchema = z.object({
  subscriptionEnabled: z.boolean().optional(),
  tukangSubscriptionPrice: z.number().min(0).optional(),
  supplierSubscriptionPrice: z.number().min(0).optional(),
  maintenanceMode: z.boolean().optional(),
});

// GET /api/platform-settings - Get platform settings
export async function GET() {
  try {
    let settings = await db.platformSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      // Create default settings
      settings = await db.platformSettings.create({
        data: {
          id: 'default',
          subscriptionEnabled: false,
          tukangSubscriptionPrice: 25000,
          supplierSubscriptionPrice: 49000,
          maintenanceMode: false,
        },
      });
    }

    return apiSuccess({ settings });
  } catch (error) {
    console.error('Get platform settings error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
}

// PUT /api/platform-settings - Update platform settings (admin only)
export const PUT = withRole(['ADMIN'], async (_user: SafeUser, request: NextRequest) => {
  try {
    const body = await request.json();
    const validationResult = updateSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const data = validationResult.data;

    const settings = await db.platformSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        ...data,
      },
    });

    return apiSuccess({
      message: 'Pengaturan berhasil disimpan',
      settings,
    });
  } catch (error) {
    console.error('Update platform settings error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
