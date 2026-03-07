import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST: Client mengirim permintaan negosiasi (1x saja).
 * Body: { requestedTotal, message }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body = await request.json();
    const { requestedTotal, message } = body;

    if (requestedTotal == null || typeof requestedTotal !== 'number') {
      return NextResponse.json(
        { error: 'requestedTotal (number) wajib' },
        { status: 400 }
      );
    }

    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        project: { select: { id: true, title: true, clientId: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Penawaran tidak ditemukan' }, { status: 404 });
    }

    if (application.project.clientId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya pemilik proyek yang dapat melakukan negosiasi' }, { status: 403 });
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Hanya penawaran dengan status menunggu yang dapat dinegosiasi' },
        { status: 400 }
      );
    }

    if (application.negotiationRequestedTotal != null) {
      return NextResponse.json(
        { error: 'Anda hanya dapat mengajukan negosiasi satu kali untuk penawaran ini' },
        { status: 400 }
      );
    }

    const originalTotal = application.proposedBudget ?? 0;
    if (requestedTotal >= originalTotal) {
      return NextResponse.json(
        { error: 'Harga negosiasi harus lebih rendah dari total penawaran awal' },
        { status: 400 }
      );
    }

    await db.application.update({
      where: { id: applicationId },
      data: {
        negotiationRequestedTotal: requestedTotal,
        negotiationMessage: (message || '').trim() || null,
        negotiationStatus: 'PENDING',
      },
    });

    await db.notification.create({
      data: {
        userId: application.userId,
        type: 'PROJECT_APPLICATION',
        title: 'Permintaan Negosiasi Harga',
        message: `Client meminta negosiasi untuk penawaran proyek "${application.project.title}". Harga yang diminta: Rp ${requestedTotal.toLocaleString('id-ID')}`,
        data: JSON.stringify({ applicationId, projectId: application.projectId }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Permintaan negosiasi telah dikirim ke vendor',
    });
  } catch (e) {
    console.error('Application negotiate error:', e);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
