import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - List all provinces
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCities = searchParams.get('includeCities') === 'true';
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default true

    const provinces = await db.province.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: includeCities ? {
        cities: {
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: { name: 'asc' }
        }
      } : undefined,
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: provinces
    });
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data provinsi' },
      { status: 500 }
    );
  }
}

// POST - Create new province (Admin only)
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
    const { name, code } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Nama provinsi wajib diisi' },
        { status: 400 }
      );
    }

    // Check if province already exists
    const existing = await db.province.findFirst({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Provinsi sudah ada' },
        { status: 400 }
      );
    }

    const province = await db.province.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null
      }
    });

    return NextResponse.json({
      success: true,
      data: province,
      message: 'Provinsi berhasil ditambahkan'
    });
  } catch (error) {
    console.error('Error creating province:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan provinsi' },
      { status: 500 }
    );
  }
}
