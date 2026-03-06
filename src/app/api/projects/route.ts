import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ProjectStatus, ProjectType, TenderSubtype } from '@prisma/client';
import { saveFiles } from '@/lib/upload';

// =====================
// VALIDATION SCHEMAS
// =====================

const projectFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(ProjectStatus).optional(),
  type: z.nativeEnum(ProjectType).optional(),
  tenderSubtype: z.nativeEnum(TenderSubtype).optional(),
  categoryId: z.string().optional(),
  clientId: z.string().optional(),
  vendorId: z.string().optional(),
  cityId: z.string().optional(),
  provinceId: z.string().optional(),
  search: z.string().optional(),
  skillIds: z.string().optional(), // comma-separated for proyek harian
});

const createProjectSchema = z.object({
  title: z.string().min(5, 'Judul proyek minimal 5 karakter').max(200, 'Judul proyek maksimal 200 karakter'),
  description: z.string().min(20, 'Deskripsi proyek minimal 20 karakter').max(5000, 'Deskripsi proyek maksimal 5000 karakter'),
  type: z.nativeEnum(ProjectType).default('TENDER'),
  tenderSubtype: z.nativeEnum(TenderSubtype).default('WITHOUT_RFQ'),
  budget: z.number().positive('Budget harus berupa angka positif').optional(),
  cityId: z.string().optional(), // Reference to City
  address: z.string().max(500, 'Alamat maksimal 500 karakter').optional(), // Detailed address
  workerNeeded: z.number().int().positive('Jumlah pekerja harus berupa angka positif').optional(),
  requirements: z.string().optional(), // JSON string
  photos: z.string().optional(), // JSON array of photo URLs
  files: z.string().optional(), // JSON array of file URLs
  startDate: z.string().datetime({ message: 'Format tanggal mulai tidak valid' }).optional(),
  endDate: z.string().datetime({ message: 'Format tanggal selesai tidak valid' }).optional(),
  offerDeadline: z.string().datetime().optional(), // Batas akhir penawaran (TENDER)
  applicationDeadline: z.string().datetime().optional(), // Batas akhir lamaran (HARIAN)
  minSalary: z.number().min(0).optional().nullable(), // Gaji minimum (HARIAN)
  maxSalary: z.number().min(0).optional().nullable(), // Gaji maksimum (HARIAN)
  categoryId: z.string().optional(),
  skillIds: z.array(z.string()).optional(),
  status: z.nativeEnum(ProjectStatus).default('DRAFT'),
  // RFQ items for WITH_RFQ subtype
  rfqItems: z.array(z.object({
    itemName: z.string().min(1, 'Nama item harus diisi'),
    description: z.string().optional(),
    quantity: z.number().positive('Jumlah harus positif'),
    unit: z.string().min(1, 'Satuan harus diisi'),
  })).optional(),
});

