import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all verified tukangs (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const cityId = searchParams.get('cityId') || '';
    const specialtyParam = searchParams.get('specialties') || searchParams.get('specialty') || '';
    const specialties = specialtyParam ? specialtyParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const skillIdsParam = searchParams.get('skillIds') || '';
    const skillIds = skillIdsParam ? skillIdsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const minRating = searchParams.get('minRating') || '';
    const minExperience = searchParams.get('minExperience') || '';
    const sortBy = searchParams.get('sortBy') || 'rating'; // rating, experience, name
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Build filter: base + AND for search and multi-specialty
    const andConditions: Record<string, unknown>[] = [];
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { specialty: { contains: search, mode: 'insensitive' as const } },
        ],
      });
    }
    if (specialties.length > 0) {
      andConditions.push({
        OR: specialties.map((s) => ({ specialty: { contains: s, mode: 'insensitive' as const } })),
      });
    }
    if (skillIds.length > 0) {
      andConditions.push({
        skills: { some: { id: { in: skillIds } } },
      });
    }

    const where: Record<string, unknown> = {
      role: 'TUKANG',
      isVerified: true,
      status: 'ACTIVE',
    };
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }
    if (cityId) {
      where.cityId = cityId;
    }
    if (minRating) {
      const r = parseFloat(minRating);
      if (!isNaN(r)) where.rating = { gte: r };
    }
    if (minExperience) {
      const exp = parseInt(minExperience);
      if (!isNaN(exp)) where.experience = { gte: exp };
    }

    // Build orderBy
    let orderBy: Record<string, unknown> = {};
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: sortOrder === 'desc' ? 'desc' : 'asc' };
        break;
      case 'experience':
        orderBy = { experience: sortOrder === 'desc' ? 'desc' : 'asc' };
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

    // Get tukangs
    const [tukangs, total] = await Promise.all([
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
          experience: true,
          skills: { select: { id: true, name: true } },
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
      data: tukangs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tukangs:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data tukang' },
      { status: 500 }
    );
  }
}
