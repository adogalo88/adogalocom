import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - List all cities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get('provinceId');
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default true

    const cities = await db.city.findMany({
      where: {
        ...(provinceId ? { provinceId } : {}),
        ...(activeOnly ? { isActive: true } : {})
      },
      include: {
        province: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { province: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data kota' },
      { status: 500 }
    );
  }
}

// POST - Create new city (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, provinceId } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Nama kota wajib diisi' },
        { status: 400 }
      );
    }

    if (!provinceId) {
      return NextResponse.json(
        { success: false, error: 'Provinsi wajib dipilih' },
        { status: 400 }
      );
    }

    // Check if province exists
    const province = await db.province.findUnique({
      where: { id: provinceId }
    });

    if (!province) {
      return NextResponse.json(
        { success: false, error: 'Provinsi tidak ditemukan' },
        { status: 400 }
      );
    }

    // Check if city already exists in this province
    const existing = await db.city.findFirst({
      where: { name: name.trim(), provinceId }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Kota sudah ada di provinsi ini' },
        { status: 400 }
      );
    }

    const city = await db.city.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        provinceId
      },
      include: {
        province: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: city,
      message: 'Kota berhasil ditambahkan'
    });
  } catch (error) {
    console.error('Error creating city:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan kota' },
      { status: 500 }
    );
  }
}
