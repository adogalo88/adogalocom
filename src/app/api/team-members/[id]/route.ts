import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { TukangRole, SalaryType } from '@prisma/client';

// =====================
// VALIDATION SCHEMAS
// =====================

const updateTeamMemberSchema = z.object({
  role: z.nativeEnum(TukangRole, {
    errorMap: () => ({ message: 'Peran tukang tidak valid' }),
  }).optional(),
  salaryType: z.nativeEnum(SalaryType, {
    errorMap: () => ({ message: 'Tipe gaji tidak valid' }),
  }).optional(),
  salaryAmount: z.number().positive('Jumlah gaji harus positif').optional(),
  startDate: z.string().datetime({ message: 'Format tanggal mulai tidak valid' }).optional().nullable(),
  endDate: z.string().datetime({ message: 'Format tanggal selesai tidak valid' }).optional().nullable(),
  isActive: z.boolean().optional(),
});

// =====================
// GET: Single Team Member
// =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data anggota tim' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const teamMember = await db.teamMember.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            budget: true,
            location: true,
            startDate: true,
            endDate: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                phone: true,
              },
            },
            vendor: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                phone: true,
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
            phone: true,
            address: true,
            city: true,
            specialty: true,
            experience: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        salaryPayments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            paymentProof: true,
            paidAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            salaryPayments: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Anggota tim tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check access permissions
    const isTheMember = teamMember.userId === currentUser.id;
    const isProjectClient = teamMember.project.client.id === currentUser.id;
    const isProjectVendor = teamMember.project.vendor?.id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isTheMember && !isProjectClient && !isProjectVendor && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke data anggota tim ini' },
        { status: 403 }
      );
    }

    // If the user is the team member, only show limited info
    if (isTheMember && !isProjectClient && !isProjectVendor && !isAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          ...teamMember,
          salaryPayments: teamMember.salaryPayments.map((sp) => ({
            ...sp,
            paymentProof: sp.status === 'VERIFIED' ? sp.paymentProof : null,
          })),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: teamMember,
    });

  } catch (error) {
    console.error('Get team member error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// PATCH: Update Team Member
// =====================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah data anggota tim' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const teamMember = await db.teamMember.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            clientId: true,
            vendorId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Anggota tim tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const validationResult = updateTeamMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check permissions
    const isProjectClient = teamMember.project.clientId === currentUser.id;
    const isProjectVendor = teamMember.project.vendorId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isProjectClient && !isProjectVendor && !isAdmin) {
      return NextResponse.json(
        { error: 'Hanya klien proyek, vendor, atau admin yang dapat mengubah data anggota tim' },
        { status: 403 }
      );
    }

    // Validate dates if provided
    const startDate = updateData.startDate !== undefined 
      ? (updateData.startDate ? new Date(updateData.startDate) : null)
      : teamMember.startDate;
    const endDate = updateData.endDate !== undefined 
      ? (updateData.endDate ? new Date(updateData.endDate) : null)
      : teamMember.endDate;

    if (startDate && endDate && endDate <= startDate) {
      return NextResponse.json(
        { error: 'Tanggal selesai harus lebih besar dari tanggal mulai' },
        { status: 400 }
      );
    }

    // Build update data
    const dataToUpdate: Record<string, unknown> = {};
    
    if (updateData.role) dataToUpdate.role = updateData.role;
    if (updateData.salaryType) dataToUpdate.salaryType = updateData.salaryType;
    if (updateData.salaryAmount) dataToUpdate.salaryAmount = updateData.salaryAmount;
    if (updateData.startDate !== undefined) {
      dataToUpdate.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
    }
    if (updateData.endDate !== undefined) {
      dataToUpdate.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }
    if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive;

    // Update team member
    const updatedMember = await db.teamMember.update({
      where: { id },
      data: dataToUpdate,
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Create notification for status change (deactivation)
    if (updateData.isActive === false && teamMember.isActive) {
      await db.notification.create({
        data: {
          userId: teamMember.userId,
          type: 'PROJECT_REJECTED',
          title: 'Dikeluarkan dari Tim Proyek',
          message: `Anda telah dikeluarkan dari tim proyek "${teamMember.project.title}"`,
          data: JSON.stringify({ projectId: teamMember.project.id, teamMemberId: id }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Data anggota tim berhasil diperbarui',
      data: updatedMember,
    });

  } catch (error) {
    console.error('Update team member error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// DELETE: Remove Team Member
// =====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk menghapus anggota tim' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const teamMember = await db.teamMember.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            clientId: true,
            vendorId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Anggota tim tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check permissions
    const isProjectClient = teamMember.project.clientId === currentUser.id;
    const isProjectVendor = teamMember.project.vendorId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isProjectClient && !isProjectVendor && !isAdmin) {
      return NextResponse.json(
        { error: 'Hanya klien proyek, vendor, atau admin yang dapat menghapus anggota tim' },
        { status: 403 }
      );
    }

    // Check for pending salary payments
    const pendingPayments = await db.salaryPayment.count({
      where: {
        teamMemberId: id,
        status: 'PENDING',
      },
    });

    if (pendingPayments > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus anggota tim dengan pembayaran gaji yang masih pending' },
        { status: 400 }
      );
    }

    // Delete team member
    await db.teamMember.delete({
      where: { id },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: teamMember.userId,
        type: 'PROJECT_REJECTED',
        title: 'Dikeluarkan dari Tim Proyek',
        message: `Anda telah dikeluarkan dari tim proyek "${teamMember.project.title}"`,
        data: JSON.stringify({ projectId: teamMember.project.id }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Anggota tim berhasil dihapus',
    });

  } catch (error) {
    console.error('Delete team member error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
