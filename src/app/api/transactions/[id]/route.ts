import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  createNotification,
} from '@/lib/api-utils';
import { TransactionStatus } from '@prisma/client';

// Validation schema for update
const updateTransactionSchema = z.object({
  status: z
    .enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'], {
      errorMap: () => ({ message: 'Status transaksi tidak valid' }),
    })
    .optional(),
  paymentProof: z.string().url('URL bukti pembayaran tidak valid').optional().nullable(),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
  rejectionReason: z.string().max(500, 'Alasan penolakan maksimal 500 karakter').optional().nullable(),
});

// Transaction with related data type
interface TransactionWithRelations {
  id: string;
  userId: string;
  projectId: string | null;
  type: string;
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
    budget: number | null;
    clientId: string;
    vendorId: string | null;
    client: {
      id: string;
      name: string;
      email: string;
    };
    vendor: {
      id: string;
      name: string;
      email: string;
    } | null;
  } | null;
  verifier?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// GET /api/transactions/[id] - Get single transaction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengakses data transaksi');
    }

    const { id } = await params;

    const transaction = await db.transaction.findUnique({
      where: { id },
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
            budget: true,
            clientId: true,
            vendorId: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
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
        },
      },
    });

    if (!transaction) {
      return apiNotFound('Transaksi tidak ditemukan');
    }

    // Get verifier info if exists
    let verifier = null;
    if (transaction.verifiedBy) {
      verifier = await db.user.findUnique({
        where: { id: transaction.verifiedBy },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    // Check access permissions
    const isOwner = transaction.userId === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isProjectVendor = transaction.project?.vendorId === user.id;
    const isProjectClient = transaction.project?.clientId === user.id;

    // CLIENT: can see their own transactions
    if (user.role === 'CLIENT' && !isOwner && !isProjectClient) {
      return apiForbidden('Anda tidak memiliki akses ke transaksi ini');
    }

    // VENDOR: can see transactions for their projects
    if (user.role === 'VENDOR' && !isProjectVendor) {
      return apiForbidden('Anda tidak memiliki akses ke transaksi ini');
    }

    // Other roles cannot access
    if (user.role !== 'CLIENT' && user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      return apiForbidden('Anda tidak memiliki akses ke transaksi ini');
    }

    const response: TransactionWithRelations = {
      ...transaction,
      verifier,
    } as TransactionWithRelations;

    return apiSuccess(response);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return apiError('Terjadi kesalahan saat mengambil data transaksi', 500);
  }
}

// PATCH /api/transactions/[id] - Update transaction (verify/reject payment)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiUnauthorized('Anda harus login untuk mengubah transaksi');
    }

    const { id } = await params;

    // Get existing transaction
    const existingTransaction = await db.transaction.findUnique({
      where: { id },
      include: {
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

    if (!existingTransaction) {
      return apiNotFound('Transaksi tidak ditemukan');
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateTransactionSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return apiError(`Validasi gagal: ${errors}`, 400);
    }

    const data = validationResult.data;

    // Determine what actions are allowed based on role
    const isOwner = existingTransaction.userId === user.id;
    const isAdmin = user.role === 'ADMIN';

    // Non-admin users can only update payment proof and notes on their own PENDING transactions
    if (!isAdmin) {
      if (!isOwner) {
        return apiForbidden('Anda tidak memiliki akses untuk mengubah transaksi ini');
      }

      if (existingTransaction.status !== 'PENDING') {
        return apiForbidden('Hanya transaksi dengan status PENDING yang dapat diubah');
      }

      // Non-admin can only update paymentProof and notes
      const allowedUpdates = ['paymentProof', 'notes'];
      const attemptedUpdates = Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined);
      const hasDisallowedUpdates = attemptedUpdates.some((key) => !allowedUpdates.includes(key));

      if (hasDisallowedUpdates) {
        return apiForbidden('Anda hanya dapat mengubah bukti pembayaran dan catatan');
      }

      // Update transaction
      const updateData: Record<string, unknown> = {};
      if (data.paymentProof !== undefined) updateData.paymentProof = data.paymentProof;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const transaction = await db.transaction.update({
        where: { id },
        data: updateData,
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
              budget: true,
              clientId: true,
              vendorId: true,
            },
          },
        },
      });

      return apiSuccess(transaction);
    }

    // Admin-only operations: verify/reject payments
    if (isAdmin) {
      // Business rules for status transitions
      if (data.status) {
        const currentStatus = existingTransaction.status;
        const newStatus = data.status as TransactionStatus;

        // Cannot change from COMPLETED, FAILED, or CANCELLED
        if (currentStatus === 'COMPLETED' || currentStatus === 'FAILED' || currentStatus === 'CANCELLED') {
          return apiError(`Transaksi dengan status ${currentStatus} tidak dapat diubah`, 400);
        }

        // If verifying (COMPLETED), require payment proof
        if (newStatus === 'COMPLETED' && !existingTransaction.paymentProof && !data.paymentProof) {
          return apiError('Bukti pembayaran diperlukan untuk memverifikasi transaksi', 400);
        }

        // If rejecting (FAILED or CANCELLED), require rejection reason
        if ((newStatus === 'FAILED' || newStatus === 'CANCELLED') && !data.rejectionReason) {
          return apiError('Alasan penolakan diperlukan untuk menolak transaksi', 400);
        }
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (data.status !== undefined) {
        updateData.status = data.status;

        // If verifying, set verifiedAt and verifiedBy
        if (data.status === 'COMPLETED') {
          updateData.verifiedAt = new Date();
          updateData.verifiedBy = user.id;
        }

        // If rejecting, clear verifiedAt if exists
        if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          updateData.verifiedAt = null;
          updateData.verifiedBy = null;
        }
      }
      if (data.paymentProof !== undefined) updateData.paymentProof = data.paymentProof;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

      // Update transaction
      const transaction = await db.transaction.update({
        where: { id },
        data: updateData,
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
              budget: true,
              clientId: true,
              vendorId: true,
            },
          },
        },
      });

      // Create notifications based on status change
      if (data.status === 'COMPLETED') {
        // Notify transaction owner
        await createNotification(
          existingTransaction.userId,
          'PAYMENT_VERIFIED',
          'Pembayaran Diverifikasi',
          `Pembayaran senilai ${new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(existingTransaction.amount)} telah diverifikasi`,
          { transactionId: existingTransaction.id }
        );

        // Notify project vendor if exists
        if (existingTransaction.project?.vendorId && existingTransaction.project.vendorId !== existingTransaction.userId) {
          await createNotification(
            existingTransaction.project.vendorId,
            'PAYMENT_VERIFIED',
            'Pembayaran Diverifikasi',
            `Pembayaran untuk proyek "${existingTransaction.project.title}" telah diverifikasi`,
            { transactionId: existingTransaction.id, projectId: existingTransaction.projectId }
          );
        }
      } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        // Notify transaction owner about rejection
        await createNotification(
          existingTransaction.userId,
          'PAYMENT_REJECTED',
          'Pembayaran Ditolak',
          `Pembayaran senilai ${new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(existingTransaction.amount)} ditolak: ${data.rejectionReason}`,
          { transactionId: existingTransaction.id }
        );
      }

      // Get verifier info
      let verifier = null;
      if (transaction.verifiedBy) {
        verifier = await db.user.findUnique({
          where: { id: transaction.verifiedBy },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
      }

      return apiSuccess({
        ...transaction,
        verifier,
      });
    }

    return apiForbidden('Akses ditolak');
  } catch (error) {
    console.error('Error updating transaction:', error);
    return apiError('Terjadi kesalahan saat mengubah transaksi', 500);
  }
}
