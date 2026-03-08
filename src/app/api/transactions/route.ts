import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  getPaginationParams,
  PaginatedResponse,
  createNotification,
} from '@/lib/api-utils';
import { ProjectStatus, TransactionStatus, TransactionType, Prisma } from '@prisma/client';

// Validation schemas
const createTransactionSchema = z.object({
  type: z.enum(['PROJECT_PAYMENT', 'MATERIAL_PAYMENT', 'SUBSCRIPTION', 'WITHDRAWAL', 'REFUND'], {
    errorMap: () => ({ message: 'Tipe transaksi tidak valid' }),
  }),
  projectId: z.string().optional().nullable(),
  amount: z.number().positive('Jumlah harus bernilai positif'),
  fee: z.number().min(0, 'Biaya tidak boleh negatif').optional().default(0),
  paymentMethod: z.string().max(100, 'Metode pembayaran maksimal 100 karakter').optional(),
  paymentProof: z.string().url('URL bukti pembayaran tidak valid').optional().nullable(),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
});

// Transaction with related data type
interface TransactionWithRelations {
  id: string;
  userId: string;
  projectId: string | null;
  type: TransactionType;
  amount: number;
  fee: number;
  total: number;
  status: TransactionStatus;
  paymentMethod: string | null;
  paymentProof: string | null;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    role: string;
  };
  project?: {
    id: string;
    title: string;
    status: string;
    clientId: string;
    vendorId: string | null;
  } | null;
}