// =====================
// GET: List Projects
// =====================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data proyek' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = projectFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, status, type, categoryId, clientId, vendorId, cityId, provinceId, search, skillIds: skillIdsParam } = validationResult.data;
    const skillIds = skillIdsParam ? skillIdsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const skip = (page - 1) * limit;

    // Build filter based on role
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (currentUser.role === 'CLIENT') {
      // Clients can only see their own projects
      where.clientId = currentUser.id;
    } else if (currentUser.role === 'VENDOR' || currentUser.role === 'TUKANG') {
      // Vendors can see published projects (for applying)
      // and projects they are assigned to
      where.OR = [
        { status: 'PUBLISHED' },
        { vendorId: currentUser.id },
      ];
    }
    // ADMIN can see all projects

    // Apply additional filters
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (clientId && currentUser.role === 'ADMIN') {
      where.clientId = clientId;
    }
    if (vendorId && (currentUser.role === 'ADMIN' || vendorId === currentUser.id)) {
      where.vendorId = vendorId;
    }
    if (cityId) {
      where.cityId = cityId;
    }
    if (provinceId) {
      where.city = { provinceId };
    }
    if (search) {
      where.OR = where.OR 
        ? [...where.OR, { title: { contains: search } }, { description: { contains: search } }]
        : [{ title: { contains: search } }, { description: { contains: search } }];
    }
    if (skillIds.length > 0) {
      where.skills = { some: { id: { in: skillIds } } };
    }

    // Get projects with relations
    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          city: {
            select: {
              id: true,
              name: true,
              province: {
                select: { id: true, name: true }
              }
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              rating: true,
              totalReviews: true,
              isVerified: true,
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
              totalReviews: true,
              isVerified: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          skills: {
            select: { id: true, name: true },
          },
          rfq: {
            select: {
              id: true,
              _count: { select: { submissions: true } },
            },
          },
          _count: {
            select: {
              applications: true,
              boqs: true,
              teamMembers: true,
              materials: true,
            },
          },
        },
      }),
      db.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const now = new Date();
    const withEffectiveStatus = projects.map((p) => {
      let effectiveStatus = p.status;
      if (p.status === 'PUBLISHED') {
        if (p.type === 'TENDER' && p.offerDeadline && now > p.offerDeadline) effectiveStatus = 'EXPIRED';
        if (p.type === 'HARIAN' && p.applicationDeadline && now > p.applicationDeadline) effectiveStatus = 'EXPIRED';
      }
      return { ...p, status: effectiveStatus, offerDeadline: p.offerDeadline, applicationDeadline: p.applicationDeadline, minSalary: p.minSalary, maxSalary: p.maxSalary };
    });

    return NextResponse.json({
      success: true,
      data: withEffectiveStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// POST: Create Project
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk membuat proyek' },
        { status: 401 }
      );
    }

    // Only CLIENT and ADMIN can create projects
    if (currentUser.role !== 'CLIENT' && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya klien yang dapat membuat proyek' },
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
    
    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const projectData = validationResult.data;

    // Validate RFQ items if subtype is WITH_RFQ
    if (projectData.type === 'TENDER' && projectData.tenderSubtype === 'WITH_RFQ') {
      if (!projectData.rfqItems || projectData.rfqItems.length === 0) {
        return NextResponse.json(
          { error: 'Item RFQ harus diisi untuk proyek TENDER dengan RFQ' },
          { status: 400 }
        );
      }
    }

    // Validate city exists if provided
    if (projectData.cityId) {
      const city = await db.city.findUnique({
        where: { id: projectData.cityId },
      });

      if (!city) {
        return NextResponse.json(
          { error: 'Kota tidak ditemukan' },
          { status: 400 }
        );
      }
    }

    // Validate category exists if provided
    if (projectData.categoryId) {
      const category = await db.category.findUnique({
        where: { id: projectData.categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Kategori tidak ditemukan' },
          { status: 400 }
        );
      }
    }

    // Validate dates
    if (projectData.startDate && projectData.endDate) {
      const startDate = new Date(projectData.startDate);
      const endDate = new Date(projectData.endDate);
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'Tanggal selesai harus lebih besar dari tanggal mulai' },
          { status: 400 }
        );
      }
    }

    // Client submit → status Menunggu peninjauan; Admin can create as DRAFT or submit for review
    const isClient = currentUser.role === 'CLIENT';
    const initialStatus = isClient ? 'PENDING_VERIFICATION' : (projectData.status === 'DRAFT' ? 'DRAFT' : 'PENDING_VERIFICATION');

    // Create project with RFQ if needed
    const project = await db.project.create({
      data: {
        title: projectData.title,
        description: projectData.description,
        type: projectData.type,
        tenderSubtype: projectData.tenderSubtype,
        status: initialStatus,
        budget: projectData.budget,
        cityId: projectData.cityId,
        address: projectData.address,
        workerNeeded: projectData.workerNeeded,
        requirements: projectData.requirements,
        photos: projectData.photos,
        files: projectData.files,
        startDate: projectData.startDate ? new Date(projectData.startDate) : undefined,
        endDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
        offerDeadline: projectData.offerDeadline ? new Date(projectData.offerDeadline) : undefined,
        applicationDeadline: projectData.applicationDeadline ? new Date(projectData.applicationDeadline) : undefined,
        minSalary: projectData.minSalary ?? undefined,
        maxSalary: projectData.maxSalary ?? undefined,
        categoryId: projectData.categoryId,
        clientId: currentUser.id,
        ...(projectData.skillIds && projectData.skillIds.length > 0 ? {
          skills: { connect: projectData.skillIds.map((id: string) => ({ id })) },
        } : {}),
        // Create RFQ if subtype is WITH_RFQ
        ...(projectData.type === 'TENDER' && projectData.tenderSubtype === 'WITH_RFQ' && projectData.rfqItems ? {
          rfq: {
            create: {
              title: `RFQ - ${projectData.title}`,
              status: 'DRAFT',
              items: {
                create: projectData.rfqItems.map((item, index) => ({
                  itemName: item.itemName,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  sortOrder: index,
                })),
              },
            },
          },
        } : {}),
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            province: {
              select: { id: true, name: true }
            }
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        rfq: {
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: isClient ? 'Proyek berhasil diajukan. Menunggu peninjauan admin.' : 'Proyek berhasil dibuat',
      data: project,
      project, // for hooks that expect result.project
    }, { status: 201 });

  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
