import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ApplicationStatus, UserRole } from '@prisma/client';

// Validation schema for creating an application
const createApplicationSchema = z.object({
  projectId: z.string().min(1, 'ID proyek wajib diisi'),
  coverLetter: z.string().max(2000, 'Surat lamaran maksimal 2000 karakter').optional(),
  proposedBudget: z.number().positive('Anggaran yang diajukan harus bernilai positif').optional(),
});

// Validation schema for query parameters
const listApplicationQuerySchema = z.object({
  status: z.nativeEnum(ApplicationStatus).optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

// GET /api/applications - List applications with filtering
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data lamaran' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = listApplicationQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      userId: searchParams.get('userId') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Parameter query tidak valid', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status, projectId, userId, page = 1, limit = 10 } = queryResult.data;

    // Build where clause based on role
    let whereClause: Record<string, unknown> = {};

    // Role-based filtering
    if (currentUser.role === UserRole.ADMIN) {
      // ADMIN can see all applications
      if (status) whereClause.status = status;
      if (projectId) whereClause.projectId = projectId;
      if (userId) whereClause.userId = userId;
    } else if (currentUser.role === UserRole.CLIENT) {
      // CLIENT can see applications for their projects
      if (projectId) {
        // Verify the project belongs to this client
        const project = await db.project.findFirst({
          where: { id: projectId, clientId: currentUser.id },
        });
        if (!project) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses ke proyek ini' },
            { status: 403 }
          );
        }
        whereClause.projectId = projectId;
      } else {
        // Get all applications for client's projects
        const clientProjectIds = await db.project.findMany({
          where: { clientId: currentUser.id },
          select: { id: true },
        });
        whereClause.projectId = { in: clientProjectIds.map(p => p.id) };
      }
      if (status) whereClause.status = status;
    } else if (currentUser.role === UserRole.VENDOR || currentUser.role === UserRole.TUKANG) {
      // VENDOR and TUKANG can only see their own applications
      whereClause.userId = currentUser.id;
      if (status) whereClause.status = status;
      if (projectId) whereClause.projectId = projectId;
    } else {
      // SUPPLIER cannot access applications
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke data lamaran' },
        { status: 403 }
      );
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get applications with relations
    const [applications, total] = await Promise.all([
      db.application.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              status: true,
              budget: true,
              location: true,
              startDate: true,
              endDate: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              specialty: true,
              rating: true,
              totalReviews: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.application.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create a new application
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengirim lamaran' },
        { status: 401 }
      );
    }

    // Only VENDOR and TUKANG can apply to projects
    if (currentUser.role !== UserRole.VENDOR && currentUser.role !== UserRole.TUKANG) {
      return NextResponse.json(
        { error: 'Hanya Vendor atau Tukang yang dapat mengirim lamaran' },
        { status: 403 }
      );
    }

    // Check if user is verified and active
    if (!currentUser.isVerified || currentUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Akun Anda belum terverifikasi atau tidak aktif' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = createApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { projectId, coverLetter, proposedBudget } = validationResult.data;

    // Check if project exists and is open for applications
    const project = await db.project.findUnique({
      where: { id: projectId },
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

    // Check project status
    if (project.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Proyek ini tidak menerima lamaran lagi' },
        { status: 400 }
      );
    }

    // Cannot apply to own project
    if (project.clientId === currentUser.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat melamar ke proyek sendiri' },
        { status: 400 }
      );
    }

    // Tukang applying to HARIAN: require active subscription if tukang subscription feature is enabled
    if (project.type === 'HARIAN' && currentUser.role === UserRole.TUKANG) {
      const platformSettings = await db.platformSettings.findUnique({ where: { id: 'default' } });
      if (platformSettings?.tukangSubscriptionEnabled) {
        const activeSub = await db.subscription.findFirst({
          where: {
            userId: currentUser.id,
            status: 'ACTIVE',
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
        });
        if (!activeSub) {
          return NextResponse.json(
            { error: 'Anda harus berlangganan untuk ikut apply proyek harian. Silakan beli langganan di menu Langganan.' },
            { status: 403 }
          );
        }
      }
    }

    // Check for existing application (duplicate prevention)
    const existingApplication = await db.application.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: currentUser.id,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Anda sudah mengirim lamaran untuk proyek ini' },
        { status: 409 }
      );
    }

    // Create application
    const application = await db.application.create({
      data: {
        projectId,
        userId: currentUser.id,
        coverLetter,
        proposedBudget,
        status: ApplicationStatus.PENDING,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            status: true,
            budget: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            specialty: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
      },
    });

    // Create notification for the project owner
    await db.notification.create({
      data: {
        userId: project.clientId,
        type: 'PROJECT_APPLICATION',
        title: 'Lamaran Baru',
        message: `${currentUser.name} mengirim lamaran untuk proyek "${project.title}"`,
        data: JSON.stringify({
          applicationId: application.id,
          projectId: project.id,
          applicantId: currentUser.id,
          applicantName: currentUser.name,
        }),
      },
    });

    return NextResponse.json({
      message: 'Lamaran berhasil dikirim',
      data: application,
    }, { status: 201 });
  } catch (error) {
    console.error('Create application error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
