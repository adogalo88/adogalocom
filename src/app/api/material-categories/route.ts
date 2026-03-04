import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api-utils';

// GET /api/material-categories - List all material categories (tree: parents with children)
export async function GET() {
  try {
    const categories = await db.materialCategory.findMany({
      where: { parentId: null },
      include: {
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess({ categories });
  } catch (error) {
    console.error('Get material categories error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
}

// POST /api/material-categories - Create category or subcategory (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return apiForbidden('Tidak memiliki akses');
    }

    const body = await request.json();
    const { name, description, parentId, sortOrder } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return apiError('Nama kategori minimal 2 karakter', 400);
    }

    const category = await db.materialCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    return apiSuccess({ category }, 201);
  } catch (error) {
    console.error('Create material category error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
}
