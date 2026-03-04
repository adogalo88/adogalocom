import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Get single province
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeCities = searchParams.get('includeCities') === 'true';

    const province = await db.province.findUnique({
      where: { id },
      include: includeCities ? {
        cities: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      } : undefined
    });

    if (!province) {
      return NextResponse.json(
        { success: false, error: 'Provinsi tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: province
    });
  } catch (error) {
    console.error('Error fetching province:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data provinsi' },
      { status: 500 }
    );
  }
}

// PUT - Update province (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, code, isActive } = body;

    const province = await db.province.findUnique({
      where: { id }
    });

    if (!province) {
      return NextResponse.json(
        { success: false, error: 'Provinsi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if new name already exists (if changing name)
    if (name && name !== province.name) {
      const existing = await db.province.findFirst({
        where: { name: name.trim(), id: { not: id } }
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Nama provinsi sudah digunakan' },
          { status: 400 }
        );
      }
    }

    const updatedProvince = await db.province.update({
      where: { id },
      data: {
        name: name?.trim() || province.name,
        code: code !== undefined ? (code?.trim() || null) : province.code,
        isActive: isActive !== undefined ? isActive : province.isActive
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedProvince,
      message: 'Provinsi berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating province:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui provinsi' },
      { status: 500 }
    );
  }
}

// DELETE - Delete province (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const province = await db.province.findUnique({
      where: { id },
      include: { _count: { select: { cities: true } } }
    });

    if (!province) {
      return NextResponse.json(
        { success: false, error: 'Provinsi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if province has cities
    if (province._count.cities > 0) {
      return NextResponse.json(
        { success: false, error: 'Provinsi tidak dapat dihapus karena memiliki kota/kabupaten' },
        { status: 400 }
      );
    }

    await db.province.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Provinsi berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting province:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus provinsi' },
      { status: 500 }
    );
  }
}
