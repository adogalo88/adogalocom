import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Client submits per-skill ratings for a completed HARIAN project
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        skills: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    }
    if (project.type !== 'HARIAN') {
      return NextResponse.json({ error: 'Rating per keahlian hanya untuk proyek harian' }, { status: 400 });
    }
    if (project.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Proyek harus sudah selesai' }, { status: 400 });
    }
    if (project.clientId !== currentUser.id) {
      return NextResponse.json({ error: 'Hanya client pemilik proyek yang dapat memberi rating' }, { status: 403 });
    }
    const revieweeId = project.vendorId;
    if (!revieweeId) {
      return NextResponse.json({ error: 'Belum ada tukang yang diterima' }, { status: 400 });
    }

    const body = await request.json();
    const ratings = body.ratings as { skillId: string; rating: number; comment?: string }[] | undefined;
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json({ error: 'Data rating keahlian wajib diisi' }, { status: 400 });
    }

    const projectSkillIds = project.skills.map((s) => s.id);
    for (const r of ratings) {
      if (!r.skillId || !projectSkillIds.includes(r.skillId)) continue;
      const rating = Math.min(5, Math.max(1, Number(r.rating) || 0));
      await db.skillRating.upsert({
        where: {
          projectId_skillId_reviewerId_revieweeId: {
            projectId,
            skillId: r.skillId,
            reviewerId: currentUser.id,
            revieweeId,
          },
        },
        create: {
          projectId,
          skillId: r.skillId,
          reviewerId: currentUser.id,
          revieweeId,
          rating,
          comment: r.comment?.trim() || null,
        },
        update: {
          rating,
          comment: r.comment?.trim() || null,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Rating keahlian berhasil disimpan' });
  } catch (error) {
    console.error('Skill ratings error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// GET - List skill ratings for this project (for display)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await context.params;
    const ratings = await db.skillRating.findMany({
      where: { projectId },
      include: {
        skill: { select: { id: true, name: true } },
        reviewee: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, data: ratings });
  } catch (error) {
    console.error('Get skill ratings error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
