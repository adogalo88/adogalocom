import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/reports - Get platform statistics for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya admin yang dapat mengakses laporan.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // week, month, year, all

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // User statistics
    const [
      totalUsers,
      usersByRole,
      newUsers,
      verifiedUsers,
      pendingVerification,
    ] = await Promise.all([
      db.user.count(),
      db.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      db.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      db.user.count({
        where: { isVerified: true },
      }),
      db.user.count({
        where: { status: 'PENDING_VERIFICATION' },
      }),
    ]);

    // Project statistics
    const [
      totalProjects,
      projectsByStatus,
      newProjects,
      completedProjects,
    ] = await Promise.all([
      db.project.count(),
      db.project.groupBy({
        by: ['status'],
        _count: true,
      }),
      db.project.count({
        where: { createdAt: { gte: startDate } },
      }),
      db.project.count({
        where: { status: 'COMPLETED' },
      }),
    ]);

    // Transaction statistics
    const [
      totalTransactions,
      transactionsByStatus,
      totalRevenue,
      periodRevenue,
      pendingPayments,
    ] = await Promise.all([
      db.transaction.count(),
      db.transaction.groupBy({
        by: ['status'],
        _count: true,
        _sum: { total: true },
      }),
      db.transaction.aggregate({
        _sum: { total: true },
        where: { status: 'COMPLETED' },
      }),
      db.transaction.aggregate({
        _sum: { total: true },
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      }),
      db.transaction.count({
        where: { status: 'PENDING' },
      }),
    ]);

    // Material statistics
    const [
      totalMaterials,
      materialsByStatus,
      totalOffers,
      acceptedOffers,
    ] = await Promise.all([
      db.material.count(),
      db.material.groupBy({
        by: ['status'],
        _count: true,
      }),
      db.materialOffer.count(),
      db.materialOffer.count({
        where: { status: 'ACCEPTED' },
      }),
    ]);

    // Application statistics
    const [
      totalApplications,
      applicationsByStatus,
    ] = await Promise.all([
      db.application.count(),
      db.application.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // Team member statistics
    const [
      totalTeamMembers,
      activeTeamMembers,
    ] = await Promise.all([
      db.teamMember.count(),
      db.teamMember.count({
        where: { isActive: true },
      }),
    ]);

    // Review statistics
    const totalReviews = await db.review.count();

    // Monthly user growth (last 12 months) - PostgreSQL compatible
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    const usersLast12 = await db.user.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    });
    const monthlyUserGrowthMap = new Map<string, number>();
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyUserGrowthMap.set(key, 0);
    }
    usersLast12.forEach((u) => {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyUserGrowthMap.set(key, (monthlyUserGrowthMap.get(key) ?? 0) + 1);
    });
    const monthlyUserGrowth = Array.from(monthlyUserGrowthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    // Monthly project growth (last 12 months)
    const projectsLast12 = await db.project.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    });
    const monthlyProjectGrowthMap = new Map<string, number>();
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyProjectGrowthMap.set(key, 0);
    }
    projectsLast12.forEach((p) => {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyProjectGrowthMap.set(key, (monthlyProjectGrowthMap.get(key) ?? 0) + 1);
    });
    const monthlyProjectGrowth = Array.from(monthlyProjectGrowthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    // Monthly revenue (last 12 months)
    const transactionsLast12 = await db.transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { createdAt: true, total: true },
    });
    const monthlyRevenueMap = new Map<string, number>();
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenueMap.set(key, 0);
    }
    transactionsLast12.forEach((t) => {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) ?? 0) + (t.total || 0));
    });
    const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total }));

    // Top categories by project count
    const topCategories = await db.category.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: {
        projects: { _count: 'desc' },
      },
      take: 5,
    });

    // Top rated users (tukang/vendor)
    const topRatedUsers = await db.user.findMany({
      where: {
        role: { in: ['TUKANG', 'VENDOR'] },
        totalReviews: { gt: 0 },
      },
      orderBy: { rating: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        role: true,
        rating: true,
        totalReviews: true,
      },
    });

    return NextResponse.json({
      period,
      users: {
        total: totalUsers,
        byRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count;
          return acc;
        }, {} as Record<string, number>),
        newUsers,
        verified: verifiedUsers,
        pendingVerification,
      },
      projects: {
        total: totalProjects,
        byStatus: projectsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        newProjects,
        completed: completedProjects,
      },
      transactions: {
        total: totalTransactions,
        byStatus: transactionsByStatus.reduce((acc, item) => {
          acc[item.status] = {
            count: item._count,
            total: item._sum.total || 0,
          };
          return acc;
        }, {} as Record<string, { count: number; total: number }>),
        totalRevenue: totalRevenue._sum.total || 0,
        periodRevenue: periodRevenue._sum.total || 0,
        pendingPayments,
      },
      materials: {
        total: totalMaterials,
        byStatus: materialsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        totalOffers,
        acceptedOffers,
      },
      applications: {
        total: totalApplications,
        byStatus: applicationsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      team: {
        total: totalTeamMembers,
        active: activeTeamMembers,
      },
      reviews: {
        total: totalReviews,
      },
      charts: {
        monthlyUserGrowth,
        monthlyProjectGrowth,
        monthlyRevenue,
      },
      topCategories: topCategories.map(c => ({
        id: c.id,
        name: c.name,
        projectCount: c._count.projects,
      })),
      topRatedUsers,
    });

  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data laporan' },
      { status: 500 }
    );
  }
}
