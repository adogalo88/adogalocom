import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all verified suppliers (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const cityId = searchParams.get('cityId') || '';
    const provinceId = searchParams.get('provinceId') || '';
    const categoryIdsParam = searchParams.get('categoryIds') || '';
    const categoryIds = categoryIdsParam ? categoryIdsParam.split(',').filter(Boolean) : [];
    const minRating = searchParams.get('minRating') || '';
    const sortBy = searchParams.get('sortBy') || 'rating';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Build filter
    const where: Record<string, unknown> = {
      role: 'SUPPLIER',
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

    if (provinceId) {
      where.city = { provinceId };
    }

    if (categoryIds.length > 0) {
      where.materialCategories = {
        some: { id: { in: categoryIds } },
      };
    }

    if (minRating) {
      const r = parseFloat(minRating);
      if (!isNaN(r)) where.rating = { gte: r };
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

    // Get suppliers
    const [suppliers, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatar: true,
          phone: true,
          picPhone: true,
          rating: true,
          totalReviews: true,
          description: true,
          city: {
            select: {
              id: true,
              name: true,
              province: {
                select: { id: true, name: true }
              }
            }
          },
          materialCategories: {
            select: { id: true, name: true }
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
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data supplier' },
      { status: 500 }
    );
  }
}
