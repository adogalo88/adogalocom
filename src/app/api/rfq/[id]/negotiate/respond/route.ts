import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST: Vendor merespons negosiasi (1x saja): accept, reject, atau counter.
 * Body: { submissionId, action: 'ACCEPT' | 'REJECT' | 'COUNTER', counterTotal?, counterMessage? }
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

    const { id: rfqId } = await params;
    const body = await request.json();
    const { submissionId, action, counterTotal, counterMessage } = body;

    if (!submissionId || !action || !['ACCEPT', 'REJECT', 'COUNTER'].includes(action)) {
      return NextResponse.json(
        { error: 'submissionId dan action (ACCEPT|REJECT|COUNTER) wajib' },
        { status: 400 }
      );
    }

    const submission = await db.rFQSubmission.findFirst({
      where: { id: submissionId, rfqId, vendorId: currentUser.id },
      include: {
        rfq: {
          include: {
            project: { select: { clientId: true } },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Penawaran tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }

    if (submission.negotiationStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'Tidak ada permintaan negosiasi yang menunggu respons' },
        { status: 400 }
      );
    }

    const originalTotal = submission.originalTotalOffer ?? submission.totalOffer ?? 0;
    const requestedTotal = submission.negotiationRequestedTotal ?? 0;

    if (action === 'ACCEPT') {
      const newTotal = requestedTotal;
      const discountAmount = originalTotal - newTotal;
      await db.rFQSubmission.update({
        where: { id: submissionId },
        data: {
          totalOffer: newTotal,
          negotiationStatus: 'ACCEPTED',
          negotiationDiscountAmount: discountAmount,
        },
      });
      await db.notification.create({
        data: {
          userId: submission.rfq.project.clientId,
          type: 'PROJECT_APPLICATION',
          title: 'Vendor Menyetujui Negosiasi',
          message: `Vendor menyetujui harga negosiasi. Total baru: Rp ${newTotal.toLocaleString('id-ID')}`,
          data: JSON.stringify({ rfqId, submissionId }),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Anda menyetujui negosiasi. Total penawaran telah diperbarui.',
      });
    }

    if (action === 'REJECT') {
      await db.rFQSubmission.update({
        where: { id: submissionId },
        data: { negotiationStatus: 'REJECTED' },
      });
      await db.notification.create({
        data: {
          userId: submission.rfq.project.clientId,
          type: 'PROJECT_APPLICATION',
          title: 'Vendor Menolak Negosiasi',
          message: 'Vendor menolak permintaan negosiasi harga.',
          data: JSON.stringify({ rfqId, submissionId }),
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
      await db.rFQSubmission.update({
        where: { id: submissionId },
        data: {
          totalOffer: counter,
          negotiationStatus: 'COUNTERED',
          vendorCounterTotal: counter,
          vendorCounterMessage: (counterMessage || '').trim() || null,
        },
      });
      await db.notification.create({
        data: {
          userId: submission.rfq.project.clientId,
          type: 'PROJECT_APPLICATION',
          title: 'Vendor Mengajukan Counter',
          message: `Vendor mengajukan harga counter: Rp ${counter.toLocaleString('id-ID')}`,
          data: JSON.stringify({ rfqId, submissionId }),
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Counter penawaran telah dikirim ke client.',
      });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (e) {
    console.error('Negotiate respond error:', e);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
