import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { MaterialStatus, ProjectStatus, TransactionStatus, TransactionType } from '@prisma/client';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    switch (user.role) {
      case 'CLIENT': {
        const [totalProjects, activeProjects, materialRequests, spendingResult] = await Promise.all([
          db.project.count({ where: { clientId: user.id } }),
          db.project.count({ where: { clientId: user.id, status: ProjectStatus.IN_PROGRESS } }),
          db.material.count({ where: { clientId: user.id } }),
          db.transaction.aggregate({
            where: { userId: user.id, status: TransactionStatus.COMPLETED },
            _sum: { total: true },
          }),
        ]);
        return NextResponse.json({
          totalProjects,
          activeProjects,
          materialRequests,
          totalSpending: spendingResult._sum.total ?? 0,
        });
      }
      case 'VENDOR': {
        // Proyek yang vendor ini kerjakan (sebagai vendorId)
        const vendorProjects = await db.project.findMany({
          where: { vendorId: user.id },
          select: { id: true, status: true },
          include: { rfq: { select: { id: true } } },
        });
        const vendorProjectIds = vendorProjects.map((p) => p.id);

        const [projectsCompleted, projectsActive, teamMembers, revenueResult, pendingResult, projectIdsWithTx] =
          await Promise.all([
            db.project.count({ where: { vendorId: user.id, status: ProjectStatus.COMPLETED } }),
            db.project.count({ where: { vendorId: user.id, status: ProjectStatus.IN_PROGRESS } }),
            db.teamMember.count({ where: { project: { vendorId: user.id } } }),
            vendorProjectIds.length > 0
              ? db.transaction.aggregate({
                  where: {
                    projectId: { in: vendorProjectIds },
                    status: TransactionStatus.COMPLETED,
                    type: TransactionType.PROJECT_PAYMENT,
                  },
                  _sum: { total: true },
                })
              : Promise.resolve({ _sum: { total: null } }),
            vendorProjectIds.length > 0
              ? db.transaction.aggregate({
                  where: {
                    projectId: { in: vendorProjectIds },
                    status: { in: [TransactionStatus.PENDING, TransactionStatus.PROCESSING] },
                    type: TransactionType.PROJECT_PAYMENT,
                  },
                  _sum: { total: true },
                })
              : Promise.resolve({ _sum: { total: null } }),
            vendorProjectIds.length > 0
              ? db.transaction
                  .findMany({
                    where: {
                      projectId: { in: vendorProjectIds },
                      type: TransactionType.PROJECT_PAYMENT,
                    },
                    select: { projectId: true },
                  })
                  .then((rows) => new Set(rows.map((r) => r.projectId).filter(Boolean) as string[]))
              : Promise.resolve(new Set<string>()),
          ]);

        // Proyek selesai yang belum punya record transaksi: ambil nilai dari rfq_submissions (ACCEPTED) atau application (ACCEPTED)
        let revenueFromMissingTx = 0;
        const completedWithoutTx = vendorProjects.filter(
          (p) => p.status === ProjectStatus.COMPLETED && !projectIdsWithTx.has(p.id)
        );
        if (completedWithoutTx.length > 0) {
          const projectIdsNoTx = completedWithoutTx.map((p) => p.id);
          const projectIdsWithRfq = new Set(completedWithoutTx.filter((p) => p.rfq?.id).map((p) => p.id));
          const rfqIds = completedWithoutTx.filter((p) => p.rfq?.id).map((p) => p.rfq!.id);
          const projectIdsWithoutRfq = projectIdsNoTx.filter((id) => !projectIdsWithRfq.has(id));
          const [acceptedSubmissions, acceptedApplications] = await Promise.all([
            rfqIds.length > 0
              ? db.rFQSubmission.findMany({
                  where: {
                    rfqId: { in: rfqIds },
                    vendorId: user.id,
                    status: 'ACCEPTED',
                  },
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
          revenueFromMissingTx =
            acceptedSubmissions.reduce((s, sub) => s + (sub.totalOffer ?? 0), 0) +
            acceptedApplications.reduce((s, app) => s + (app.proposedBudget ?? 0), 0);
        }

        const revenueFromTx = revenueResult._sum.total ?? 0;
        const pendingFromTx = pendingResult._sum.total ?? 0;
        return NextResponse.json({
          projectsCompleted,
          projectsActive,
          teamMembers,
          revenue: revenueFromTx + revenueFromMissingTx,
          pendingRevenue: pendingFromTx,
        });
      }
      case 'TUKANG': {
        const [projectsCompleted, projectsActive, teamMemberCount] = await Promise.all([
          db.teamMember.count({ where: { userId: user.id, project: { status: ProjectStatus.COMPLETED } } }),
          db.teamMember.count({ where: { userId: user.id, project: { status: ProjectStatus.IN_PROGRESS } } }),
          db.teamMember.count({ where: { userId: user.id } }),
        ]);
        return NextResponse.json({
          projectsCompleted,
          projectsActive,
          rating: user.rating,
          totalReviews: user.totalReviews,
          teamMemberProjects: teamMemberCount,
        });
      }
      case 'SUPPLIER': {
        const [totalOffers, acceptedOffers, revenueResult] = await Promise.all([
          db.materialOffer.count({ where: { supplierId: user.id } }),
          db.materialOffer.count({ where: { supplierId: user.id, status: 'ACCEPTED' } }),
          db.transaction.aggregate({
            where: { userId: user.id, status: TransactionStatus.COMPLETED },
            _sum: { total: true },
          }),
        ]);
        return NextResponse.json({
          totalOffers,
          acceptedOffers,
          revenue: revenueResult._sum.total ?? 0,
          rating: user.rating,
          totalReviews: user.totalReviews,
        });
      }
      case 'ADMIN': {
        const [totalUsers, activeProjects, pendingVerificationProjects, pendingVerificationMaterials] = await Promise.all([
          db.user.count(),
          db.project.count({ where: { status: ProjectStatus.IN_PROGRESS } }),
          db.project.count({ where: { status: ProjectStatus.PENDING_VERIFICATION } }),
          db.material.count({ where: { status: MaterialStatus.PENDING_VERIFICATION } }),
        ]);
        const transactionSum = await db.transaction.aggregate({
          where: { status: TransactionStatus.COMPLETED },
          _sum: { total: true },
        });
        const roleCounts = await db.user.groupBy({
          by: ['role'],
          _count: { id: true },
        });
        const countsByRole = Object.fromEntries(roleCounts.map((r) => [r.role, r._count.id]));
        return NextResponse.json({
          totalUsers,
          activeProjects,
          totalRevenue: transactionSum._sum.total ?? 0,
          pendingVerification: pendingVerificationProjects + pendingVerificationMaterials,
          countsByRole: countsByRole as Record<string, number>,
        });
      }
      default:
        return NextResponse.json({});
    }
  } catch (error) {
    console.error('[dashboard/stats]', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
