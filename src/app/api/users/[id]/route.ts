import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'VENDOR', 'TUKANG', 'SUPPLIER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  isVerified: z.boolean().optional(),
  verifiedAt: z.string().optional(),
  verifiedBy: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        ktpNumber: true,
        ktpPhoto: true,
        npwpNumber: true,
        address: true,
        city: {
          select: {
            id: true,
            name: true,
            province: { select: { id: true, name: true } },
          },
        },
        postalCode: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
        specialty: true,
        experience: true,
        description: true,
        rating: true,
        totalReviews: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projectsAsClient: true,
            projectsAsVendor: true,
            applications: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Only admin or the user themselves can update
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      return NextResponse.json(
        { error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Only admin can change role, status, verification
    if (currentUser.role !== 'ADMIN') {
      delete updateData.role;
      delete updateData.status;
      delete updateData.isVerified;
      delete updateData.verifiedAt;
      delete updateData.verifiedBy;
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...safeUser } = user;
    
    return NextResponse.json({ 
      message: 'User berhasil diperbarui',
      user: safeUser 
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent deleting self
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus akun sendiri' },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: 'User berhasil dihapus' 
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
