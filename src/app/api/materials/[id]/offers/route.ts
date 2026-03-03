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
  getPaginationParams,
  PaginatedResponse,
  createNotification,
} from '@/lib/api-utils';
import { OfferStatus, Prisma } from '@prisma/client';

// Validation schema for creating offer
const createOfferSchema = z.object({
  price: z.number().positive('Harga harus bernilai positif'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
});

// Validation schema for updating offer status (for client)
const updateOfferStatusSchema = z.object({
  offerId: z.string().min(1, 'ID penawaran wajib diisi'),
  status: z.enum(['ACCEPTED', 'REJECTED']),
  rejectionReason: z.string().max(500, 'Alasan penolakan maksimal 500 karakter').optional(),
});

// Material offer with supplier data type
interface OfferWithSupplier {
  id: string;
  materialId: string;
  supplierId: string;
  price: number;
  notes: string | null;
  status: OfferStatus;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    city: string | null;
    province: string | null;
    rating: number;
    totalReviews: number;
    isVerified: boolean;
  };
}

// GET /api/materials/[id]/offers - Get offers for a material
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
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // Get material to check permissions
    const material = await db.material.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        status: true,
      },
    });

    if (!material) {
      return apiNotFound('Material tidak ditemukan');
    }

    const isOwner = material.clientId === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSupplier = user.role === 'SUPPLIER';

    // Only material owner (client), admin, or suppliers can view offers
    if (!isOwner && !isAdmin && !isSupplier) {
      return apiForbidden('Anda tidak memiliki akses ke penawaran ini');
    }

    // Build where clause
    const status = searchParams.get('status') as OfferStatus | null;
    let where: Prisma.MaterialOfferWhereInput = {
      materialId: id,
    };

    if (status) {
      where.status = status;
    }

    // Suppliers can only see their own offers
    if (isSupplier && !isAdmin) {
      where.supplierId = user.id;
    }

    // Get total count
    const total = await db.materialOffer.count({ where });

    // Get offers
    const offers = await db.materialOffer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            city: true,
            province: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
      },
    });

    // For suppliers viewing their own offer, return full details
    // For material owners (clients), return all details
    // For admins, return all details
    let responseData: OfferWithSupplier[] = offers as OfferWithSupplier[];

    // Hide sensitive info from other suppliers
    if (isSupplier && !isOwner && !isAdmin) {
      responseData = offers.map((offer) => ({
        ...offer,
        supplier: {
          ...offer.supplier,
          phone: offer.supplierId === user.id ? offer.supplier.phone : null,
          email: offer.supplierId === user.id ? offer.supplier.email : '',
        },
      })) as OfferWithSupplier[];
    }

    const response: PaginatedResponse<OfferWithSupplier> = {
      data: responseData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return apiError('Terjadi kesalahan saat mengambil data penawaran', 500);
  }
}

// POST /api/materials/[id]/offers - Create a new offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk membuat penawaran');
    }

    // Only SUPPLIER role can create offers
    if (user.role !== 'SUPPLIER') {
      return apiForbidden('Hanya supplier yang dapat membuat penawaran');
    }

    const { id } = await params;

    // Get material
    const material = await db.material.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        clientId: true,
        budget: true,
        deadline: true,
      },
    });

    if (!material) {
      return apiNotFound('Material tidak ditemukan');
    }

    // Material must be published
    if (material.status !== 'PUBLISHED') {
      return apiError('Material ini belum dipublikasikan', 400);
    }

    // Check if deadline has passed
    if (material.deadline && new Date() > new Date(material.deadline)) {
      return apiError('Batas waktu penawaran untuk material ini sudah berakhir', 400);
    }

    // Check if supplier already made an offer
    const existingOffer = await db.materialOffer.findUnique({
      where: {
        materialId_supplierId: {
          materialId: id,
          supplierId: user.id,
        },
      },
    });

    if (existingOffer) {
      return apiError('Anda sudah membuat penawaran untuk material ini', 400);
    }

    const body = await request.json();

    // Validate input
    const validationResult = createOfferSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return apiError(`Validasi gagal: ${errors}`, 400);
    }

    const data = validationResult.data;

    // Optional: warn if price is above budget (but still allow)
    const budgetWarning = material.budget && data.price > material.budget;

    // Create offer
    const offer = await db.materialOffer.create({
      data: {
        materialId: id,
        supplierId: user.id,
        price: data.price,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            city: true,
            province: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
      },
    });

    // Notify material owner
    await createNotification(
      material.clientId,
      'MATERIAL_OFFER',
      'Penawaran Baru Diterima',
      `Anda menerima penawaran baru untuk material "${material.title}" dari ${user.name}`,
      { materialId: id, offerId: offer.id }
    );

    return apiSuccess({
      ...offer,
      budgetWarning: budgetWarning
        ? `Harga penawaran melebihi budget (${material.budget?.toLocaleString('id-ID')})`
        : null,
    }, 201);
  } catch (error) {
    console.error('Error creating offer:', error);
    return apiError('Terjadi kesalahan saat membuat penawaran', 500);
  }
}

