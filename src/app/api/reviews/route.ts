import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { SafeUser } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, withAuth, getPaginationParams, PaginatedResponse, createNotification } from '@/lib/api-utils';

// =====================
// VALIDATION SCHEMAS
// =====================

const reviewFilterSchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  reviewerId: z.string().optional(),
  revieweeId: z.string().optional(),
  projectId: z.string().optional(),
  minRating: z.string().regex(/^[1-5]$/).optional(),
  maxRating: z.string().regex(/^[1-5]$/).optional(),
});

const CLIENT_TO_VENDOR_KEYS = ['quality', 'timeliness', 'communication', 'professionalism', 'specMatch'] as const;
const VENDOR_TO_CLIENT_KEYS = ['clarity', 'communication', 'consistency', 'professionalism', 'coordination'] as const;

const createReviewSchema = z.object({
  projectId: z.string().min(1, 'ID proyek wajib diisi'),
  revieweeId: z.string().min(1, 'ID yang direview wajib diisi'),
  rating: z.number().int().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5').optional(),
  comment: z.string().min(10, 'Komentar minimal 10 karakter').max(1000, 'Komentar maksimal 1000 karakter'),
  reviewType: z.enum(['CLIENT_TO_VENDOR', 'VENDOR_TO_CLIENT']).optional(),
  dimensionRatings: z.record(z.string(), z.number().int().min(1).max(5)).optional(),
});

// =====================
// GET: List Reviews
// =====================

