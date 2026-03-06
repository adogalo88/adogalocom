import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';

// DELETE - Hapus komentar (Admin only)
export async function DELETE(
  _request: NextRequest,
  context: { params?: Promise<{ id: string; commentId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Hanya admin yang dapat menghapus komentar' }, { status: 403 });
    }

    const params = await context.params;
    const projectId = params?.id;
    const commentId = params?.commentId;
    if (!projectId || !commentId) {
      return NextResponse.json({ error: 'ID proyek atau komentar tidak valid' }, { status: 400 });
    }

    const comment = await db.projectComment.findFirst({
      where: { id: commentId, projectId },
    });
    if (!comment) {
      return NextResponse.json({ error: 'Komentar tidak ditemukan' }, { status: 404 });
    }

    await db.projectComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true, message: 'Komentar telah dihapus' });
  } catch (e) {
    console.error('Delete project comment error:', e);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
