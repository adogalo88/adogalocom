import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';

const postCommentSchema = z.object({
  content: z.string().min(1, 'Komentar tidak boleh kosong').max(2000, 'Maksimal 2000 karakter'),
});

// GET - List comments (non-admin see "Vendor" / "Client" only)
export async function GET(
  request: NextRequest,
  context: { params?: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const params = await context.params;
    const projectId = params?.id;
    if (!projectId) {
      return NextResponse.json({ error: 'ID proyek tidak valid' }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, type: true, clientId: true, status: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    }
    if (project.type !== 'TENDER') {
      return NextResponse.json({ error: 'Hanya proyek tender yang memiliki diskusi' }, { status: 400 });
    }
    if (project.status !== 'PUBLISHED' && project.status !== 'EXPIRED' && project.status !== 'IN_PROGRESS' && project.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Proyek tidak dapat dilihat' }, { status: 403 });
    }

    const comments = await db.projectComment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const list = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      user: isAdmin
        ? { id: c.user.id, name: c.user.name, role: c.user.role, avatar: c.user.avatar }
        : {
            id: c.user.id,
            name: c.user.role === UserRole.VENDOR ? 'Vendor' : c.user.role === UserRole.CLIENT ? 'Client' : c.user.role === UserRole.ADMIN ? 'Admin' : c.user.name,
            role: c.user.role,
            avatar: c.user.avatar,
          },
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (e) {
    console.error('Get project comments error:', e);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST - Add comment (Vendor or Client only)
export async function POST(
  request: NextRequest,
  context: { params?: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Anda harus login untuk berkomentar' }, { status: 401 });
    }
    if (currentUser.role !== UserRole.VENDOR && currentUser.role !== UserRole.CLIENT && currentUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Hanya Vendor, Client, atau Admin yang dapat berkomentar' }, { status: 403 });
    }

    const params = await context.params;
    const projectId = params?.id;
    if (!projectId) {
      return NextResponse.json({ error: 'ID proyek tidak valid' }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, type: true, clientId: true, status: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    }
    if (project.type !== 'TENDER') {
      return NextResponse.json({ error: 'Hanya proyek tender yang memiliki diskusi' }, { status: 400 });
    }
    if (project.status !== 'PUBLISHED' && project.status !== 'EXPIRED' && project.status !== 'IN_PROGRESS' && project.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Proyek tidak menerima komentar' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = postCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors.content?.[0] ?? 'Data tidak valid' }, { status: 400 });
    }

    const comment = await db.projectComment.create({
      data: {
        projectId,
        userId: currentUser.id,
        content: parsed.data.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const displayUser = isAdmin
      ? comment.user
      : {
          ...comment.user,
          name: comment.user.role === UserRole.VENDOR ? 'Vendor' : comment.user.role === UserRole.CLIENT ? 'Client' : comment.user.role === UserRole.ADMIN ? 'Admin' : comment.user.name,
        };

    return NextResponse.json({
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: displayUser,
      },
    });
  } catch (e) {
    console.error('Post project comment error:', e);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
