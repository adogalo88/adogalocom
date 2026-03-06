import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const postReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

// POST - Add or update review for portfolio (logged-in user, not owner)
export async function POST(
  request: NextRequest,
  context: { params?: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk memberi rating dan komentar' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const portfolioId = params?.id;
    if (!portfolioId) {
      return NextResponse.json({ error: 'ID portofolio wajib' }, { status: 400 });
    }

    const portfolio = await db.portfolio.findUnique({
      where: { id: portfolioId },
      select: { id: true, userId: true, user: { select: { role: true } } },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portofolio tidak ditemukan' }, { status: 404 });
    }
    if (portfolio.user.role !== 'TUKANG') {
      return NextResponse.json({ error: 'Portofolio tidak ditemukan' }, { status: 404 });
    }
    if (portfolio.userId === currentUser.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat memberi ulasan pada portofolio sendiri' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = postReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { rating, comment } = parsed.data;

    const review = await db.portfolioReview.upsert({
      where: {
        portfolioId_userId: { portfolioId, userId: currentUser.id },
      },
      create: {
        portfolioId,
        userId: currentUser.id,
        rating,
        comment: comment ?? null,
      },
      update: { rating, comment: comment ?? undefined },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: review.user,
      },
    });
  } catch (error) {
    console.error('Portfolio review POST error:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan ulasan' },
      { status: 500 }
    );
  }
}
