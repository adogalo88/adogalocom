import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ApplicationStatus, UserRole } from '@prisma/client';
import { TransactionType } from '@prisma/client';

// Validation schema for updating application status
const updateApplicationSchema = z.object({
  status: z.nativeEnum(['ACCEPTED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status harus ACCEPTED atau REJECTED' }),
  }),
  rejectionReason: z.string().max(500, 'Alasan penolakan maksimal 500 karakter').optional(),
});

// GET /api/applications/[id] - Get single application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data lamaran' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get application with relations
    const application = await db.application.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            status: true,
            budget: true,
            location: true,
            workerNeeded: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                phone: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            phone: true,
            specialty: true,
            experience: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
            address: true,
            city: true,
            province: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Lamaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check access permission
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isApplicant = application.userId === currentUser.id;
    const isProjectOwner = application.project.clientId === currentUser.id;

    if (!isAdmin && !isApplicant && !isProjectOwner) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke lamaran ini' },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: application });
  } catch (error) {
    console.error('Get application error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// PATCH /api/applications/[id] - Update application status (accept/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah status lamaran' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the application
    const application = await db.application.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            clientId: true,
            status: true,
            vendorId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Lamaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check permission - only ADMIN or project owner (CLIENT) can update status
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isProjectOwner = application.project.clientId === currentUser.id;

    if (!isAdmin && !isProjectOwner) {
      return NextResponse.json(
        { error: 'Hanya pemilik proyek atau admin yang dapat mengubah status lamaran' },
        { status: 403 }
      );
    }

    // Check if application is still pending
    if (application.status !== ApplicationStatus.PENDING) {
      return NextResponse.json(
        { error: `Lamaran sudah dalam status ${application.status.toLowerCase()} dan tidak dapat diubah` },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateApplicationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status, rejectionReason } = validationResult.data;
    const newStatus = status as ApplicationStatus;

    // If accepting, check if project already has a vendor
    if (newStatus === ApplicationStatus.ACCEPTED && application.project.vendorId) {
      return NextResponse.json(
        { error: 'Proyek ini sudah memiliki vendor yang diterima' },
        { status: 400 }
      );
    }

    // Use transaction for atomic operations
    const result = await db.$transaction(async (tx) => {
      // Update application status
      const updatedApplication = await tx.application.update({
        where: { id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              status: true,
              budget: true,
              location: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              specialty: true,
              rating: true,
              totalReviews: true,
              isVerified: true,
            },
          },
        },
      });

      // If accepting, update project with vendor and reject other pending applications
      if (newStatus === ApplicationStatus.ACCEPTED) {
        // Update project with vendor
        await tx.project.update({
          where: { id: application.projectId },
          data: {
            vendorId: application.userId,
            acceptedAt: new Date(),
            status: 'IN_PROGRESS',
          },
        });

        // Reject all other pending applications for this project
        await tx.application.updateMany({
          where: {
            projectId: application.projectId,
            status: ApplicationStatus.PENDING,
            id: { not: id },
          },
          data: {
            status: ApplicationStatus.REJECTED,
            updatedAt: new Date(),
          },
        });
      }

      return updatedApplication;
    });

    // Create notification for the applicant
    const notificationType = newStatus === ApplicationStatus.ACCEPTED 
      ? 'PROJECT_ACCEPTED' 
      : 'PROJECT_REJECTED';
    
    const notificationMessage = newStatus === ApplicationStatus.ACCEPTED
      ? `Selamat! Lamaran Anda untuk proyek "${application.project.title}" telah diterima`
      : `Lamaran Anda untuk proyek "${application.project.title}" telah ditolak${rejectionReason ? `: ${rejectionReason}` : ''}`;

    await db.notification.create({
      data: {
        userId: application.userId,
        type: notificationType,
        title: newStatus === ApplicationStatus.ACCEPTED ? 'Lamaran Diterima' : 'Lamaran Ditolak',
        message: notificationMessage,
        data: JSON.stringify({
          applicationId: id,
          projectId: application.projectId,
          projectName: application.project.title,
          status: newStatus,
          rejectionReason,
        }),
      },
    });

    // If accepted (tender): buat transaksi pembayaran proyek sebagai dasar pendapatan vendor
    if (newStatus === ApplicationStatus.ACCEPTED && application.user.role === UserRole.VENDOR) {
      const amount = application.proposedBudget ?? 0;
      if (amount > 0) {
        await db.transaction.create({
          data: {
            userId: application.project.clientId,
            projectId: application.projectId,
            type: TransactionType.PROJECT_PAYMENT,
            amount,
            fee: 0,
            total: amount,
            status: 'PENDING',
          },
        });
      }
    }

    // If accepted, also create team member record for TUKANG role
    if (newStatus === ApplicationStatus.ACCEPTED && application.user.role === UserRole.TUKANG) {
      // Note: Team member creation would require additional data like role and salary
      // This could be handled in a separate step or with additional input
    }

    return NextResponse.json({
      message: newStatus === ApplicationStatus.ACCEPTED 
        ? 'Lamaran berhasil diterima' 
        : 'Lamaran berhasil ditolak',
      data: result,
    });
  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Withdraw application (for applicants)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk menarik lamaran' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the application
    const application = await db.application.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Lamaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Only the applicant or ADMIN can withdraw
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isApplicant = application.userId === currentUser.id;

    if (!isAdmin && !isApplicant) {
      return NextResponse.json(
        { error: 'Hanya pelamar yang dapat menarik lamaran' },
        { status: 403 }
      );
    }

    // Can only withdraw if status is PENDING
    if (application.status !== ApplicationStatus.PENDING) {
      return NextResponse.json(
        { error: 'Hanya lamaran dengan status PENDING yang dapat ditarik' },
        { status: 400 }
      );
    }

    // Update status to WITHDRAWN
    const updatedApplication = await db.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.WITHDRAWN,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Lamaran berhasil ditarik',
      data: updatedApplication,
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