// PATCH /api/materials/[id]/offers - Update offer status (accept/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengubah status penawaran');
    }

    const { id } = await params;
    const body = await request.json();

    // Get material
    const material = await db.material.findUnique({
      where: { id },
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

    // Only material owner (client) or admin can update offer status
    const isOwner = material.clientId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return apiForbidden('Hanya pemilik material yang dapat mengubah status penawaran');
    }

    // Validate input
    const validationResult = updateOfferStatusSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return apiError(`Validasi gagal: ${errors}`, 400);
    }

    const data = validationResult.data;

    // Get offer
    const offer = await db.materialOffer.findUnique({
      where: { id: data.offerId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!offer || offer.materialId !== id) {
      return apiNotFound('Penawaran tidak ditemukan');
    }

    // Cannot update already processed offers
    if (offer.status !== 'PENDING') {
      return apiError(`Penawaran sudah ${offer.status === 'ACCEPTED' ? 'diterima' : 'ditolak'} dan tidak dapat diubah`, 400);
    }

    // Update offer status
    const updatedOffer = await db.materialOffer.update({
      where: { id: data.offerId },
      data: {
        status: data.status,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            city: true,
            province: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
      },
    });

    // If accepted, update material status and reject other offers
    if (data.status === 'ACCEPTED') {
      // Update material status to IN_PROGRESS
      await db.material.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });

      // Reject all other pending offers
      await db.materialOffer.updateMany({
        where: {
          materialId: id,
          status: 'PENDING',
          id: { not: data.offerId },
        },
        data: { status: 'REJECTED' },
      });

      // Notify accepted supplier
      await createNotification(
        offer.supplierId,
        'MATERIAL_ACCEPTED',
        'Penawaran Diterima',
        `Penawaran Anda untuk material "${material.title}" telah diterima!`,
        { materialId: id, offerId: offer.id }
      );

      // Notify rejected suppliers
      const rejectedOffers = await db.materialOffer.findMany({
        where: {
          materialId: id,
          status: 'REJECTED',
          id: { not: data.offerId },
        },
        select: { supplierId: true },
      });

      for (const rejectedOffer of rejectedOffers) {
        await createNotification(
          rejectedOffer.supplierId,
          'MATERIAL_OFFER',
          'Penawaran Ditolak',
          `Penawaran Anda untuk material "${material.title}" tidak diterima.`,
          { materialId: id }
        );
      }
    } else {
      // Notify rejected supplier
      await createNotification(
        offer.supplierId,
        'MATERIAL_OFFER',
        'Penawaran Ditolak',
        `Penawaran Anda untuk material "${material.title}" ditolak. ${data.rejectionReason || ''}`,
        { materialId: id, offerId: offer.id, reason: data.rejectionReason }
      );
    }

    return apiSuccess(updatedOffer);
  } catch (error) {
    console.error('Error updating offer:', error);
    return apiError('Terjadi kesalahan saat mengubah status penawaran', 500);
  }
}
