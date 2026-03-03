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
} from '@/lib/api-utils';

// Validation schema for updating offer
const updateOfferSchema = z.object({
  price: z.number().positive('Harga harus bernilai positif').optional(),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
});

// GET /api/offers/[id] - Get single offer details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengakses penawaran');
    }

    const { id } = await params;

    // Get offer with material details
    const offer = await db.materialOffer.findUnique({
      where: { id },
      include: {
        material: {
          select: {
            id: true,
            title: true,
            description: true,
            quantity: true,
            unit: true,
            budget: true,
            location: true,
            deadline: true,
            status: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                city: true,
              },
            },
          },
        },
      },
    });

    if (!offer) {
      return apiNotFound('Penawaran tidak ditemukan');
    }

    // Check permissions
    const isOwner = offer.supplierId === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isMaterialOwner = offer.material.client.id === user.id;

    if (!isOwner && !isAdmin && !isMaterialOwner) {
      return apiForbidden('Anda tidak memiliki akses ke penawaran ini');
    }

    return apiSuccess(offer);
  } catch (error) {
    console.error('Error fetching offer:', error);
    return apiError('Terjadi kesalahan saat mengambil data penawaran', 500);
  }
}

// PATCH /api/offers/[id] - Update offer (only if pending)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengubah penawaran');
    }

    const { id } = await params;

    // Get offer
    const offer = await db.materialOffer.findUnique({
      where: { id },
      include: {
        material: {
          select: {
            id: true,
            title: true,
            status: true,
            deadline: true,
          },
        },
      },
    });

    if (!offer) {
      return apiNotFound('Penawaran tidak ditemukan');
    }

    // Only offer owner (supplier) can update
    if (offer.supplierId !== user.id) {
      return apiForbidden('Anda tidak memiliki akses untuk mengubah penawaran ini');
    }

    // Can only update pending offers
    if (offer.status !== 'PENDING') {
      return apiError('Hanya penawaran dengan status menunggu yang dapat diubah', 400);
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateOfferSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return apiError(`Validasi gagal: ${errors}`, 400);
    }

    const data = validationResult.data;

    // Update offer
    const updatedOffer = await db.materialOffer.update({
      where: { id },
      data: {
        price: data.price,
        notes: data.notes,
      },
      include: {
        material: {
          select: {
            id: true,
            title: true,
            description: true,
            quantity: true,
            unit: true,
            budget: true,
            location: true,
            deadline: true,
            status: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                city: true,
              },
            },
          },
        },
      },
    });

    return apiSuccess(updatedOffer);
  } catch (error) {
    console.error('Error updating offer:', error);
    return apiError('Terjadi kesalahan saat mengubah penawaran', 500);
  }
}

// DELETE /api/offers/[id] - Withdraw offer (only if pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk menghapus penawaran');
    }

    const { id } = await params;

    // Get offer
    const offer = await db.materialOffer.findUnique({
      where: { id },
    });

    if (!offer) {
      return apiNotFound('Penawaran tidak ditemukan');
    }

    // Only offer owner (supplier) can withdraw
    if (offer.supplierId !== user.id) {
      return apiForbidden('Anda tidak memiliki akses untuk menghapus penawaran ini');
    }

    // Can only withdraw pending offers
    if (offer.status !== 'PENDING') {
      return apiError('Hanya penawaran dengan status menunggu yang dapat ditarik', 400);
    }

    // Delete the offer
    await db.materialOffer.delete({
      where: { id },
    });

    return apiSuccess({ message: 'Penawaran berhasil ditarik' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return apiError('Terjadi kesalahan saat menghapus penawaran', 500);
  }
}
