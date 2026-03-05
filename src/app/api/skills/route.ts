import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const skills = await db.skill.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { users: true, projects: true },
        },
      },
    });
    return NextResponse.json({ success: true, skills });
  } catch (error) {
    console.error('Get skills error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, sortOrder } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nama keahlian minimal 2 karakter' },
        { status: 400 }
      );
    }

    const existing = await db.skill.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Keahlian dengan nama ini sudah ada' },
        { status: 409 }
      );
    }

    const skill = await db.skill.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    return NextResponse.json({ success: true, skill }, { status: 201 });
  } catch (error) {
    console.error('Create skill error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
