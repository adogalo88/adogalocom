import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BOQStatus } from '@prisma/client';

// =====================
// VALIDATION SCHEMAS
// =====================

const boqFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(BOQStatus).optional(),
  projectId: z.string().optional(),
  vendorId: z.string().optional(),
});

const boqItemSchema = z.object({
  name: z.string().min(1, 'Nama item wajib diisi'),
  description: z.string().optional(),
  quantity: z.number().positive('Jumlah harus positif'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  unitPrice: z.number().nonnegative('Harga satuan tidak boleh negatif'),
});

const createBoqSchema = z.object({
  projectId: z.string().min(1, 'Proyek wajib dipilih'),
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200, 'Judul maksimal 200 karakter'),
  description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional(),
  items: z.array(boqItemSchema).min(1, 'Minimal 1 item BOQ diperlukan'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
  status: z.nativeEnum(BOQStatus).default('DRAFT'),
});

// =====================
// GET: List BOQs
// =====================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data BOQ' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = boqFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, status, projectId, vendorId } = validationResult.data;
    const skip = (page - 1) * limit;

    // Build filter based on role
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (currentUser.role === 'CLIENT') {
      // Clients can see BOQs for their projects
      where.project = { clientId: currentUser.id };
    } else if (currentUser.role === 'VENDOR' || currentUser.role === 'TUKANG') {
      // Vendors can see BOQs they created or are assigned to
      where.OR = [
        { vendorId: currentUser.id },
        { project: { vendorId: currentUser.id } },
      ];
    }
    // ADMIN can see all BOQs

    // Apply additional filters
    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = projectId;
    }
    if (vendorId && (currentUser.role === 'ADMIN' || vendorId === currentUser.id)) {
      where.vendorId = vendorId;
    }

    // Get BOQs with relations
    const [boqs, total] = await Promise.all([
      db.bOQ.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
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
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              rating: true,
              isVerified: true,
            },
          },
        },
      }),
      db.bOQ.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: boqs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error('Get BOQs error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// POST: Create BOQ
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk membuat BOQ' },
        { status: 401 }
      );
    }

    // Only VENDOR and ADMIN can create BOQs
    if (currentUser.role !== 'VENDOR' && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya vendor yang dapat membuat BOQ' },
        { status: 403 }
      );
    }

    // Check if user is verified
    if (!currentUser.isVerified || currentUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Akun Anda belum terverifikasi. Silakan lengkapi verifikasi terlebih dahulu.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validationResult = createBoqSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const boqData = validationResult.data;

    // Validate project exists
    const project = await db.project.findUnique({
      where: { id: boqData.projectId },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyek tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if project is in a valid state for BOQ
    if (project.status !== 'PUBLISHED' && project.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'BOQ hanya dapat dibuat untuk proyek yang sedang berjalan atau sudah dipublikasi' },
        { status: 400 }
      );
    }

    // Check if vendor is assigned or is the one who will submit
    // For submitted BOQ, check if vendor has applied or is assigned
    if (boqData.status === 'SUBMITTED') {
      const application = await db.application.findFirst({
        where: {
          projectId: boqData.projectId,
          userId: currentUser.id,
          status: { in: ['ACCEPTED', 'PENDING'] },
        },
      });

      if (!application && project.vendorId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Anda harus melamar atau ditugaskan ke proyek ini terlebih dahulu' },
          { status: 403 }
        );
      }
    }

    // Calculate total price
    const totalPrice = boqData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Create BOQ
    const boq = await db.bOQ.create({
      data: {
        projectId: boqData.projectId,
        vendorId: currentUser.id,
        title: boqData.title,
        description: boqData.description,
        totalPrice,
        items: JSON.stringify(boqData.items),
        status: boqData.status,
        notes: boqData.notes,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Create notification for client if submitted
    if (boqData.status === 'SUBMITTED') {
      await db.notification.create({
        data: {
          userId: project.client.id,
          type: 'PROJECT_APPLICATION',
          title: 'BOQ Baru Diterima',
          message: `${currentUser.name} mengirimkan BOQ "${boqData.title}" untuk proyek "${project.title}"`,
          data: JSON.stringify({ boqId: boq.id, projectId: project.id }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'BOQ berhasil dibuat',
      data: boq,
    }, { status: 201 });

  } catch (error) {
    console.error('Create BOQ error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
