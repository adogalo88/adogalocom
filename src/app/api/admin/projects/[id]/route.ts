import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';
import { ProjectStatus, NotificationType } from '@prisma/client';

const verifySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

// PATCH - Verify or reject a project
export const PATCH = withRole(['ADMIN'], async (user: SafeUser, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const validationResult = verifySchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const { action, rejectionReason } = validationResult.data;

    const project = await db.project.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true, email: true } } },
    });

    if (!project) {
      return apiError('Proyek tidak ditemukan', 404);
    }

    if (project.status !== 'PENDING_VERIFICATION') {
      return apiError('Proyek tidak dalam status menunggu verifikasi', 400);
    }

    if (action === 'APPROVE') {
      const updatedProject = await db.project.update({
        where: { id },
        data: {
          status: ProjectStatus.PUBLISHED,
          verifiedAt: new Date(),
          verifiedBy: user.id,
        },
      });

      // Create notification for client
      await db.notification.create({
        data: {
          userId: project.clientId,
          type: NotificationType.PROJECT_VERIFIED,
          title: 'Proyek Disetujui',
          message: `Proyek "${project.title}" telah disetujui dan dipublikasikan.`,
          data: JSON.stringify({ projectId: id }),
        },
      });

      return apiSuccess({
        message: 'Proyek berhasil diverifikasi dan dipublikasikan',
        project: updatedProject,
      });
    } else {
      if (!rejectionReason) {
        return apiError('Alasan penolakan harus diisi', 400);
      }

      const updatedProject = await db.project.update({
        where: { id },
        data: {
          status: ProjectStatus.REJECTED,
          rejectionReason,
          verifiedAt: new Date(),
          verifiedBy: user.id,
        },
      });

      // Create notification for client
      await db.notification.create({
        data: {
          userId: project.clientId,
          type: NotificationType.PROJECT_REJECTED_ADMIN,
          title: 'Proyek Ditolak',
          message: `Proyek "${project.title}" ditolak. Alasan: ${rejectionReason}`,
          data: JSON.stringify({ projectId: id, reason: rejectionReason }),
        },
      });

      return apiSuccess({
        message: 'Proyek telah ditolak',
        project: updatedProject,
      });
    }
  } catch (error) {
    console.error('Verify project error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// DELETE - Delete a project (admin only)
export const DELETE = withRole(['ADMIN'], async (user: SafeUser, request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      return apiError('Proyek tidak ditemukan', 404);
    }

    await db.project.delete({
      where: { id },
    });

    return apiSuccess({ message: 'Proyek berhasil dihapus' });
  } catch (error) {
    console.error('Delete project error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
