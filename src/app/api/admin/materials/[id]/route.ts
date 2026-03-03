import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';
import { MaterialStatus, NotificationType } from '@prisma/client';

const verifySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

// PATCH - Verify or reject a material
export const PATCH = withRole(['ADMIN'], async (user: SafeUser, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const validationResult = verifySchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const { action, rejectionReason } = validationResult.data;

    const material = await db.material.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true, email: true } } },
    });

    if (!material) {
      return apiError('Material tidak ditemukan', 404);
    }

    if (material.status !== 'PENDING_VERIFICATION') {
      return apiError('Material tidak dalam status menunggu verifikasi', 400);
    }

    if (action === 'APPROVE') {
      const updatedMaterial = await db.material.update({
        where: { id },
        data: {
          status: MaterialStatus.PUBLISHED,
          verifiedAt: new Date(),
          verifiedBy: user.id,
        },
      });

      // Create notification for requester
      await db.notification.create({
        data: {
          userId: material.clientId,
          type: NotificationType.MATERIAL_VERIFIED,
          title: 'Permintaan Material Disetujui',
          message: `Permintaan material "${material.title}" telah disetujui dan dipublikasikan.`,
          data: JSON.stringify({ materialId: id }),
        },
      });

      // Notify all suppliers about new material
      const suppliers = await db.user.findMany({
        where: { role: 'SUPPLIER', status: 'ACTIVE' },
        select: { id: true },
      });

      for (const supplier of suppliers) {
        await db.notification.create({
          data: {
            userId: supplier.id,
            type: NotificationType.MATERIAL_NEW,
            title: 'Permintaan Material Baru',
            message: `Permintaan material baru: "${material.title}"`,
            data: JSON.stringify({ materialId: id }),
          },
        });
      }

      return apiSuccess({
        message: 'Material berhasil diverifikasi dan dipublikasikan',
        material: updatedMaterial,
      });
    } else {
      if (!rejectionReason) {
        return apiError('Alasan penolakan harus diisi', 400);
      }

      const updatedMaterial = await db.material.update({
        where: { id },
        data: {
          status: MaterialStatus.REJECTED,
          rejectionReason,
          verifiedAt: new Date(),
          verifiedBy: user.id,
        },
      });

      // Create notification for requester
      await db.notification.create({
        data: {
          userId: material.clientId,
          type: NotificationType.MATERIAL_REJECTED_ADMIN,
          title: 'Permintaan Material Ditolak',
          message: `Permintaan material "${material.title}" ditolak. Alasan: ${rejectionReason}`,
          data: JSON.stringify({ materialId: id, reason: rejectionReason }),
        },
      });

      return apiSuccess({
        message: 'Material telah ditolak',
        material: updatedMaterial,
      });
    }
  } catch (error) {
    console.error('Verify material error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// DELETE - Delete a material (admin only)
export const DELETE = withRole(['ADMIN'], async (user: SafeUser, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    const material = await db.material.findUnique({
      where: { id },
    });

    if (!material) {
      return apiError('Material tidak ditemukan', 404);
    }

    await db.material.delete({
      where: { id },
    });

    return apiSuccess({ message: 'Material berhasil dihapus' });
  } catch (error) {
    console.error('Delete material error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
