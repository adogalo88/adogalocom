import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST: Vendor merespons negosiasi (1x saja): accept, reject, atau counter.
 * Body: { action: 'ACCEPT' | 'REJECT' | 'COUNTER', counterTotal?, counterMessage? }
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
    const { action, counterTotal, counterMessage } = body;

    if (!action || !['ACCEPT', 'REJECT', 'COUNTER'].includes(action)) {
      return NextResponse.json(
        { error: 'action (ACCEPT|REJECT|COUNTER) wajib' },
        { status: 400 }
      );
    }

    const application = await db.application.findFirst({
      where: { id: applicationId, userId: currentUser.id },
      include: {
        project: { select: { id: true, title: true, clientId: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Penawaran tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }

    if (application.negotiationStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'Tidak ada permintaan negosiasi yang menunggu respons' },
        { status: 400 }
      );
    }

    const originalTotal = application.proposedBudget ?? 0;
    const requestedTotal = application.negotiationRequestedTotal ?? 0;

    if (action === 'ACCEPT') {
      await db.application.update({
        where: { id: applicationId },
        data: {
          proposedBudget: requestedTotal,
          negotiationStatus: 'ACCEPTED',
        },
      });
      await db.notification.create({
        data: {
          userId: application.project.clientId,
          type: 'PROJECT_APPLICATION',
          title: 'Vendor Menyetujui Negosiasi',
          message: `Vendor menyetujui harga negosiasi. Total baru: Rp ${requestedTotal.toLocaleString('id-ID')}`,
          data: JSON.stringify({ applicationId, projectId: application.projectId }),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Anda menyetujui negosiasi. Total penawaran telah diperbarui.',
      });
    }

    if (action === 'REJECT') {
      await db.application.update({
        where: { id: applicationId },
        data: { negotiationStatus: 'REJECTED' },
      });
      await db.notification.create({
        data: {
          userId: application.project.clientId,
          type: 'PROJECT_APPLICATION',
          title: 'Vendor Menolak Negosiasi',
          message: 'Vendor menolak permintaan negosiasi harga.',
          data: JSON.stringify({ applicationId, projectId: application.projectId }),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Negosiasi ditolak.',
      });
    }

    if (action === 'COUNTER') {
      const counter = counterTotal != null ? Number(counterTotal) : 0;
      if (counter > originalTotal) {
        return NextResponse.json(
          { error: 'Harga counter tidak boleh melebihi total penawaran awal' },
          { status: 400 }
        );
      }
      await db.application.update({
        where: { id: applicationId },
        data: {
          proposedBudget: counter,
          negotiationStatus: 'COUNTERED',
          vendorCounterTotal: counter,
          vendorCounterMessage: (counterMessage || '').trim() || null,
        },
      });
      await db.notification.create({
        data: {
          userId: application.project.clientId,
          type: 'PROJECT_APPLICATION',
          title: 'Vendor Mengajukan Counter',
          message: `Vendor mengajukan harga counter: Rp ${counter.toLocaleString('id-ID')}`,
          data: JSON.stringify({ applicationId, projectId: application.projectId }),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Counter penawaran telah dikirim ke client.',
      });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (e) {
    console.error('Application negotiate respond error:', e);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
