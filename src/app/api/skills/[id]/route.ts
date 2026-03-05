import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, sortOrder } = body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: 'Nama keahlian minimal 2 karakter' },
          { status: 400 }
        );
      }
      const existing = await db.skill.findFirst({
        where: { name: name.trim(), NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Keahlian dengan nama ini sudah ada' },
          { status: 409 }
        );
      }
    }

    const skill = await db.skill.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(typeof sortOrder === 'number' && { sortOrder }),
      },
    });

    return NextResponse.json({ success: true, skill });
  } catch (error) {
    console.error('Update skill error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await db.skill.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Keahlian berhasil dihapus' });
  } catch (error) {
    console.error('Delete skill error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
