import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { TukangRole, SalaryType } from '@prisma/client';

// =====================
// VALIDATION SCHEMAS
// =====================

const teamMemberFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  role: z.nativeEnum(TukangRole).optional(),
  isActive: z.coerce.boolean().optional(),
});

const createTeamMemberSchema = z.object({
  projectId: z.string().min(1, 'Proyek wajib dipilih'),
  userId: z.string().min(1, 'Pekerja wajib dipilih'),
  role: z.nativeEnum(TukangRole, {
    errorMap: () => ({ message: 'Peran tukang tidak valid' }),
  }),
  salaryType: z.nativeEnum(SalaryType, {
    errorMap: () => ({ message: 'Tipe gaji tidak valid' }),
  }),
  salaryAmount: z.number().positive('Jumlah gaji harus positif'),
  startDate: z.string().datetime({ message: 'Format tanggal mulai tidak valid' }).optional(),
  endDate: z.string().datetime({ message: 'Format tanggal selesai tidak valid' }).optional(),
  isActive: z.boolean().default(true),
});

// =====================
// GET: List Team Members
// =====================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data anggota tim' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = teamMemberFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, projectId, userId, role, isActive } = validationResult.data;
    const skip = (page - 1) * limit;

    // Build filter based on role
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (currentUser.role === 'CLIENT') {
      // Clients can see team members for their projects
      where.project = { clientId: currentUser.id };
    } else if (currentUser.role === 'VENDOR') {
      // Vendors can see team members for projects they manage
      where.project = { vendorId: currentUser.id };
    } else if (currentUser.role === 'TUKANG') {
      // Tukang can only see their own team memberships
      where.userId = currentUser.id;
    }
    // ADMIN can see all team members

    // Apply additional filters
    if (projectId) {
      where.projectId = projectId;
    }
    if (userId && (currentUser.role === 'ADMIN' || userId === currentUser.id)) {
      where.userId = userId;
    }
    if (role) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get team members with relations
    const [teamMembers, total] = await Promise.all([
      db.teamMember.findMany({
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
              location: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
              vendor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
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
              phone: true,
              specialty: true,
              experience: true,
              rating: true,
              totalReviews: true,
              isVerified: true,
            },
          },
          _count: {
            select: {
              salaryPayments: true,
            },
          },
        },
      }),
      db.teamMember.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: teamMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// POST: Add Team Member
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk menambah anggota tim' },
        { status: 401 }
      );
    }

    // Only CLIENT, VENDOR and ADMIN can add team members
    if (currentUser.role !== 'CLIENT' && currentUser.role !== 'VENDOR' && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya klien atau vendor yang dapat menambah anggota tim' },
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
    
    const validationResult = createTeamMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const memberData = validationResult.data;

    // Validate project exists and user has access
    const project = await db.project.findUnique({
      where: { id: memberData.projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Proyek tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check permissions
    const isProjectClient = project.clientId === currentUser.id;
    const isProjectVendor = project.vendorId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isProjectClient && !isProjectVendor && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke proyek ini' },
        { status: 403 }
      );
    }

    // Check if project is in valid state
    if (project.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Anggota tim hanya dapat ditambahkan ke proyek yang sedang berjalan' },
        { status: 400 }
      );
    }

    // Validate user exists and is a TUKANG
    const userToAdd = await db.user.findUnique({
      where: { id: memberData.userId },
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    if (userToAdd.role !== 'TUKANG') {
      return NextResponse.json(
        { error: 'Hanya pengguna dengan peran TUKANG yang dapat ditambahkan ke tim' },
        { status: 400 }
      );
    }

    if (!userToAdd.isVerified || userToAdd.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Pengguna belum terverifikasi atau tidak aktif' },
        { status: 400 }
      );
    }

    // Check if already a team member
    const existingMember = await db.teamMember.findUnique({
      where: {
        projectId_userId: {
          projectId: memberData.projectId,
          userId: memberData.userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'Pengguna sudah menjadi anggota tim proyek ini' },
        { status: 409 }
      );
    }

    // Validate dates
    if (memberData.startDate && memberData.endDate) {
      const startDate = new Date(memberData.startDate);
      const endDate = new Date(memberData.endDate);
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'Tanggal selesai harus lebih besar dari tanggal mulai' },
          { status: 400 }
        );
      }
    }

    // Create team member
    const teamMember = await db.teamMember.create({
      data: {
        projectId: memberData.projectId,
        userId: memberData.userId,
        role: memberData.role,
        salaryType: memberData.salaryType,
        salaryAmount: memberData.salaryAmount,
        startDate: memberData.startDate ? new Date(memberData.startDate) : undefined,
        endDate: memberData.endDate ? new Date(memberData.endDate) : undefined,
        isActive: memberData.isActive,
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            specialty: true,
            experience: true,
            rating: true,
          },
        },
      },
    });

    // Create notification for the added user
    await db.notification.create({
      data: {
        userId: memberData.userId,
        type: 'PROJECT_ACCEPTED',
        title: 'Ditambahkan ke Tim Proyek',
        message: `Anda telah ditambahkan ke tim proyek "${project.title}" sebagai ${memberData.role.replace(/_/g, ' ')}`,
        data: JSON.stringify({ projectId: project.id, teamMemberId: teamMember.id }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Anggota tim berhasil ditambahkan',
      data: teamMember,
    }, { status: 201 });

  } catch (error) {
    console.error('Create team member error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
