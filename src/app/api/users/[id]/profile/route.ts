import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get public profile of a user (vendor/tukang)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true, // Only show if needed
        avatar: true,
        role: true,
        rating: true,
        totalReviews: true,
        totalProjects: true,
        description: true,
        specialty: true,
        experience: true,
        phone: true,
        address: true,
        isVerified: true,
        city: {
          select: {
            id: true,
            name: true,
            province: {
              select: { id: true, name: true }
            }
          }
        },
        createdAt: true,
        // Portfolio
        portfolio: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        // Reviews received
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            reviewer: {
              select: {
                id: true,
                name: true,
                avatar: true,
              }
            },
            project: {
              select: {
                id: true,
                title: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        // Projects completed (for vendor)
        projectsAsVendor: {
          select: {
            id: true,
            title: true,
            status: true,
            completedAt: true,
            category: {
              select: { id: true, name: true }
            }
          },
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 5,
        },
        // Team memberships (for tukang)
        teamMemberships: {
          select: {
            id: true,
            role: true,
            project: {
              select: {
                id: true,
                title: true,
                status: true,
              }
            }
          },
          where: {
            project: { status: 'COMPLETED' }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    // Only allow viewing VENDOR and TUKANG profiles publicly
    if (user.role !== 'VENDOR' && user.role !== 'TUKANG') {
      return NextResponse.json(
        { success: false, error: 'Profil tidak tersedia' },
        { status: 403 }
      );
    }

    // Hide email for privacy
    const { email, ...publicProfile } = user;

    // Parse portfolio images
    const portfolioWithImages = user.portfolio.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : []
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...publicProfile,
        portfolio: portfolioWithImages,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data profil' },
      { status: 500 }
    );
  }
}
