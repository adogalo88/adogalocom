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
    const categoryIdsParam = searchParams.get('categoryIds') || ''; // comma-separated
    const categoryIds = categoryIdsParam ? categoryIdsParam.split(',').filter(Boolean) : [];
    const sortBy = searchParams.get('sortBy') || 'rating'; // rating, totalProjects, name
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Build filter
    const andConditions: Record<string, unknown>[] = [];
    const where: Record<string, unknown> = {
      role: 'VENDOR',
      isVerified: true,
      status: 'ACTIVE',
    };

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (cityId) {
      where.cityId = cityId;
    }

    if (categoryIds.length > 0) {
      // Vendor matches: has done projects in category OR has selected category as specialization
      andConditions.push({
        OR: [
          { projectsAsVendor: { some: { categoryId: { in: categoryIds } } } },
          { vendorCategories: { some: { id: { in: categoryIds } } } },
        ],
      });
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
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

    // Hitung jumlah proyek selesai secara real-time (lebih akurat dari totalProjects)
    const vendorIds = vendors.map((v) => v.id);
    const projectCounts = vendorIds.length > 0
      ? await db.project.groupBy({
          by: ['vendorId'],
          where: { vendorId: { in: vendorIds }, status: 'COMPLETED' },
          _count: { id: true },
        })
      : [];
    const countMap = Object.fromEntries(projectCounts.map((p) => [p.vendorId, p._count.id]));

    const vendorsWithCount = vendors.map((v) => ({
      ...v,
      totalProjects: countMap[v.id] ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data: vendorsWithCount,
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
