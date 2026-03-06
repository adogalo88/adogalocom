import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// =====================
// VALIDATION SCHEMAS
// =====================

const updatePortfolioSchema = z.object({
  title: z.string().min(3, 'Judul portofolio minimal 3 karakter').max(200, 'Judul portofolio maksimal 200 karakter').optional(),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter').max(2000, 'Deskripsi maksimal 2000 karakter').optional(),
  images: z.array(z.string().url('URL gambar tidak valid')).min(1, 'Minimal 1 gambar diperlukan').max(10, 'Maksimal 10 gambar').optional(),
  projectId: z.string().nullable().optional(),
});

// =====================
// GET: Single Portfolio Item
// =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data portofolio' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const portfolio = await db.portfolio.findUnique({
      where: { id },
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
        city: {
          select: { id: true, name: true, province: { select: { id: true, name: true } } },
        },
        project: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portofolio tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hanya pemilik yang boleh melihat (dashboard)
    if (portfolio.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke portofolio ini' },
        { status: 403 }
      );
    }

    // Parse images from JSON string
    const portfolioWithParsedImages = {
      ...portfolio,
      images: JSON.parse(portfolio.images) as string[],
    };

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
// PATCH: Update Portfolio
// =====================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah portofolio' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if portfolio exists
    const existingPortfolio = await db.portfolio.findUnique({
      where: { id },
    });

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portofolio tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingPortfolio.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengubah portofolio ini' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validationResult = updatePortfolioSchema.safeParse(body);
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

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (portfolioData.title !== undefined) updateData.title = portfolioData.title;
    if (portfolioData.description !== undefined) updateData.description = portfolioData.description;
    if (portfolioData.images !== undefined) updateData.images = JSON.stringify(portfolioData.images);
    if (portfolioData.projectId !== undefined) updateData.projectId = portfolioData.projectId;

    // Update portfolio
    const portfolio = await db.portfolio.update({
      where: { id },
      data: updateData,
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
      message: 'Portofolio berhasil diperbarui',
      portfolio: portfolioWithParsedImages,
    });

  } catch (error) {
    console.error('Update portfolio error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// DELETE: Delete Portfolio
// =====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk menghapus portofolio' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if portfolio exists
    const existingPortfolio = await db.portfolio.findUnique({
      where: { id },
    });

    if (!existingPortfolio) {
      return NextResponse.json(
        { error: 'Portofolio tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingPortfolio.userId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk menghapus portofolio ini' },
        { status: 403 }
      );
    }

    // Delete portfolio
    await db.portfolio.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Portofolio berhasil dihapus',
    });

  } catch (error) {
    console.error('Delete portfolio error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
