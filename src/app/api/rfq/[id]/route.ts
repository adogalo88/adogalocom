import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RFQStatus, RFQSubmissionStatus } from '@prisma/client';

// =====================
// GET: Get RFQ by ID with all submissions
// =====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data RFQ' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const rfq = await db.rFQ.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            budget: true,
            startDate: true,
            endDate: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                phone: true,
              },
            },
          },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            prices: {
              include: {
                submission: {
                  include: {
                    vendor: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        rating: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        submissions: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                rating: true,
              },
            },
            prices: {
              include: {
                item: true,
              },
            },
            extraItems: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { totalOffer: 'asc' }, // Urutkan dari termurah
        },
      },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check access
    const isClient = rfq.project.client.id === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    const isVendor = currentUser.role === 'VENDOR';
    const isPublic = rfq.status === 'PUBLISHED' || rfq.status === 'CLOSED';
    const vendorHasSubmission = isVendor && rfq.submissions.some(s => s.vendorId === currentUser.id);

    if (!isClient && !isAdmin && !(isVendor && (isPublic || vendorHasSubmission))) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke RFQ ini' },
        { status: 403 }
      );
    }

    // For vendors, only show their own submission (no other vendors' data)
    let responseData = rfq;
    if (isVendor && !isClient && !isAdmin) {
      const vendorSubmission = rfq.submissions.find(s => s.vendorId === currentUser.id);
      responseData = {
        ...rfq,
        submissions: vendorSubmission ? [vendorSubmission] : [],
      };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Get RFQ error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// PUT: Update RFQ Status (Client: Publish/Close/Accept/Reject)
// =====================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengubah RFQ' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, submissionId } = body;

    // Get RFQ
    const rfq = await db.rFQ.findUnique({
      where: { id },
      include: {
        project: true,
        items: true,
        submissions: {
          include: {
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check authorization
    const isClient = rfq.project.clientId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isClient && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengubah RFQ ini' },
        { status: 403 }
      );
    }

    let newStatus: RFQStatus | undefined;
    let message = '';

    switch (action) {
      case 'publish':
        if (rfq.status !== 'DRAFT') {
          return NextResponse.json(
            { error: 'Hanya RFQ dengan status DRAFT yang dapat dipublish' },
            { status: 400 }
          );
        }
        newStatus = 'PUBLISHED';
        message = 'RFQ berhasil dipublish. Vendor dapat mengirim penawaran.';
        break;

      case 'close':
        if (rfq.status !== 'PUBLISHED') {
          return NextResponse.json(
            { error: 'Hanya RFQ yang dipublish yang dapat ditutup' },
            { status: 400 }
          );
        }
        newStatus = 'CLOSED';
        message = 'RFQ ditutup. Anda dapat mengevaluasi penawaran.';
        break;

      case 'accept':
        if (rfq.status !== 'PUBLISHED' && rfq.status !== 'CLOSED') {
          return NextResponse.json(
            { error: 'RFQ tidak dapat diterima pada status ini' },
            { status: 400 }
          );
        }
        if (!submissionId) {
          return NextResponse.json(
            { error: 'Pilih penawaran yang akan diterima' },
            { status: 400 }
          );
        }
        
        // Verify submission exists
        const submissionToAccept = rfq.submissions.find(s => s.id === submissionId);
        if (!submissionToAccept) {
          return NextResponse.json(
            { error: 'Penawaran tidak ditemukan' },
            { status: 400 }
          );
        }

        // Use transaction to update everything
        await db.$transaction(async (tx) => {
          // Accept selected submission
          await tx.rFQSubmission.update({
            where: { id: submissionId },
            data: { status: 'ACCEPTED' },
          });

          // Reject other submissions
          await tx.rFQSubmission.updateMany({
            where: {
              rfqId: id,
              id: { not: submissionId },
              status: 'SUBMITTED',
            },
            data: { status: 'REJECTED' },
          });

          // Update RFQ status
          await tx.rFQ.update({
            where: { id },
            data: { status: 'ACCEPTED' },
          });

          // Update project status and assign vendor
          await tx.project.update({
            where: { id: rfq.projectId },
            data: {
              status: 'IN_PROGRESS',
              vendorId: submissionToAccept.vendorId,
              acceptedAt: new Date(),
            },
          });

          // Notify accepted vendor
          await tx.notification.create({
            data: {
              userId: submissionToAccept.vendorId,
              type: 'PROJECT_ACCEPTED',
              title: 'Penawaran Diterima',
              message: `Penawaran Anda untuk RFQ "${rfq.title}" telah diterima!`,
              data: JSON.stringify({ rfqId: id, projectId: rfq.projectId }),
            },
          });

          // Notify rejected vendors
          const rejectedVendorIds = rfq.submissions
            .filter(s => s.id !== submissionId && s.status === 'SUBMITTED')
            .map(s => s.vendorId);

          for (const vendorId of rejectedVendorIds) {
            await tx.notification.create({
              data: {
                userId: vendorId,
                type: 'PROJECT_REJECTED',
                title: 'Penawaran Ditolak',
                message: `Penawaran Anda untuk RFQ "${rfq.title}" tidak diterima.`,
                data: JSON.stringify({ rfqId: id }),
              },
            });
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Penawaran diterima. Proyek akan dimulai.',
        });

      case 'reject':
        if (rfq.status !== 'PUBLISHED' && rfq.status !== 'CLOSED') {
          return NextResponse.json(
            { error: 'RFQ tidak dapat ditolak pada status ini' },
            { status: 400 }
          );
        }
        newStatus = 'REJECTED';
        message = 'RFQ ditolak';
        break;

      default:
        return NextResponse.json(
          { error: 'Aksi tidak valid' },
          { status: 400 }
        );
    }

    // Update RFQ status if needed
    if (newStatus) {
      await db.rFQ.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error('Update RFQ error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
