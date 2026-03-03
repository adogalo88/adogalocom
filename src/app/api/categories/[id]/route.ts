import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// =====================
// VALIDATION SCHEMAS
// =====================

const updateCategorySchema = z.object({
  name: z.string()
    .min(2, 'Nama kategori minimal 2 karakter')
    .max(100, 'Nama kategori maksimal 100 karakter')
    .optional(),
  description: z.string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .nullable()
    .optional(),
  icon: z.string()
    .max(50, 'Nama ikon maksimal 50 karakter')
    .nullable()
    .optional(),
});

// =====================
// GET: Single Category (Public)
// =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        projectCount: category._count.projects,
      },
    });

  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// PATCH: Update Category (Admin Only)
// =====================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah kategori' },
        { status: 401 }
      );
    }

    // Only ADMIN can update categories
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat mengubah kategori' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if category exists
    const existingCategory = await db.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const validationResult = updateCategorySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if name is being changed and if it conflicts with existing category
    if (updateData.name && updateData.name !== existingCategory.name) {
      const nameConflict = await db.category.findUnique({
        where: { name: updateData.name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Nama kategori sudah digunakan' },
          { status: 409 }
        );
      }
    }

    // Update category
    const category = await db.category.update({
      where: { id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.icon !== undefined && { icon: updateData.icon }),
      },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil diperbarui',
      data: {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        projectCount: category._count.projects,
      },
    });

  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// DELETE: Delete Category (Admin Only)
// =====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk menghapus kategori' },
        { status: 401 }
      );
    }

    // Only ADMIN can delete categories
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat menghapus kategori' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if category exists
    const existingCategory = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if category has projects
    if (existingCategory._count.projects > 0) {
      return NextResponse.json(
        { 
          error: 'Kategori tidak dapat dihapus karena masih memiliki proyek terkait',
          details: {
            projectCount: existingCategory._count.projects,
          }
        },
        { status: 400 }
      );
    }

    // Delete category
    await db.category.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil dihapus',
    });

  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
