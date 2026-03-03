import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all verified vendors (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const cityId = searchParams.get('cityId') || '';
    const specialty = searchParams.get('specialty') || '';
    const minRating = searchParams.get('minRating') || '';
    const sortBy = searchParams.get('sortBy') || 'rating'; // rating, totalProjects, name
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Build filter
    const where: Record<string, unknown> = {
      role: 'VENDOR',
      isVerified: true,
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (cityId) {
      where.cityId = cityId;
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    // Build orderBy
    let orderBy: Record<string, unknown> = {};
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: sortOrder === 'desc' ? 'desc' : 'asc' };
        break;
      case 'totalProjects':
        orderBy = { totalProjects: sortOrder === 'desc' ? 'desc' : 'asc' };
        break;
      case 'name':
        orderBy = { name: sortOrder === 'desc' ? 'desc' : 'asc' };
        break;
      case 'reviews':
        orderBy = { totalReviews: sortOrder === 'desc' ? 'desc' : 'asc' };
        break;
      default:
        orderBy = { rating: 'desc' };
    }

    // Get vendors
    const [vendors, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatar: true,
          rating: true,
          totalReviews: true,
          totalProjects: true,
          description: true,
          specialty: true,
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
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data vendor' },
      { status: 500 }
    );
  }
}
