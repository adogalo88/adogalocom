import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, icon } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nama kategori minimal 2 karakter' },
        { status: 400 }
      );
    }

    const existing = await db.category.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Kategori sudah ada' },
        { status: 409 }
      );
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        description,
        icon,
      },
    });

    return NextResponse.json({ 
      message: 'Kategori berhasil dibuat',
      category 
    }, { status: 201 });

  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
