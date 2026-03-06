import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// =====================
// VALIDATION SCHEMAS
// =====================

const portfolioFilterSchema = z.object({
  userId: z.string().optional(),
});

const createPortfolioSchema = z.object({
  title: z.string().min(3, 'Judul portofolio minimal 3 karakter').max(200, 'Judul portofolio maksimal 200 karakter'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter').max(2000, 'Deskripsi maksimal 2000 karakter'),
  images: z.array(z.string().min(1)).min(1, 'Minimal 1 gambar diperlukan').max(10, 'Maksimal 10 gambar'),
  projectId: z.string().optional(),
  completedYear: z.number().int().min(1990).max(2100).optional().nullable(),
  cityId: z.string().optional().nullable(),
});

// =====================
// GET: List Portfolio
// =====================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data portofolio' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = portfolioFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { userId } = validationResult.data;

    // Build filter
    const where: Record<string, unknown> = {};
    
    // If userId is provided, show that user's portfolio
    // Otherwise, show current user's portfolio
    if (userId) {
      where.userId = userId;
    } else {
      where.userId = currentUser.id;
    }

    // Get portfolio with relations
    const portfolio = await db.portfolio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
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
      },
    });

    // Parse images from JSON string
    const portfolioWithParsedImages = portfolio.map((item) => ({
      ...item,
      images: JSON.parse(item.images) as string[],
    }));

    return NextResponse.json({
      success: true,
      portfolio: portfolioWithParsedImages,
    });

  } catch (error) {
    console.error('Get portfolio error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// POST: Create Portfolio
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk membuat portofolio' },
        { status: 401 }
      );
    }

    // Only TUKANG and VENDOR can create portfolio
    if (currentUser.role !== 'TUKANG' && currentUser.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Hanya tukang atau vendor yang dapat membuat portofolio' },
        { status: 403 }
      );
    }

    // Check if user is verified
    if (!currentUser.isVerified || currentUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Akun Anda belum terverifikasi. Silakan lengkapi verifikasi terlebih dahulu.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validationResult = createPortfolioSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const portfolioData = validationResult.data;

    // Validate project exists if provided
    if (portfolioData.projectId) {
      const project = await db.project.findUnique({
        where: { id: portfolioData.projectId },
      });

      if (!project) {
        return NextResponse.json(
          { error: 'Proyek tidak ditemukan' },
          { status: 400 }
        );
      }

      // Check if user was part of the project (as vendor or team member)
      const isVendor = project.vendorId === currentUser.id;
      const isTeamMember = await db.teamMember.findFirst({
        where: {
          projectId: portfolioData.projectId,
          userId: currentUser.id,
        },
      });

      if (!isVendor && !isTeamMember) {
        return NextResponse.json(
          { error: 'Anda tidak terlibat dalam proyek ini' },
          { status: 403 }
        );
      }
    }

    // Create portfolio
    const portfolio = await db.portfolio.create({
      data: {
        title: portfolioData.title,
        description: portfolioData.description,
        images: JSON.stringify(portfolioData.images),
        projectId: portfolioData.projectId ?? null,
        completedYear: portfolioData.completedYear ?? null,
        cityId: portfolioData.cityId ?? null,
        userId: currentUser.id,
      },
      include: {
        user: {
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
      },
    });

    // Return with parsed images
    const portfolioWithParsedImages = {
      ...portfolio,
      images: JSON.parse(portfolio.images) as string[],
    };

    return NextResponse.json({
      success: true,
      message: 'Portofolio berhasil dibuat',
      portfolio: portfolioWithParsedImages,
    }, { status: 201 });

  } catch (error) {
    console.error('Create portfolio error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