export const GET = withAuth(async (user: SafeUser, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = reviewFilterSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return apiError('Parameter tidak valid', 400, validationResult.error.flatten());
    }

    const {
      page = '1',
      limit = '10',
      reviewerId,
      revieweeId,
      projectId,
      minRating,
      maxRating,
    } = validationResult.data;

    const { skip, page: pageNum, limit: limitNum } = getPaginationParams({ page, limit });

    // Build filter
    const where: Record<string, unknown> = {};

    // Apply filters
    if (reviewerId) {
      where.reviewerId = reviewerId;
    }
    if (revieweeId) {
      where.revieweeId = revieweeId;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    // Rating range filter
    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) {
        where.rating = { ...where.rating, gte: parseInt(minRating) };
      }
      if (maxRating) {
        where.rating = { ...where.rating, lte: parseInt(maxRating) };
      }
    }

    // Get reviews with relations
    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
              rating: true,
              totalReviews: true,
            },
          },
          reviewee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
              rating: true,
              totalReviews: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      db.review.count({ where }),
    ]);

    // Pastikan dimensionRatings dan reviewType selalu dikembalikan (Prisma Json bisa serial berbeda)
    const normalizedData = reviews.map((r) => {
      const base = { ...r } as typeof r & { dimensionRatings?: Record<string, number> | null; reviewType?: string | null };
      if (r.dimensionRatings != null) {
        base.dimensionRatings =
          typeof r.dimensionRatings === 'object' && !Array.isArray(r.dimensionRatings)
            ? (r.dimensionRatings as Record<string, number>)
            : typeof r.dimensionRatings === 'string'
              ? (() => {
                  try {
                    return JSON.parse(r.dimensionRatings as unknown as string) as Record<string, number>;
                  } catch {
                    return null;
                  }
                })()
              : null;
      }
      return base;
    });

    const response: PaginatedResponse<typeof reviews[0]> = {
      data: normalizedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Get reviews error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// =====================
// POST: Create Review
// =====================

export const POST = withAuth(async (user: SafeUser, request: NextRequest) => {
  try {
    const body = await request.json();

    const validationResult = createReviewSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    let data = validationResult.data;

    // Jika ada dimensionRatings, validasi key dan hitung rating overall
    let finalRating = data.rating;
    let dimensionRatingsJson: Record<string, number> | null = null;
    let reviewType: string | null = null;

    if (data.dimensionRatings && Object.keys(data.dimensionRatings).length > 0) {
      reviewType = data.reviewType ?? null;
      const dims = data.dimensionRatings as Record<string, number>;
      const keys = reviewType === 'VENDOR_TO_CLIENT' ? VENDOR_TO_CLIENT_KEYS : CLIENT_TO_VENDOR_KEYS;
      const requiredKeys = keys as unknown as string[];
      const missing = requiredKeys.filter((k) => dims[k] == null || typeof dims[k] !== 'number');
      if (missing.length > 0) {
        return apiError(`Dimension rating wajib: ${requiredKeys.join(', ')}`, 400);
      }
      const values = requiredKeys.map((k) => dims[k]);
      dimensionRatingsJson = requiredKeys.reduce((acc, k) => ({ ...acc, [k]: dims[k] }), {} as Record<string, number>);
      finalRating = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      if (finalRating < 1 || finalRating > 5) finalRating = Math.min(5, Math.max(1, finalRating));
    }

    if (finalRating == null || finalRating < 1 || finalRating > 5) {
      return apiError('Rating wajib (1-5) atau berikan dimensionRatings dengan reviewType', 400);
    }

    data = { ...data, rating: Math.round(finalRating) } as typeof data;

    // Verify project exists and is completed
    const project = await db.project.findUnique({
      where: { id: data.projectId },
      select: {
        id: true,
        title: true,
        status: true,
        clientId: true,
        vendorId: true,
        teamMembers: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!project) {
      return apiError('Proyek tidak ditemukan', 404);
    }

    // Verify project is completed
    if (project.status !== 'COMPLETED') {
      return apiError('Hanya proyek yang sudah selesai yang dapat direview', 400);
    }

    // Verify user is participant in the project
    const isClient = project.clientId === user.id;
    const isVendor = project.vendorId === user.id;
    const isTeamMember = project.teamMembers.some(tm => tm.userId === user.id);

    if (!isClient && !isVendor && !isTeamMember && user.role !== 'ADMIN') {
      return apiForbidden('Anda bukan peserta dalam proyek ini');
    }

    // Verify reviewee is also a participant in the project
    const revieweeIsClient = project.clientId === data.revieweeId;
    const revieweeIsVendor = project.vendorId === data.revieweeId;
    const revieweeIsTeamMember = project.teamMembers.some(tm => tm.userId === data.revieweeId);

    if (!revieweeIsClient && !revieweeIsVendor && !revieweeIsTeamMember) {
      return apiError('Yang direview bukan peserta dalam proyek ini', 400);
    }

    // Prevent self-review
    if (user.id === data.revieweeId) {
      return apiError('Anda tidak dapat mereview diri sendiri', 400);
    }

    // Check if already reviewed this person in this project
    const existingReview = await db.review.findUnique({
      where: {
        projectId_reviewerId_revieweeId: {
          projectId: data.projectId,
          reviewerId: user.id,
          revieweeId: data.revieweeId,
        },
      },
    });

    if (existingReview) {
      return apiError('Anda sudah memberikan review untuk orang ini dalam proyek yang sama', 409);
    }

    // Verify reviewee exists
    const reviewee = await db.user.findUnique({
      where: { id: data.revieweeId },
      select: { id: true, name: true, rating: true, totalReviews: true },
    });

    if (!reviewee) {
      return apiError('Pengguna yang direview tidak ditemukan', 404);
    }

    // Create review in a transaction to update user rating
    const review = await db.$transaction(async (tx) => {
      // Create the review
      const newReview = await tx.review.create({
        data: {
          projectId: data.projectId,
          reviewerId: user.id,
          revieweeId: data.revieweeId,
          rating: data.rating,
          comment: data.comment,
          reviewType: reviewType ?? undefined,
          dimensionRatings: dimensionRatingsJson ?? undefined,
        },
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

      // Update reviewee's rating (calculate new average)
      const allReviews = await tx.review.findMany({
        where: { revieweeId: data.revieweeId },
        select: { rating: true },
      });

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

      await tx.user.update({
        where: { id: data.revieweeId },
        data: {
          rating: Math.round(avgRating * 100) / 100, // Round to 2 decimal places
          totalReviews: allReviews.length,
        },
      });

      return newReview;
    });

    // Create notification for reviewee
    await createNotification(
      data.revieweeId,
      'REVIEW_NEW',
      'Review Baru',
      `${user.name} memberikan review ${data.rating} bintang untuk Anda di proyek ${project.title}`,
      { reviewId: review.id, projectId: project.id }
    );

    return apiSuccess({
      message: 'Review berhasil dibuat',
      data: review,
    }, 201);
  } catch (error) {
    console.error('Create review error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
