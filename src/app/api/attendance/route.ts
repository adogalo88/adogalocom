import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AttendanceStatus } from '@prisma/client';

// =====================
// VALIDATION SCHEMAS
// =====================

const attendanceFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
  projectId: z.string().optional(),
  teamMemberId: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD format
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
});

const createAttendanceSchema = z.object({
  teamMemberId: z.string(),
  date: z.string(), // ISO date string
  status: z.nativeEnum(AttendanceStatus).default('PRESENT'),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
  photoProof: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  projectId: z.string(),
  date: z.string(), // ISO date string
  attendances: z.array(z.object({
    teamMemberId: z.string(),
    status: z.nativeEnum(AttendanceStatus),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    notes: z.string().optional(),
  })),
});

// =====================
// GET: List Attendance
// =====================

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengakses data absensi' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validationResult = attendanceFilterSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parameter tidak valid', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, projectId, teamMemberId, date, startDate, endDate, status } = validationResult.data;
    const skip = (page - 1) * limit;

    // Build filter
    const where: Record<string, unknown> = {};
    
    if (teamMemberId) {
      where.teamMemberId = teamMemberId;
    }
    
    if (date) {
      const dateObj = new Date(date);
      where.date = dateObj;
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    // Role-based filtering
    if (currentUser.role === 'CLIENT') {
      // Clients can see attendance for their projects
      if (projectId) {
        where.teamMember = { projectId };
      } else {
        // Get all projects owned by client
        const clientProjects = await db.project.findMany({
          where: { clientId: currentUser.id },
          select: { id: true },
        });
        where.teamMember = {
          projectId: { in: clientProjects.map(p => p.id) },
        };
      }
    } else if (currentUser.role === 'TUKANG') {
      // Tukang can only see their own attendance
      const teamMembership = await db.teamMember.findFirst({
        where: { userId: currentUser.id },
      });
      if (!teamMembership) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
        });
      }
      where.teamMemberId = teamMembership.id;
    }
    // ADMIN and VENDOR can see all

    // Get attendance with relations
    const [attendances, total] = await Promise.all([
      db.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          teamMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  specialty: true,
                },
              },
              project: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      db.attendance.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: attendances,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// =====================
// POST: Create/Update Attendance
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mencatat absensi' },
        { status: 401 }
      );
    }

    // Only CLIENT, VENDOR can record attendance
    if (currentUser.role !== 'CLIENT' && currentUser.role !== 'VENDOR' && currentUser.role !== 'TUKANG') {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mencatat absensi' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Check if bulk or single
    if ('attendances' in body) {
      // Bulk attendance
      const validationResult = bulkAttendanceSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Data tidak valid', details: validationResult.error.flatten() },
          { status: 400 }
        );
      }

      const { projectId, date, attendances } = validationResult.data;
      const dateObj = new Date(date);

      // Verify project access
      const project = await db.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return NextResponse.json(
          { error: 'Proyek tidak ditemukan' },
          { status: 404 }
        );
      }

      if (currentUser.role === 'CLIENT' && project.clientId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke proyek ini' },
          { status: 403 }
        );
      }

      // Create/update attendance for each team member
      const results = [];
      for (const att of attendances) {
        const teamMember = await db.teamMember.findUnique({
          where: { id: att.teamMemberId },
        });

        if (!teamMember || teamMember.projectId !== projectId) {
          continue;
        }

        const attendance = await db.attendance.upsert({
          where: {
            teamMemberId_date: {
              teamMemberId: att.teamMemberId,
              date: dateObj,
            },
          },
          create: {
            teamMemberId: att.teamMemberId,
            date: dateObj,
            status: att.status,
            checkIn: att.checkIn ? new Date(att.checkIn) : undefined,
            checkOut: att.checkOut ? new Date(att.checkOut) : undefined,
            notes: att.notes,
            recordedBy: currentUser.id,
          },
          update: {
            status: att.status,
            checkIn: att.checkIn ? new Date(att.checkIn) : undefined,
            checkOut: att.checkOut ? new Date(att.checkOut) : undefined,
            notes: att.notes,
          },
        });
        results.push(attendance);
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil mencatat ${results.length} absensi`,
        data: results,
      });

    } else {
      // Single attendance
      const validationResult = createAttendanceSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Data tidak valid', details: validationResult.error.flatten() },
          { status: 400 }
        );
      }

      const { teamMemberId, date, status, checkIn, checkOut, notes, photoProof } = validationResult.data;
      const dateObj = new Date(date);

      // Verify team member and project access
      const teamMember = await db.teamMember.findUnique({
        where: { id: teamMemberId },
        include: { project: true },
      });

      if (!teamMember) {
        return NextResponse.json(
          { error: 'Anggota tim tidak ditemukan' },
          { status: 404 }
        );
      }

      if (currentUser.role === 'CLIENT' && teamMember.project.clientId !== currentUser.id) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke proyek ini' },
          { status: 403 }
        );
      }

      // Create or update attendance
      const attendance = await db.attendance.upsert({
        where: {
          teamMemberId_date: {
            teamMemberId,
            date: dateObj,
          },
        },
        create: {
          teamMemberId,
          date: dateObj,
          status,
          checkIn: checkIn ? new Date(checkIn) : undefined,
          checkOut: checkOut ? new Date(checkOut) : undefined,
          notes,
          photoProof,
          recordedBy: currentUser.id,
        },
        update: {
          status,
          checkIn: checkIn ? new Date(checkIn) : undefined,
          checkOut: checkOut ? new Date(checkOut) : undefined,
          notes,
          photoProof,
        },
        include: {
          teamMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Absensi berhasil dicatat',
        data: attendance,
      });
    }

  } catch (error) {
    console.error('Create attendance error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
