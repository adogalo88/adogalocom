'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  FolderKanban,
  Wallet,
  TrendingUp,
  Package,
  FileText,
  Star,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface ReportData {
  period: string;
  users: {
    total: number;
    byRole: Record<string, number>;
    newUsers: number;
    verified: number;
    pendingVerification: number;
  };
  projects: {
    total: number;
    byStatus: Record<string, number>;
    newProjects: number;
    completed: number;
  };
  transactions: {
    total: number;
    byStatus: Record<string, { count: number; total: number }>;
    totalRevenue: number;
    periodRevenue: number;
    pendingPayments: number;
  };
  materials: {
    total: number;
    byStatus: Record<string, number>;
    totalOffers: number;
    acceptedOffers: number;
  };
  applications: {
    total: number;
    byStatus: Record<string, number>;
  };
  team: {
    total: number;
    active: number;
  };
  charts: {
    monthlyUserGrowth: { month: string; count: number }[];
    monthlyProjectGrowth: { month: string; count: number }[];
    monthlyRevenue: { month: string; total: number }[];
  };
  topCategories: { id: string; name: string; projectCount: number }[];
  topRatedUsers: {
    id: string;
    name: string;
    role: string;
    rating: number;
    totalReviews: number;
  }[];
}

async function fetchReports(period: string): Promise<ReportData> {
  const response = await fetch(`/api/reports?period=${period}`);
  if (!response.ok) throw new Error('Failed to fetch reports');
  return response.json();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', period],
    queryFn: () => fetchReports(period),
    enabled: user?.role === 'ADMIN',
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card p-8 text-center">
          <p className="text-muted-foreground">
            Anda tidak memiliki akses ke halaman ini
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass-card p-8 text-center">
          <p className="text-red-500">Gagal memuat data laporan</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Coba Lagi
          </Button>
        </Card>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    CLIENT: 'Klien',
    VENDOR: 'Vendor',
    TUKANG: 'Tukang',
    SUPPLIER: 'Supplier',
    ADMIN: 'Admin',
  };

  const periodLabels: Record<string, string> = {
    week: 'Minggu Ini',
    month: 'Bulan Ini',
    year: 'Tahun Ini',
    all: 'Semua Waktu',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Laporan & Analitik</h1>
          <p className="text-muted-foreground mt-1">
            Statistik dan performa platform
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Minggu Ini</SelectItem>
            <SelectItem value="month">Bulan Ini</SelectItem>
            <SelectItem value="year">Tahun Ini</SelectItem>
            <SelectItem value="all">Semua Waktu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Pengguna"
          value={data.users.total.toLocaleString('id-ID')}
          subtitle={`${data.users.newUsers} pengguna baru (${periodLabels[period]})`}
          icon={<Users className="h-5 w-5" />}
          trend={data.users.newUsers > 0 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Total Proyek"
          value={data.projects.total.toLocaleString('id-ID')}
          subtitle={`${data.projects.completed} selesai`}
          icon={<FolderKanban className="h-5 w-5" />}
          trend="neutral"
        />
        <StatsCard
          title="Total Pendapatan"
          value={formatCurrency(data.transactions.totalRevenue)}
          subtitle={`${formatCurrency(data.transactions.periodRevenue)} (${periodLabels[period]})`}
          icon={<Wallet className="h-5 w-5" />}
          trend={data.transactions.periodRevenue > 0 ? 'up' : 'neutral'}
        />
        <StatsCard
          title="Material Request"
          value={data.materials.total.toLocaleString('id-ID')}
          subtitle={`${data.materials.acceptedOffers} penawaran diterima`}
          icon={<Package className="h-5 w-5" />}
          trend="neutral"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Pertumbuhan Pengguna</CardTitle>
            <CardDescription>12 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {data.charts.monthlyUserGrowth.map((item, index) => {
                const maxCount = Math.max(...data.charts.monthlyUserGrowth.map(d => d.count), 1);
                const height = (item.count / maxCount) * 100;
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-[#fd904c] to-[#fd904c]/50 rounded-t"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <span className="text-xs text-muted-foreground rotate-0 truncate w-full text-center">
                      {formatMonth(item.month)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Pendapatan Bulanan</CardTitle>
            <CardDescription>12 bulan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {data.charts.monthlyRevenue.map((item, index) => {
                const maxTotal = Math.max(...data.charts.monthlyRevenue.map(d => d.total || 0), 1);
                const height = ((item.total || 0) / maxTotal) * 100;
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-[#e57835] to-[#e57835]/50 rounded-t"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <span className="text-xs text-muted-foreground truncate w-full text-center">
                      {formatMonth(item.month)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users & Projects Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Pengguna Berdasarkan Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.users.byRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#fd904c]/20 to-[#e57835]/20 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-[#fd904c]" />
                    </div>
                    <div>
                      <p className="font-medium">{roleLabels[role] || role}</p>
                      <p className="text-sm text-muted-foreground">
                        {((count / data.users.total) * 100).toFixed(1)}% dari total
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-lg">{count.toLocaleString('id-ID')}</p>
                </div>
              ))}
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-muted-foreground">Menunggu Verifikasi:</span>
                </div>
                <Badge variant="secondary">{data.users.pendingVerification}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects by Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Proyek Berdasarkan Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.projects.byStatus).map(([status, count]) => {
                const statusConfig: Record<string, { label: string; className: string }> = {
                  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
                  PUBLISHED: { label: 'Dipublikasi', className: 'bg-yellow-100 text-yellow-700' },
                  IN_PROGRESS: { label: 'Berjalan', className: 'bg-blue-100 text-blue-700' },
                  COMPLETED: { label: 'Selesai', className: 'bg-green-100 text-green-700' },
                  CANCELLED: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700' },
                };
                const config = statusConfig[status] || { label: status, className: 'bg-gray-100' };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={config.className}>{config.label}</Badge>
                      <p className="text-sm text-muted-foreground">
                        {((count / data.projects.total) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <p className="font-semibold">{count.toLocaleString('id-ID')}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories & Users */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Kategori Terpopuler</CardTitle>
            <CardDescription>Berdasarkan jumlah proyek</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topCategories.map((category, index) => (
                <div key={category.id} className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{category.name}</p>
                  </div>
                  <Badge variant="secondary">{category.projectCount} proyek</Badge>
                </div>
              ))}
              {data.topCategories.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Belum ada data kategori
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Rated Users */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Pengguna Rating Tertinggi</CardTitle>
            <CardDescription>Tukang & Vendor terbaik</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topRatedUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white font-semibold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{roleLabels[u.role] || u.role}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{u.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{u.totalReviews} ulasan</p>
                  </div>
                </div>
              ))}
              {data.topRatedUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Belum ada data rating
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{data.applications.total}</p>
            <p className="text-sm text-muted-foreground">Total Lamaran</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{data.materials.totalOffers}</p>
            <p className="text-sm text-muted-foreground">Total Penawaran</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{data.team.active}</p>
            <p className="text-sm text-muted-foreground">Tim Aktif</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-teal-500 mb-2" />
            <p className="text-2xl font-bold">{data.users.verified}</p>
            <p className="text-sm text-muted-foreground">User Terverifikasi</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#fd904c]/20 to-[#e57835]/20 flex items-center justify-center text-[#fd904c]">
            {icon}
          </div>
          {trend === 'up' && <ArrowUpRight className="h-5 w-5 text-green-500" />}
          {trend === 'down' && <ArrowDownRight className="h-5 w-5 text-red-500" />}
        </div>
        <p className="text-2xl font-bold mt-4">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
