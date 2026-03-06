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
import { MaterialStatus } from '@prisma/client';

// Validation schema for update
const updateMaterialSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200, 'Judul maksimal 200 karakter').optional(),
  description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional().nullable(),
  quantity: z.number().int().positive('Jumlah harus bilangan bulat positif').optional(),
  unit: z.string().min(1, 'Satuan wajib diisi').max(50, 'Satuan maksimal 50 karakter').optional(),
  budget: z.number().positive('Budget harus bernilai positif').optional().nullable(),
  location: z.string().max(200, 'Lokasi maksimal 200 karakter').optional().nullable(),
  deadline: z.string().datetime('Format deadline tidak valid').optional().nullable(),
  projectId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED']).optional(),
});

// GET /api/materials/[id] - Get single material
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengakses data material');
    }

    const { id } = await params;

    const material = await db.material.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            city: true,
            province: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        offers: {
          select: {
            id: true,
            price: true,
            notes: true,
            status: true,
            createdAt: true,
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                city: true,
                rating: true,
                totalReviews: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            offers: true,
          },
        },
      },
    });

    if (!material) {
      return apiNotFound('Material tidak ditemukan');
    }

    // Check access permissions
    const isOwner = material.clientId === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isSupplier = user.role === 'SUPPLIER';
    const isPublished = material.status === 'PUBLISHED';

    // Clients can only see their own materials
    if (user.role === 'CLIENT' && !isOwner) {
      return apiForbidden('Anda tidak memiliki akses ke material ini');
    }

    // Suppliers can only see published materials
    if (isSupplier && !isPublished && !isAdmin) {
      return apiForbidden('Material ini belum dipublikasikan');
    }

    // Other roles cannot access
    if (user.role !== 'CLIENT' && user.role !== 'SUPPLIER' && user.role !== 'ADMIN') {
      return apiForbidden('Anda tidak memiliki akses ke material ini');
    }

    // For suppliers, mark if they have already made an offer
    let userOffer = null;
    if (isSupplier) {
      userOffer = await db.materialOffer.findFirst({
        where: {
          materialId: id,
          supplierId: user.id,
        },
      });

      // Hide other suppliers' offer details for suppliers (only show count)
      if (!isOwner && !isAdmin) {
        material.offers = material.offers.map((offer) => ({
          ...offer,
          price: offer.supplierId === user.id ? offer.price : 0,
          notes: offer.supplierId === user.id ? offer.notes : null,
          supplier: {
            ...offer.supplier,
            name: offer.supplierId === user.id ? offer.supplier.name : 'Supplier',
            email: offer.supplierId === user.id ? offer.supplier.email : '',
            phone: offer.supplierId === user.id ? offer.supplier.phone : null,
          },
        })) as typeof material.offers;
      }
    }

    // For clients, only show their own materials with all offer details
    // Admins can see everything

    return apiSuccess({
      ...material,
      userOffer,
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    return apiError('Terjadi kesalahan saat mengambil data material', 500);
  }
}

// PATCH /api/materials/[id] - Update material
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengubah material');
    }

    const { id } = await params;

    // Get existing material
    const existingMaterial = await db.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: { offers: true },
        },
      },
    });

    if (!existingMaterial) {
      return apiNotFound('Material tidak ditemukan');
    }

    // Hanya admin yang boleh edit material. Client tidak bisa edit.
    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin) {
      return apiForbidden('Hanya admin yang dapat mengubah permintaan material');
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateMaterialSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return apiError(`Validasi gagal: ${errors}`, 400);
    }

    const data = validationResult.data;

    // Business rules for status transitions
    if (data.status) {
      const currentStatus = existingMaterial.status;
      const newStatus = data.status as MaterialStatus;

      // Cannot change from CANCELLED or FULFILLED
      if (currentStatus === 'CANCELLED' || currentStatus === 'FULFILLED') {
        return apiError(`Material dengan status ${currentStatus} tidak dapat diubah`, 400);
      }

      // If changing to PUBLISHED, notify suppliers
      if (currentStatus === 'DRAFT' && newStatus === 'PUBLISHED') {
        const suppliers = await db.user.findMany({
          where: {
            role: 'SUPPLIER',
            status: 'ACTIVE',
          },
          select: { id: true },
        });

        if (suppliers.length > 0) {
          await db.notification.createMany({
            data: suppliers.map((supplier) => ({
              userId: supplier.id,
              type: 'MATERIAL_NEW',
              title: 'Permintaan Material Baru',
              message: `Permintaan material baru: ${existingMaterial.title}`,
              data: JSON.stringify({ materialId: existingMaterial.id }),
            })),
          });
        }
      }

      // If material has offers, some restrictions apply
      if (existingMaterial._count.offers > 0) {
        // Cannot change back to DRAFT if there are offers
        if (newStatus === 'DRAFT') {
          return apiError('Material yang sudah memiliki penawaran tidak dapat diubah menjadi draft', 400);
        }
      }
    }

    // If projectId is provided, verify access
    if (data.projectId !== undefined && data.projectId !== null) {
      const project = await db.project.findFirst({
        where: {
          id: data.projectId,
          clientId: isAdmin ? undefined : user.id,
        },
      });

      if (!project) {
        return apiError('Proyek tidak ditemukan atau Anda tidak memiliki akses', 404);
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.status !== undefined) updateData.status = data.status;

    // Update material
    const material = await db.material.update({
      where: { id },
      data: updateData,
      include: {
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

    return apiSuccess(material);
  } catch (error) {
    console.error('Error updating material:', error);
    return apiError('Terjadi kesalahan saat mengubah material', 500);
  }
}

// DELETE /api/materials/[id] - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk menghapus material');
    }

    const { id } = await params;

    // Get existing material
    const existingMaterial = await db.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: { offers: true },
        },
      },
    });

    if (!existingMaterial) {
      return apiNotFound('Material tidak ditemukan');
    }

    // Hanya admin yang boleh menghapus material
    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin) {
      return apiForbidden('Hanya admin yang dapat menghapus permintaan material');
    }

    // Business rules
    // Cannot delete if status is IN_PROGRESS
    if (existingMaterial.status === 'IN_PROGRESS') {
      return apiError('Material yang sedang berjalan tidak dapat dihapus', 400);
    }

    // Cannot delete if there are accepted offers
    const acceptedOffers = await db.materialOffer.count({
      where: {
        materialId: id,
        status: 'ACCEPTED',
      },
    });

    if (acceptedOffers > 0) {
      return apiError('Material yang memiliki penawaran yang diterima tidak dapat dihapus', 400);
    }

    // Delete material (cascade will delete offers)
    await db.material.delete({
      where: { id },
    });

    return apiSuccess({ message: 'Material berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting material:', error);
    return apiError('Terjadi kesalahan saat menghapus material', 500);
  }
}
