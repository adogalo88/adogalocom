import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { RFQStatus, RFQSubmissionStatus } from '@prisma/client';

// =====================
// VALIDATION SCHEMAS
// =====================

const rfqFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(RFQStatus).optional(),
  projectId: z.string().optional(),
});

const createSubmissionSchema = z.object({
  rfqId: z.string(),
  itemPrices: z.array(z.object({
    itemId: z.string(),
    unitPrice: z.number().positive('Harga harus positif'),
  })),
  notes: z.string().optional(),
});

// =====================
// GET: List RFQs
// =====================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data RFQ' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = rfqFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, status, projectId } = validationResult.data;
    const skip = (page - 1) * limit;

    // Build filter
    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    // Role-based filtering
    if (currentUser.role === 'CLIENT') {
      // Clients can only see RFQs for their own projects
      where.project = { clientId: currentUser.id };
    } else if (currentUser.role === 'VENDOR') {
      // Vendors can see published RFQs
      where.OR = [
        { status: 'PUBLISHED' },
        { status: 'CLOSED' },
        // Also show RFQs where they have submissions
        { submissions: { some: { vendorId: currentUser.id } } },
      ];
    }

    // Get RFQs with relations
    const [rfqs, total] = await Promise.all([
      db.rFQ.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              location: true,
              budget: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          submissions: {
            where: currentUser.role === 'VENDOR' 
              ? { vendorId: currentUser.id } 
              : undefined,
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
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      }),
      db.rFQ.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: rfqs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error('Get RFQs error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// POST: Create Submission (Vendor)
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengirim penawaran RFQ' },
        { status: 401 }
      );
    }

    // Only VENDOR can submit RFQ prices
    if (currentUser.role !== 'VENDOR') {
      return NextResponse.json(
        { error: 'Hanya vendor yang dapat mengirim penawaran RFQ' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = createSubmissionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { rfqId, itemPrices, notes } = validationResult.data;

    // Get RFQ
    const rfq = await db.rFQ.findUnique({
      where: { id: rfqId },
      include: { 
        items: true,
        project: { select: { clientId: true } },
      },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check RFQ status
    if (rfq.status !== 'PUBLISHED' && rfq.status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'RFQ tidak menerima penawaran lagi' },
        { status: 400 }
      );
    }

    // Check deadline
    if (rfq.deadline && new Date() > rfq.deadline) {
      return NextResponse.json(
        { error: 'Batas waktu penawaran sudah berakhir' },
        { status: 400 }
      );
    }

    // Check for existing submission
    const existingSubmission = await db.rFQSubmission.findUnique({
      where: {
        rfqId_vendorId: {
          rfqId,
          vendorId: currentUser.id,
        },
      },
    });

    if (existingSubmission && existingSubmission.status === 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Anda sudah mengirim penawaran untuk RFQ ini' },
        { status: 400 }
      );
    }

    // Validate all items have prices
    const rfqItemIds = new Set(rfq.items.map(i => i.id));
    const priceItemIds = new Set(itemPrices.map(p => p.itemId));
    
    for (const itemId of rfqItemIds) {
      if (!priceItemIds.has(itemId)) {
        return NextResponse.json(
          { error: 'Semua item harus diisi harganya' },
          { status: 400 }
        );
      }
    }

    // Calculate total
    let totalOffer = 0;
    const pricesData = itemPrices.map(ip => {
      const item = rfq.items.find(i => i.id === ip.itemId);
      if (!item) throw new Error('Item tidak ditemukan');
      const totalPrice = item.quantity * ip.unitPrice;
      totalOffer += totalPrice;
      return {
        itemId: ip.itemId,
        unitPrice: ip.unitPrice,
        totalPrice,
      };
    });

    // Create or update submission
    const submission = await db.rFQSubmission.upsert({
      where: {
        rfqId_vendorId: {
          rfqId,
          vendorId: currentUser.id,
        },
      },
      create: {
        rfqId,
        vendorId: currentUser.id,
        status: 'SUBMITTED',
        notes,
        totalOffer,
        submittedAt: new Date(),
        prices: {
          create: pricesData,
        },
      },
      update: {
        status: 'SUBMITTED',
        notes,
        totalOffer,
        submittedAt: new Date(),
        prices: {
          deleteMany: {},
          create: pricesData,
        },
      },
      include: {
        prices: {
          include: {
            item: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify client
    await db.notification.create({
      data: {
        userId: rfq.project.clientId,
        type: 'PROJECT_APPLICATION',
        title: 'Penawaran RFQ Baru',
        message: `${currentUser.name} mengirim penawaran untuk RFQ "${rfq.title}"`,
        data: JSON.stringify({ rfqId, submissionId: submission.id }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Penawaran berhasil dikirim',
      data: submission,
    }, { status: 201 });

  } catch (error) {
    console.error('Create RFQ submission error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
