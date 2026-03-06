import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, withRole, SafeUser } from '@/lib/api-utils';
import { ProjectStatus, MaterialStatus, NotificationType } from '@prisma/client';

// GET - List pending verifications
export const GET = withRole(['ADMIN'], async (user: SafeUser, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'projects', 'materials', 'all'
    const status = searchParams.get('status') || 'PENDING_VERIFICATION';

    const result: {
      projects?: unknown[];
      materials?: unknown[];
    } = {};

    if (type === 'all' || type === 'projects') {
      result.projects = await db.project.findMany({
        where: {
          status: status as ProjectStatus,
        },
        include: {
          client: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          category: { select: { id: true, name: true } },
          _count: { select: { applications: true } },
          rfq: {
            include: {
              items: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (type === 'all' || type === 'materials') {
      result.materials = await db.material.findMany({
        where: {
          status: status as MaterialStatus,
        },
        include: {
          client: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          project: { select: { id: true, title: true } },
          _count: { select: { offers: true, rfqItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Users menunggu verifikasi (isVerified = false)
    const pendingUsers = await db.user.findMany({
      where: { isVerified: false, role: { not: 'ADMIN' } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        isVerified: true,
        ktpPhoto: true,
        experience: true,
        verificationEntityType: true,
        picName: true,
        picPhone: true,
        picKtpPhoto: true,
        nibDoc: true,
        npwpDoc: true,
        aktaPendirianDoc: true,
        siupDoc: true,
        skckDoc: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const counts = {
      pendingProjects: await db.project.count({
        where: { status: 'PENDING_VERIFICATION' },
      }),
      pendingMaterials: await db.material.count({
        where: { status: 'PENDING_VERIFICATION' },
      }),
      rejectedProjects: await db.project.count({
        where: { status: 'REJECTED' },
      }),
      rejectedMaterials: await db.material.count({
        where: { status: 'REJECTED' },
      }),
      pendingUsers: pendingUsers.length,
    };

    return apiSuccess({
      success: true,
      data: {
        ...result,
        counts,
        pendingUsers,
      },
    });
  } catch (error) {
    console.error('Get verifications error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
