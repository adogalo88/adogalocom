import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Public profile for a verified tukang (no auth required)
export async function GET(
  _request: NextRequest,
  context: { params?: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID wajib' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: {
        id,
        role: 'TUKANG',
        isVerified: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        description: true,
        specialty: true,
        experience: true,
        skills: { select: { id: true, name: true } },
        phone: true,
        rating: true,
        totalReviews: true,
        totalProjects: true,
        address: true,
        city: {
          select: {
            id: true,
            name: true,
            province: { select: { id: true, name: true } },
          },
        },
        portfolio: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviewsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: {
              select: { id: true, name: true, avatar: true },
            },
            project: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tukang tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Directory tukang profile error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data tukang' },
      { status: 500 }
    );
  }
}
