import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiError, apiNotFound, apiForbidden } from '@/lib/api-utils';

// DELETE /api/material-categories/[id] - Hapus kategori atau subkategori (admin only). Jika parent, hapus dulu semua children.
export async function DELETE(
  _request: NextRequest,
  context: { params?: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return apiForbidden('Tidak memiliki akses');
    }

    const params = await context.params;
    const id = params?.id;
    if (!id) {
      return apiError('ID kategori wajib', 400);
    }

    const category = await db.materialCategory.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!category) {
      return apiNotFound('Kategori tidak ditemukan');
    }

    // Hapus semua subkategori (children) dulu, lalu parent
    if (category.children?.length > 0) {
      await db.materialCategory.deleteMany({
        where: { parentId: id },
      });
    }
    await db.materialCategory.delete({
      where: { id },
    });

    return apiSuccess({ message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('Delete material category error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
}