// GET /api/transactions - List transactions with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengakses data transaksi');
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // Get filter parameters
    const status = searchParams.get('status') as TransactionStatus | null;
    const type = searchParams.get('type') as TransactionType | null;
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');

    // Build where clause based on role
    let where: Prisma.TransactionWhereInput = {};

    switch (user.role) {
      case 'CLIENT':
        // Clients can see their own transactions (as payer)
        where.userId = user.id;
        if (status) where.status = status;
        if (type) where.type = type;
        if (projectId) where.projectId = projectId;
        break;

      case 'VENDOR':
        // Vendors can see transactions for their projects
        // They need to see payments for projects they work on
        where.project = {
          vendorId: user.id,
        };
        if (status) where.status = status;
        if (type) where.type = type;
        if (projectId) where.projectId = projectId;
        break;

      case 'ADMIN':
        // Admins can see all transactions
        if (status) where.status = status;
        if (type) where.type = type;
        if (projectId) where.projectId = projectId;
        if (userId) where.userId = userId;
        break;

      default:
        // Other roles (TUKANG, SUPPLIER) cannot access transactions
        return apiForbidden('Anda tidak memiliki akses ke data transaksi');
    }

    // Get total count
    const total = await db.transaction.count({ where });

    // Get transactions with relations
    const transactions = await db.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            clientId: true,
            vendorId: true,
          },
        },
      },
    });

    const response: PaginatedResponse<TransactionWithRelations> & { stats?: { totalCompleted: number; totalPending: number; totalCount: number } } = {
      data: transactions as TransactionWithRelations[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Stats untuk VENDOR: agregasi lengkap + fallback proyek tanpa transaksi
    if (user.role === 'VENDOR') {
      const vendorProjectIds = await db.project.findMany({
        where: { vendorId: user.id },
        select: { id: true, status: true, rfq: { select: { id: true } } },
      }).then((rows) => rows.map((p) => p.id));
      if (vendorProjectIds.length > 0) {
        const [completedAgg, pendingAgg, txProjectIds] = await Promise.all([
          db.transaction.aggregate({
            where: {
              projectId: { in: vendorProjectIds },
              type: TransactionType.PROJECT_PAYMENT,
              status: TransactionStatus.COMPLETED,
            },
            _sum: { total: true },
          }),
          db.transaction.aggregate({
            where: {
              projectId: { in: vendorProjectIds },
              type: TransactionType.PROJECT_PAYMENT,
              status: { in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
            },
            _sum: { total: true },
          }),
          db.transaction.findMany({
            where: { projectId: { in: vendorProjectIds }, type: TransactionType.PROJECT_PAYMENT },
            select: { projectId: true },
          }).then((rows) => new Set(rows.map((r) => r.projectId).filter(Boolean) as string[])),
        ]);
        const totalCompleted = completedAgg._sum.total ?? 0;
        let totalPending = pendingAgg._sum.total ?? 0;
        const vendorProjects = await db.project.findMany({
          where: { vendorId: user.id, id: { in: vendorProjectIds }, status: ProjectStatus.COMPLETED },
          select: { id: true, rfq: { select: { id: true } } },
        });
        const completedWithoutTx = vendorProjects.filter((p) => !txProjectIds.has(p.id));
        if (completedWithoutTx.length > 0) {
          const projectIdsNoTx = completedWithoutTx.map((p) => p.id);
          let rfqIds = completedWithoutTx.filter((p) => p.rfq?.id).map((p) => p.rfq!.id);
          let projectIdsWithRfqSet = new Set(completedWithoutTx.filter((p) => p.rfq?.id).map((p) => p.id));
          if (rfqIds.length === 0) {
            const rfqsByProject = await db.rFQ.findMany({
              where: { projectId: { in: projectIdsNoTx } },
              select: { id: true, projectId: true },
            });
            rfqIds = rfqsByProject.map((r) => r.id);
            rfqsByProject.forEach((r) => projectIdsWithRfqSet.add(r.projectId));
          }
          const projectIdsWithoutRfq = projectIdsNoTx.filter((id) => !projectIdsWithRfqSet.has(id));
          const [subs, apps] = await Promise.all([
            rfqIds.length > 0
              ? db.rFQSubmission.findMany({
                  where: { rfqId: { in: rfqIds }, vendorId: user.id, status: 'ACCEPTED' },
                  select: { totalOffer: true },
                })
              : Promise.resolve([]),
            projectIdsWithoutRfq.length > 0
              ? db.application.findMany({
                  where: {
                    projectId: { in: projectIdsWithoutRfq },
                    userId: user.id,
                    status: 'ACCEPTED',
                  },
                  select: { proposedBudget: true },
                })
              : Promise.resolve([]),
          ]);
          const fallbackAmount =
            subs.reduce((s, x) => s + (x.totalOffer ?? 0), 0) +
            apps.reduce((s, x) => s + (x.proposedBudget ?? 0), 0);
          totalPending += fallbackAmount;
        }
        response.stats = {
          totalCompleted,
          totalPending,
          totalCount: total,
        };
      } else {
        response.stats = { totalCompleted: 0, totalPending: 0, totalCount: 0 };
      }
    }

    return apiSuccess(response);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return apiError('Terjadi kesalahan saat mengambil data transaksi', 500);
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk membuat transaksi');
    }

    // Only CLIENT and ADMIN can create transactions
    if (user.role !== 'CLIENT' && user.role !== 'ADMIN') {
      return apiForbidden('Hanya klien yang dapat membuat transaksi pembayaran');
    }

    // User must be verified and active
    if (!user.isVerified || user.status !== 'ACTIVE') {
      return apiForbidden('Akun Anda belum terverifikasi atau tidak aktif');
    }

    const body = await request.json();

    // Validate input
    const validationResult = createTransactionSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return apiError(`Validasi gagal: ${errors}`, 400);
    }

    const data = validationResult.data;

    // If projectId is provided, verify the project exists and user has access
    if (data.projectId) {
      const project = await db.project.findUnique({
        where: { id: data.projectId },
        select: {
          id: true,
          title: true,
          clientId: true,
          vendorId: true,
          status: true,
        },
      });

      if (!project) {
        return apiError('Proyek tidak ditemukan', 404);
      }

      // For CLIENT, verify they own the project
      if (user.role === 'CLIENT' && project.clientId !== user.id) {
        return apiForbidden('Anda tidak memiliki akses ke proyek ini');
      }

      // Check project status - only allow payments for IN_PROGRESS projects
      if (project.status !== 'IN_PROGRESS' && data.type === 'PROJECT_PAYMENT') {
        return apiError('Pembayaran proyek hanya dapat dilakukan untuk proyek yang sedang berjalan', 400);
      }
    } else if (data.type === 'PROJECT_PAYMENT') {
      return apiError('Pembayaran proyek memerlukan ID proyek', 400);
    }

    // Calculate total amount
    const fee = data.fee || 0;
    const total = data.amount + fee;

    // Create transaction
    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        projectId: data.projectId || null,
        type: data.type as TransactionType,
        amount: data.amount,
        fee,
        total,
        status: 'PENDING',
        paymentMethod: data.paymentMethod || null,
        paymentProof: data.paymentProof || null,
        notes: data.notes || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            role: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            clientId: true,
            vendorId: true,
          },
        },
      },
    });

    // Notify admins about new payment for verification
    const admins = await db.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (admins.length > 0) {
      await Promise.all(
        admins.map((admin) =>
          createNotification(
            admin.id,
            'PAYMENT_RECEIVED',
            'Pembayaran Baru Diterima',
            `Pembayaran baru senilai ${new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(data.amount)} menunggu verifikasi`,
            { transactionId: transaction.id }
          )
        )
      );
    }

    // If transaction has project, notify the vendor
    if (transaction.projectId && transaction.project?.vendorId) {
      await createNotification(
        transaction.project.vendorId,
        'PAYMENT_RECEIVED',
        'Pembayaran Diterima',
        `Pembayaran untuk proyek "${transaction.project.title}" telah dikirim dan menunggu verifikasi`,
        { transactionId: transaction.id, projectId: transaction.projectId }
      );
    }

    return apiSuccess(transaction, 201);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return apiError('Terjadi kesalahan saat membuat transaksi', 500);
  }
}
