import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  getPaginationParams,
  PaginatedResponse,
} from '@/lib/api-utils';
import { OfferStatus, Prisma } from '@prisma/client';

// Material offer with material data type for supplier
interface OfferWithMaterial {
  id: string;
  materialId: string;
  supplierId: string;
  price: number;
  notes: string | null;
  status: OfferStatus;
  createdAt: Date;
  updatedAt: Date;
  material: {
    id: string;
    title: string;
    description: string | null;
    quantity: number;
    unit: string;
    budget: number | null;
    location: string | null;
    deadline: string | null;
    status: string;
    client: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      avatar: string | null;
      city: string | null;
    };
  };
}

// GET /api/offers - Get offers for current supplier
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengakses penawaran');
    }

    // Only SUPPLIER role can access their offers
    if (user.role !== 'SUPPLIER' && user.role !== 'ADMIN') {
      return apiForbidden('Hanya supplier yang dapat mengakses daftar penawaran');
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // Build where clause
    const where: Prisma.MaterialOfferWhereInput = {};

    // Suppliers only see their own offers
    if (user.role === 'SUPPLIER') {
      where.supplierId = user.id;
    } else {
      // Admin can filter by supplierId
      const supplierId = searchParams.get('supplierId');
      if (supplierId) {
        where.supplierId = supplierId;
      }
    }

    // Filter by status
    const status = searchParams.get('status') as OfferStatus | null;
    if (status) {
      where.status = status;
    }

    // Filter by material status
    const materialStatus = searchParams.get('materialStatus');
    if (materialStatus) {
      where.material = {
        status: materialStatus as Prisma.MaterialWhereInput['status'],
      };
    }

    // Get total count
    const total = await db.materialOffer.count({ where });

    // Get offers with material details
    const offers = await db.materialOffer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

    const response: PaginatedResponse<OfferWithMaterial> = {
      data: offers as OfferWithMaterial[],
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
