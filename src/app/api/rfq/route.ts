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
    vendorNotes: z.string().optional(),
  })),
  extraItems: z.array(z.object({
    itemName: z.string(),
    spesifikasi: z.string().optional(),
    quantity: z.number().min(0),
    unit: z.string(),
    unitPrice: z.number().min(0),
    vendorNotes: z.string().optional(),
  })).optional().default([]),
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

    // Get RFQs with relations (_count not supported inside include in Prisma, use submissions.length instead)
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
              address: true,
              budget: true,
              cityId: true,
              city: {
                select: { id: true, name: true, province: { select: { name: true } } },
              },
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
        },
      }),
      db.rFQ.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Attach _count.submissions from array length for frontend compatibility
    const data = rfqs.map((r) => ({
      ...r,
      _count: { submissions: r.submissions.length },
    }));

    return NextResponse.json({
      success: true,
      data,
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
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return NextResponse.json(
      { error: message },
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

    const { rfqId, itemPrices, extraItems = [], notes } = validationResult.data;

    // Get RFQ with project (offerDeadline on project)
    const rfq = await db.rFQ.findUnique({
      where: { id: rfqId },
      include: { 
        items: true,
        project: { select: { clientId: true, offerDeadline: true, status: true } },
      },
    });

    if (!rfq) {
      return NextResponse.json(
        { error: 'RFQ tidak ditemukan' },
        { status: 404 }
      );
    }

    // Allow submission when project is PUBLISHED and offer deadline not passed.
    // (RFQ record may still be DRAFT when project is approved; treat as open.)
    if (rfq.project.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Proyek belum dipublikasi atau tidak menerima penawaran' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (rfq.project.offerDeadline && now > rfq.project.offerDeadline) {
      return NextResponse.json(
        { error: 'Batas akhir penawaran telah lewat. Proyek kadaluarsa.' },
        { status: 400 }
      );
    }
    if (rfq.deadline && now > rfq.deadline) {
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
        vendorNotes: ip.vendorNotes?.trim() || null,
      };
    });

    const extraItemsData = extraItems.map((ei, idx) => {
      const totalPrice = (ei.quantity || 0) * (ei.unitPrice || 0);
      totalOffer += totalPrice;
      return {
        itemName: (ei.itemName || '').trim() || 'Item',
        spesifikasi: ei.spesifikasi?.trim() || null,
        quantity: Number(ei.quantity) || 0,
        unit: (ei.unit || 'pcs').trim(),
        unitPrice: Number(ei.unitPrice) || 0,
        totalPrice,
        vendorNotes: ei.vendorNotes?.trim() || null,
        sortOrder: idx,
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
        extraItems: {
          create: extraItemsData,
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
        extraItems: {
          deleteMany: {},
          create: extraItemsData,
        },
      },
      include: {
        prices: {
          include: {
            item: true,
          },
        },
        extraItems: { orderBy: { sortOrder: 'asc' } },
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
