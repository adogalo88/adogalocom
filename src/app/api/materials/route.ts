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
import { MaterialStatus, Material, Prisma } from '@prisma/client';

// Validation schemas
const createMaterialSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200, 'Judul maksimal 200 karakter'),
  description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional(),
  quantity: z.number().int().positive('Jumlah harus bilangan bulat positif'),
  unit: z.string().min(1, 'Satuan wajib diisi').max(50, 'Satuan maksimal 50 karakter'),
  budget: z.number().positive('Budget harus bernilai positif').optional(),
  cityId: z.string().optional(), // Reference to City
  address: z.string().max(500, 'Alamat maksimal 500 karakter').optional(), // Detailed address
  photos: z.string().optional(), // JSON array of photo URLs
  files: z.string().optional(), // JSON array of file URLs
  deadline: z.string().datetime('Format deadline tidak valid').optional().nullable(),
  projectId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
});

// Material with related data type
interface MaterialWithRelations extends Material {
  city?: {
    id: string;
    name: string;
    province: { id: string; name: string };
  } | null;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
  };
  _count: {
    offers: number;
  };
  project?: {
    id: string;
    title: string;
  } | null;
}

// GET /api/materials - List materials with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengakses data material');
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // Get filter parameters
    const status = searchParams.get('status') as MaterialStatus | null;
    const clientId = searchParams.get('clientId');
    const cityId = searchParams.get('cityId');
    const provinceId = searchParams.get('provinceId');

    // Build where clause based on role
    let where: Prisma.MaterialWhereInput = {};

    switch (user.role) {
      case 'CLIENT':
        // Clients can only see their own materials
        where.clientId = user.id;
        if (status) where.status = status;
        break;

      case 'SUPPLIER':
        // Suppliers can see all published materials
        where.status = 'PUBLISHED';
        if (status && status !== 'DRAFT') {
          where.status = status;
        }
        break;

      case 'ADMIN':
        // Admins can see all materials
        if (status) where.status = status;
        if (clientId) where.clientId = clientId;
        break;

      default:
        // Other roles (VENDOR, TUKANG) cannot access materials
        return apiForbidden('Anda tidak memiliki akses ke data material');
    }

    // Add location filters
    if (cityId) {
      where.cityId = cityId;
    }
    if (provinceId) {
      where.city = { provinceId };
    }

    // Get total count
    const total = await db.material.count({ where });

    // Get materials with relations
    const materials = await db.material.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            province: {
              select: { id: true, name: true }
            }
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    // For suppliers, check if they have already made an offer
    let materialsWithOfferStatus: MaterialWithRelations[] = materials;

    if (user.role === 'SUPPLIER') {
      const materialIds = materials.map((m) => m.id);
      const existingOffers = await db.materialOffer.findMany({
        where: {
          materialId: { in: materialIds },
          supplierId: user.id,
        },
        select: {
          materialId: true,
          status: true,
        },
      });

      const offerMap = new Map(existingOffers.map((o) => [o.materialId, o.status]));
      materialsWithOfferStatus = materials.map((m) => ({
        ...m,
        hasOffered: offerMap.has(m.id),
        offerStatus: offerMap.get(m.id) || null,
      })) as MaterialWithRelations[];
    }

    const response: PaginatedResponse<MaterialWithRelations> = {
      data: materialsWithOfferStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return apiError('Terjadi kesalahan saat mengambil data material', 500);
  }
}

// POST /api/materials - Create a new material request
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk membuat permintaan material');
    }

    // Only CLIENT and ADMIN can create materials
    if (user.role !== 'CLIENT' && user.role !== 'ADMIN') {
      return apiForbidden('Hanya klien yang dapat membuat permintaan material');
    }

    const body = await request.json();

    // Validate input
    const validationResult = createMaterialSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return apiError(`Validasi gagal: ${errors}`, 400);
    }

    const data = validationResult.data;

    // If projectId is provided, verify the project belongs to the client
    if (data.projectId) {
      const project = await db.project.findFirst({
        where: {
          id: data.projectId,
          clientId: user.role === 'ADMIN' ? undefined : user.id,
        },
      });

      if (!project) {
        return apiError('Proyek tidak ditemukan atau Anda tidak memiliki akses', 404);
      }
    }

    // Create material
    const material = await db.material.create({
      data: {
        title: data.title,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        budget: data.budget,
        cityId: data.cityId,
        address: data.address,
        photos: data.photos,
        files: data.files,
        deadline: data.deadline ? new Date(data.deadline) : null,
        projectId: data.projectId || null,
        clientId: user.id,
        status: data.status || 'DRAFT',
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            province: {
              select: { id: true, name: true }
            }
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    // If status is PUBLISHED, create notifications for suppliers
    if (material.status === 'PUBLISHED') {
      const suppliers = await db.user.findMany({
        where: {
          role: 'SUPPLIER',
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      // Create notifications in batch
      if (suppliers.length > 0) {
        await db.notification.createMany({
          data: suppliers.map((supplier) => ({
            userId: supplier.id,
            type: 'MATERIAL_NEW',
            title: 'Permintaan Material Baru',
            message: `Permintaan material baru: ${material.title}`,
            data: JSON.stringify({ materialId: material.id }),
          })),
        });
      }
    }

    return apiSuccess(material, 201);
  } catch (error) {
    console.error('Error creating material:', error);
    return apiError('Terjadi kesalahan saat membuat permintaan material', 500);
  }
}
