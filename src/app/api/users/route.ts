import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { toSafeUser, hashPassword, validatePasswordStrength, validateEmail, SafeUser } from '@/lib/auth';
import { apiSuccess, apiError, withRole, getPaginationParams, PaginatedResponse } from '@/lib/api-utils';
import { UserRole, UserStatus } from '@prisma/client';

// Validation schema for creating user (admin only)
const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().max(20, 'Nomor telepon maksimal 20 karakter').optional(),
  role: z.enum(['CLIENT', 'VENDOR', 'TUKANG', 'SUPPLIER', 'ADMIN']).default('CLIENT'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).default('PENDING_VERIFICATION'),
  isVerified: z.boolean().default(false),
  // Optional profile fields
  ktpNumber: z.string().max(20).optional().nullable(),
  ktpPhoto: z.string().url().optional().nullable(),
  npwpNumber: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  bankName: z.string().max(50).optional().nullable(),
  bankAccountNumber: z.string().max(30).optional().nullable(),
  bankAccountName: z.string().max(100).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  experience: z.number().int().min(0).max(50).optional().nullable(),
});

// Query schema for listing users
const listUsersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  role: z.enum(['CLIENT', 'VENDOR', 'TUKANG', 'SUPPLIER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  search: z.string().max(100).optional(),
  isVerified: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'rating']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// GET /api/users - List all users (admin only)
export const GET = withRole(['ADMIN'], async (user: SafeUser, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validationResult = listUsersQuerySchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return apiError('Parameter query tidak valid', 400, validationResult.error.flatten());
    }

    const { 
      page = '1', 
      limit = '10', 
      role, 
      status, 
      search, 
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = validationResult.data;

    const { skip, page: pageNum, limit: limitNum } = getPaginationParams({ page, limit });

    // Build where clause
    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await db.user.count({ where });

    // Get users with pagination (User has cityId/city relation, no province field)
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        ktpNumber: true,
        city: {
          select: {
            id: true,
            name: true,
            province: { select: { id: true, name: true } },
          },
        },
        specialty: true,
        experience: true,
        rating: true,
        totalReviews: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projectsAsClient: true,
            projectsAsVendor: true,
            applications: true,
            reviewsReceived: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    const response: PaginatedResponse<typeof users[0]> = {
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('List users error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// POST /api/users - Create new user (admin only)
export const POST = withRole(['ADMIN'], async (user: SafeUser, request: NextRequest) => {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }

    const data = validationResult.data;

    // Validate email format
    if (!validateEmail(data.email)) {
      return apiError('Format email tidak valid', 400);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      return apiError('Password tidak memenuhi persyaratan keamanan', 400, passwordValidation.errors);
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return apiError('Email sudah terdaftar', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Prepare user data
    const { password, ...userData } = data;
    
    // Create user
    const newUser = await db.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        verifiedAt: userData.isVerified ? new Date() : null,
        verifiedBy: userData.isVerified ? user.id : null,
      },
    });

    return apiSuccess({
      message: 'Pengguna berhasil dibuat',
      user: toSafeUser(newUser),
    }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
