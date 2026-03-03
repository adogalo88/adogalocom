import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { SafeUser } from '@/lib/auth';
import { apiSuccess, apiError, apiNotFound, apiForbidden, withAuth, createNotification } from '@/lib/api-utils';

// =====================
// VALIDATION SCHEMAS
// =====================

const updateReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5').optional(),
  comment: z.string().min(10, 'Komentar minimal 10 karakter').max(1000, 'Komentar maksimal 1000 karakter').optional(),
});

// =====================
// HELPER FUNCTIONS
// =====================

function canModifyReview(user: SafeUser, review: { reviewerId: string }): boolean {
  // Admin can modify any review
  if (user.role === 'ADMIN') return true;
  // Reviewer can modify their own review
  return user.id === review.reviewerId;
}

// =====================
// GET: Get Review by ID
// =====================

export const GET = withAuth(async (user: SafeUser, request: NextRequest, context) => {
  try {
    const params = await context?.params;
    const reviewId = params?.id as string;

    if (!reviewId) {
      return apiError('ID review tidak valid', 400);
    }

    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!review) {
      return apiNotFound('Review tidak ditemukan');
    }

    return apiSuccess({ data: review });
  } catch (error) {
    console.error('Get review error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// =====================
// PATCH: Update Review
// =====================

export const PATCH = withAuth(async (user: SafeUser, request: NextRequest, context) => {
  try {
    const params = await context?.params;
    const reviewId = params?.id as string;

    if (!reviewId) {
      return apiError('ID review tidak valid', 400);
    }

    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      return apiNotFound('Review tidak ditemukan');
    }

    // Check modify permission
    if (!canModifyReview(user, review)) {
      return apiForbidden('Anda tidak memiliki akses untuk mengubah review ini');
    }

    const body = await request.json();

    const validationResult = updateReviewSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const updateData = validationResult.data;

    // Filter out undefined values
    const dataToUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(dataToUpdate).length === 0) {
      return apiError('Tidak ada data yang diperbarui', 400);
    }

    // Update review and recalculate rating if needed
    const updatedReview = await db.$transaction(async (tx) => {
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: dataToUpdate,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          reviewee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Recalculate reviewee's rating if rating was changed
      if (updateData.rating !== undefined) {
        const allReviews = await tx.review.findMany({
          where: { revieweeId: review.revieweeId },
          select: { rating: true },
        });

        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

        await tx.user.update({
          where: { id: review.revieweeId },
          data: {
            rating: Math.round(avgRating * 100) / 100,
          },
        });
      }

      return updated;
    });

    // Create notification if admin updated the review
    if (user.role === 'ADMIN' && user.id !== review.reviewerId) {
      await createNotification(
        review.reviewerId,
        'SYSTEM',
        'Review Diperbarui',
        `Review Anda di proyek ${review.project.title} telah diperbarui oleh admin`,
        { reviewId: review.id }
      );
    }

    return apiSuccess({
      message: 'Review berhasil diperbarui',
      data: updatedReview,
    });
  } catch (error) {
    console.error('Update review error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// =====================
// DELETE: Delete Review
// =====================

export const DELETE = withAuth(async (user: SafeUser, request: NextRequest, context) => {
  try {
    const params = await context?.params;
    const reviewId = params?.id as string;

    if (!reviewId) {
      return apiError('ID review tidak valid', 400);
    }

    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      return apiNotFound('Review tidak ditemukan');
    }

    // Check delete permission
    if (!canModifyReview(user, review)) {
      return apiForbidden('Anda tidak memiliki akses untuk menghapus review ini');
    }

    // Delete review and recalculate rating
    await db.$transaction(async (tx) => {
      await tx.review.delete({
        where: { id: reviewId },
      });

      // Recalculate reviewee's rating
      const allReviews = await tx.review.findMany({
        where: { revieweeId: review.revieweeId },
        select: { rating: true },
      });

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

      await tx.user.update({
        where: { id: review.revieweeId },
        data: {
          rating: Math.round(avgRating * 100) / 100,
          totalReviews: allReviews.length,
        },
      });
    });

    return apiSuccess({
      message: 'Review berhasil dihapus',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
