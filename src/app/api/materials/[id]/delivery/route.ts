import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  createNotification,
} from '@/lib/api-utils';

// Validation schema for delivery actions
const deliverySchema = z.object({
  offerId: z.string(),
  action: z.enum(['start_delivery', 'confirm_delivery']),
  deliveryNotes: z.string().optional(),
  deliveryPhotos: z.string().optional(), // JSON array
});

// PATCH /api/materials/[id]/delivery - Handle delivery actions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login');
    }

    const { id: materialId } = await params;
    const body = await request.json();

    const validationResult = deliverySchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Data tidak valid', 400);
    }

    const { offerId, action, deliveryNotes, deliveryPhotos } = validationResult.data;

    // Get material
    const material = await db.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        title: true,
        status: true,
        clientId: true,
      },
    });

    if (!material) {
      return apiNotFound('Material tidak ditemukan');
    }

    // Get offer
    const offer = await db.materialOffer.findUnique({
      where: { id: offerId },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    if (!offer || offer.materialId !== materialId) {
      return apiNotFound('Penawaran tidak ditemukan');
    }

    if (action === 'start_delivery') {
      // Only supplier can start delivery
      if (user.role !== 'SUPPLIER' || offer.supplierId !== user.id) {
        return apiForbidden('Hanya supplier yang dapat memulai pengiriman');
      }

      if (offer.status !== 'ACCEPTED') {
        return apiError('Hanya penawaran yang diterima yang dapat dikirim', 400);
      }

      // Update offer to DELIVERING
      const updatedOffer = await db.materialOffer.update({
        where: { id: offerId },
        data: {
          status: 'DELIVERING',
          deliveryDate: new Date(),
          deliveryNotes,
          deliveryPhotos,
        },
      });

      // Notify client
      await createNotification(
        material.clientId,
        'MATERIAL_OFFER',
        'Material Dalam Pengiriman',
        `Material "${material.title}" sedang dalam perjalanan dari ${offer.supplier.name}`,
        { materialId, offerId }
      );

      return apiSuccess({
        ...updatedOffer,
        message: 'Status pengiriman diperbarui',
      });

    } else if (action === 'confirm_delivery') {
      // Only client can confirm delivery
      const isOwner = material.clientId === user.id;
      const isAdmin = user.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        return apiForbidden('Hanya pemilik material yang dapat mengkonfirmasi penerimaan');
      }

      if (offer.status !== 'DELIVERING' && offer.status !== 'ACCEPTED') {
        return apiError('Material belum dalam status pengiriman', 400);
      }

      // Update offer to DELIVERED
      const updatedOffer = await db.materialOffer.update({
        where: { id: offerId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          deliveredBy: user.id,
        },
      });

      // Update material status to FULFILLED
      await db.material.update({
        where: { id: materialId },
        data: { status: 'FULFILLED' },
      });

      // Notify supplier
      await createNotification(
        offer.supplierId,
        'MATERIAL_ACCEPTED',
        'Material Diterima',
        `Material "${material.title}" telah diterima oleh klien.`,
        { materialId, offerId }
      );

      return apiSuccess({
        ...updatedOffer,
        message: 'Penerimaan material dikonfirmasi',
      });
    }

    return apiError('Aksi tidak valid', 400);

  } catch (error) {
    console.error('Error handling delivery:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
}
