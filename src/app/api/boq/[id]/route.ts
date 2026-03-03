import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BOQStatus } from '@prisma/client';

// =====================
// VALIDATION SCHEMAS
// =====================

const updateBoqSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200, 'Judul maksimal 200 karakter').optional(),
  description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional(),
  items: z.array(z.object({
    name: z.string().min(1, 'Nama item wajib diisi'),
    description: z.string().optional(),
    quantity: z.number().positive('Jumlah harus positif'),
    unit: z.string().min(1, 'Satuan wajib diisi'),
    unitPrice: z.number().nonnegative('Harga satuan tidak boleh negatif'),
  })).min(1, 'Minimal 1 item BOQ diperlukan').optional(),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
  status: z.nativeEnum(BOQStatus).optional(),
  rejectionReason: z.string().max(500, 'Alasan penolakan maksimal 500 karakter').optional(),
});

// Valid status transitions
const validTransitions: Record<BOQStatus, BOQStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['ACCEPTED', 'REJECTED', 'DRAFT'],
  ACCEPTED: [],
  REJECTED: ['DRAFT'],
};

// =====================
// GET: Single BOQ
// =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data BOQ' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const boq = await db.bOQ.findUnique({
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
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                phone: true,
                role: true,
              },
            },
            vendor: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                rating: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            role: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
      },
    });

    if (!boq) {
      return NextResponse.json(
        { error: 'BOQ tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check access permissions
    const isOwner = boq.vendorId === currentUser.id;
    const isProjectClient = boq.project.client.id === currentUser.id;
    const isProjectVendor = boq.project.vendor?.id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwner && !isProjectClient && !isProjectVendor && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke BOQ ini' },
        { status: 403 }
      );
    }

    // Parse items JSON
    const boqWithItems = {
      ...boq,
      items: JSON.parse(boq.items),
    };

    return NextResponse.json({
      success: true,
      data: boqWithItems,
    });

  } catch (error) {
    console.error('Get BOQ error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// PATCH: Update BOQ
// =====================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah BOQ' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const boq = await db.bOQ.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            clientId: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
        vendor: {
          select: { id: true, name: true },
        },
      },
    });

    if (!boq) {
      return NextResponse.json(
        { error: 'BOQ tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const validationResult = updateBoqSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    const isOwner = boq.vendorId === currentUser.id;
    const isProjectClient = boq.project.clientId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    // Handle status updates (accept/reject) - only client or admin
    if (updateData.status) {
      if (!isProjectClient && !isAdmin) {
        return NextResponse.json(
          { error: 'Hanya klien proyek atau admin yang dapat mengubah status BOQ' },
          { status: 403 }
        );
      }

      // Check if status transition is valid
      const allowedTransitions = validTransitions[boq.status];
      if (!allowedTransitions.includes(updateData.status)) {
        return NextResponse.json(
          { error: `Tidak dapat mengubah status dari ${boq.status} ke ${updateData.status}` },
          { status: 400 }
        );
      }

      // Handle rejection
      if (updateData.status === 'REJECTED' && !updateData.rejectionReason) {
        return NextResponse.json(
          { error: 'Alasan penolakan wajib diisi saat menolak BOQ' },
          { status: 400 }
        );
      }
    }

    // Handle content updates - only owner or admin
    if (updateData.items || updateData.title || updateData.description || updateData.notes) {
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { error: 'Hanya pemilik BOQ atau admin yang dapat mengubah konten' },
          { status: 403 }
        );
      }

      // Can only edit DRAFT BOQs
      if (boq.status !== 'DRAFT' && !isAdmin) {
        return NextResponse.json(
          { error: 'Hanya BOQ dengan status DRAFT yang dapat diubah' },
          { status: 400 }
        );
      }
    }

    // Calculate new total price if items updated
    let totalPrice = boq.totalPrice;
    if (updateData.items) {
      totalPrice = updateData.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
    }

    // Build update data
    const dataToUpdate: Record<string, unknown> = {};
    
    if (updateData.title) dataToUpdate.title = updateData.title;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.items) {
      dataToUpdate.items = JSON.stringify(updateData.items);
      dataToUpdate.totalPrice = totalPrice;
    }
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
    if (updateData.status) dataToUpdate.status = updateData.status;

    // Update BOQ
    const updatedBoq = await db.bOQ.update({
      where: { id },
      data: dataToUpdate,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Create notifications for status changes
    if (updateData.status) {
      // Notify vendor about status change
      await db.notification.create({
        data: {
          userId: boq.vendorId,
          type: updateData.status === 'ACCEPTED' ? 'PROJECT_ACCEPTED' : 'PROJECT_REJECTED',
          title: updateData.status === 'ACCEPTED' ? 'BOQ Diterima' : 'BOQ Ditolak',
          message: updateData.status === 'ACCEPTED'
            ? `BOQ "${boq.title}" untuk proyek "${boq.project.title}" telah diterima`
            : `BOQ "${boq.title}" untuk proyek "${boq.project.title}" ditolak: ${updateData.rejectionReason || 'Tidak ada alasan'}`,
          data: JSON.stringify({ boqId: id, projectId: boq.project.id, status: updateData.status }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'BOQ berhasil diperbarui',
      data: {
        ...updatedBoq,
        items: updateData.items || JSON.parse(boq.items),
      },
    });

  } catch (error) {
    console.error('Update BOQ error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// DELETE: Delete BOQ
// =====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk menghapus BOQ' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const boq = await db.bOQ.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            clientId: true,
          },
        },
      },
    });

    if (!boq) {
      return NextResponse.json(
        { error: 'BOQ tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = boq.vendorId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Hanya pemilik BOQ atau admin yang dapat menghapus' },
        { status: 403 }
      );
    }

    // Can only delete DRAFT or REJECTED BOQs
    if (boq.status !== 'DRAFT' && boq.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Hanya BOQ dengan status DRAFT atau REJECTED yang dapat dihapus' },
        { status: 400 }
      );
    }

    // Delete BOQ
    await db.bOQ.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'BOQ berhasil dihapus',
    });

  } catch (error) {
    console.error('Delete BOQ error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
