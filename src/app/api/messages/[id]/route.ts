import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// =====================
// VALIDATION SCHEMAS
// =====================

const updateMessageSchema = z.object({
  isRead: z.boolean().optional(),
});

// =====================
// GET: Single Message
// =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses pesan' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const message = await db.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            isVerified: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            isVerified: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Pesan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check access permissions
    const isSender = message.senderId === currentUser.id;
    const isReceiver = message.receiverId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isSender && !isReceiver && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke pesan ini' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: message,
    });

  } catch (error) {
    console.error('Get message error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// PATCH: Update Message (Mark as Read)
// =====================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah status pesan' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const message = await db.message.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Pesan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Only receiver can mark message as read
    if (message.receiverId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya penerima yang dapat menandai pesan sebagai sudah dibaca' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validationResult = updateMessageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Build update data
    const dataToUpdate: Record<string, unknown> = {};
    
    if (updateData.isRead === true && !message.isRead) {
      dataToUpdate.isRead = true;
      dataToUpdate.readAt = new Date();
    } else if (updateData.isRead === false) {
      dataToUpdate.isRead = false;
      dataToUpdate.readAt = null;
    }

    // Update message
    const updatedMessage = await db.message.update({
      where: { id },
      data: dataToUpdate,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Status pesan berhasil diperbarui',
      data: updatedMessage,
    });

  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// DELETE: Delete Message (Optional - soft delete could be implemented)
// =====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk menghapus pesan' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const message = await db.message.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Pesan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Only sender, receiver, or admin can delete
    const isSender = message.senderId === currentUser.id;
    const isReceiver = message.receiverId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isSender && !isReceiver && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk menghapus pesan ini' },
        { status: 403 }
      );
    }

    // Delete message
    await db.message.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Pesan berhasil dihapus',
    });

  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
