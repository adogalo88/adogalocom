import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET - Get single city
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const city = await db.city.findUnique({
      where: { id },
      include: {
        province: {
          select: { id: true, name: true }
        }
      }
    });

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'Kota tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: city
    });
  } catch (error) {
    console.error('Error fetching city:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data kota' },
      { status: 500 }
    );
  }
}

// PUT - Update city (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyToken(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, code, provinceId, isActive } = body;

    const city = await db.city.findUnique({
      where: { id }
    });

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'Kota tidak ditemukan' },
        { status: 404 }
      );
    }

    // If changing province, verify it exists
    if (provinceId && provinceId !== city.provinceId) {
      const province = await db.province.findUnique({
        where: { id: provinceId }
      });

      if (!province) {
        return NextResponse.json(
          { success: false, error: 'Provinsi tidak ditemukan' },
          { status: 400 }
        );
      }
    }

    // Check if new name already exists in province (if changing name or province)
    const targetProvinceId = provinceId || city.provinceId;
    const targetName = name?.trim() || city.name;

    if (targetName !== city.name || targetProvinceId !== city.provinceId) {
      const existing = await db.city.findFirst({
        where: {
          name: targetName,
          provinceId: targetProvinceId,
          id: { not: id }
        }
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Kota sudah ada di provinsi ini' },
          { status: 400 }
        );
      }
    }

    const updatedCity = await db.city.update({
      where: { id },
      data: {
        name: name?.trim() || city.name,
        code: code !== undefined ? (code?.trim() || null) : city.code,
        provinceId: provinceId || city.provinceId,
        isActive: isActive !== undefined ? isActive : city.isActive
      },
      include: {
        province: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedCity,
      message: 'Kota berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating city:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui kota' },
      { status: 500 }
    );
  }
}

// DELETE - Delete city (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyToken(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const city = await db.city.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } }
    });

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'Kota tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if city has users
    if (city._count.users > 0) {
      return NextResponse.json(
        { success: false, error: 'Kota tidak dapat dihapus karena memiliki pengguna terdaftar' },
        { status: 400 }
      );
    }

    await db.city.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Kota berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting city:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus kota' },
      { status: 500 }
    );
  }
}
