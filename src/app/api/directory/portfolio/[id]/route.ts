import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  context: { params?: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID portofolio wajib' }, { status: 400 });
    }

    const portfolio = await db.portfolio.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        city: {
          select: { id: true, name: true, province: { select: { id: true, name: true } } },
        },
        project: {
          select: { id: true, title: true, status: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portofolio tidak ditemukan' }, { status: 404 });
    }

    if (portfolio.user.role !== 'TUKANG') {
      return NextResponse.json({ error: 'Portofolio tidak ditemukan' }, { status: 404 });
    }

    let images: string[] = [];
    try {
      const parsed = JSON.parse(portfolio.images);
      images = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      images = [];
    }

    const reviews = portfolio.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      user: r.user,
    }));

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null;

    return NextResponse.json({
      success: true,
      data: {
        id: portfolio.id,
        userId: portfolio.userId,
        title: portfolio.title,
        description: portfolio.description,
        images,
        projectId: portfolio.projectId,
        completedYear: portfolio.completedYear,
        cityId: portfolio.cityId,
        createdAt: portfolio.createdAt,
        user: portfolio.user,
        city: portfolio.city,
        project: portfolio.project,
        reviews,
        averageRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error('Directory portfolio GET error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data portofolio' },
      { status: 500 }
    );
  }
}
