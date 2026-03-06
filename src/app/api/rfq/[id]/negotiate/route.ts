import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST: Client mengirim permintaan negosiasi (1x saja).
 * Body: { submissionId, requestedTotal, message }
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
    const { submissionId, requestedTotal, message } = body;

    if (!submissionId || requestedTotal == null || typeof requestedTotal !== 'number') {
      return NextResponse.json(
        { error: 'submissionId dan requestedTotal (number) wajib' },
        { status: 400 }
      );
    }

    const rfq = await db.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        project: { select: { clientId: true } },
        submissions: {
          where: { id: submissionId },
          select: {
            id: true,
            vendorId: true,
            totalOffer: true,
            originalTotalOffer: true,
            negotiationStatus: true,
            negotiationRequestedTotal: true,
          },
        },
      },
    });

    if (!rfq || rfq.submissions.length === 0) {
      return NextResponse.json({ error: 'RFQ atau penawaran tidak ditemukan' }, { status: 404 });
    }

    if (rfq.project.clientId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Hanya pemilik proyek yang dapat melakukan negosiasi' }, { status: 403 });
    }

    const submission = rfq.submissions[0];
    if (submission.negotiationRequestedTotal != null) {
      return NextResponse.json(
        { error: 'Anda hanya dapat mengajukan negosiasi satu kali untuk penawaran ini' },
        { status: 400 }
      );
    }

    const originalTotal = submission.originalTotalOffer ?? submission.totalOffer ?? 0;
    if (requestedTotal >= originalTotal) {
      return NextResponse.json(
        { error: 'Harga negosiasi harus lebih rendah dari total penawaran awal' },
        { status: 400 }
      );
    }

    await db.rFQSubmission.update({
      where: { id: submissionId },
      data: {
        negotiationRequestedTotal: requestedTotal,
        negotiationMessage: (message || '').trim() || null,
        negotiationStatus: 'PENDING',
      },
    });

    await db.notification.create({
      data: {
        userId: submission.vendorId,
        type: 'PROJECT_APPLICATION',
        title: 'Permintaan Negosiasi Harga',
        message: `Client meminta negosiasi untuk penawaran RFQ. Harga yang diminta: Rp ${requestedTotal.toLocaleString('id-ID')}`,
        data: JSON.stringify({ rfqId, submissionId }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Permintaan negosiasi telah dikirim ke vendor',
    });
  } catch (e) {
    console.error('Negotiate request error:', e);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
