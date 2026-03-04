'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  Package,
  Wallet,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Inbox,
} from 'lucide-react';
import Link from 'next/link';

function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} Jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} Rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Render dashboard based on role
  const renderDashboard = () => {
    switch (user?.role) {
      case 'CLIENT':
        return <ClientDashboard />;
      case 'VENDOR':
        return <VendorDashboard />;
      case 'TUKANG':
        return <TukangDashboard />;
      case 'SUPPLIER':
        return <SupplierDashboard />;
      case 'ADMIN':
        return <AdminDashboard />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Selamat Datang, <span className="text-[#fd904c]">{user?.name}</span>!
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola proyek dan aktivitas Anda dari dashboard ini
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/projects/create">
            <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2">
              <Plus className="h-4 w-4" />
              Pasang Proyek
            </Button>
          </Link>
        </div>
      </div>

      {/* Role-based Dashboard Content */}
      {renderDashboard()}
    </div>
  );
}

function ClientDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json() as Promise<{ totalProjects: number; activeProjects: number; materialRequests: number; totalSpending: number }>;
    },
  });
  const { data: projectsData } = useQuery({
    queryKey: ['dashboard', 'projects', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/projects?page=1&limit=5');
      if (!res.ok) throw new Error('Failed to load projects');
      return res.json() as Promise<{ data: Array<{ id: string; title: string; status: string; vendor?: { name: string } | null }> }>;
    },
  });
  const { data: notificationsData } = useQuery({
    queryKey: ['dashboard', 'notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?page=1&limit=5');
      if (!res.ok) throw new Error('Failed to load notifications');
      return res.json() as Promise<{ data: Array<{ title: string; message: string; readAt: string | null; createdAt: string }> }>;
    },
  });

  const totalProjects = stats?.totalProjects ?? 0;
  const activeProjects = stats?.activeProjects ?? 0;
  const materialRequests = stats?.materialRequests ?? 0;
  const totalSpending = stats?.totalSpending ?? 0;
  const recentProjects = projectsData?.data ?? [];
  const notifications = notificationsData?.data ?? [];

  return (
    <>
      {/* Stats Cards - data asli, kosong untuk user baru */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Proyek"
          value={statsLoading ? '...' : String(totalProjects)}
          icon={<FolderKanban className="h-5 w-5" />}
        />
        <StatsCard
          title="Proyek Aktif"
          value={statsLoading ? '...' : String(activeProjects)}
          icon={<Clock className="h-5 w-5" />}
          description="Sedang berjalan"
        />
        <StatsCard
          title="Material Request"
          value={statsLoading ? '...' : String(materialRequests)}
          icon={<Package className="h-5 w-5" />}
          description="Permintaan material"
        />
        <StatsCard
          title="Total Pengeluaran"
          value={statsLoading ? '...' : formatRupiah(totalSpending)}
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects - dari API, kosong jika belum ada proyek */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Proyek Terbaru</CardTitle>
              <CardDescription>Proyek yang sedang berjalan</CardDescription>
            </div>
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm" className="gap-1">
                Lihat Semua <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada proyek. Pasang proyek pertama Anda.</p>
                  <Link href="/dashboard/projects/create">
                    <Button size="sm" className="mt-2">Pasang Proyek</Button>
                  </Link>
                </div>
              ) : (
                recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#fd904c]/20 to-[#e57835]/20 flex items-center justify-center">
                      <FolderKanban className="h-5 w-5 text-[#fd904c]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.title}</p>
                      <p className="text-sm text-muted-foreground">Vendor: {project.vendor?.name ?? '-'}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={project.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications - dari API, kosong jika belum ada */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Notifikasi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notif, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.createdAt ? new Date(notif.createdAt).toLocaleString('id-ID') : ''}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function VendorDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json() as Promise<{
        projectsCompleted: number;
        projectsActive: number;
        teamMembers: number;
        revenue: number;
      }>;
    },
  });

  const projectsCompleted = stats?.projectsCompleted ?? 0;
  const projectsActive = stats?.projectsActive ?? 0;
  const teamMembers = stats?.teamMembers ?? 0;
  const revenue = stats?.revenue ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Proyek Selesai"
          value={isLoading ? '...' : String(projectsCompleted)}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatsCard
          title="Proyek Aktif"
          value={isLoading ? '...' : String(projectsActive)}
          icon={<FolderKanban className="h-5 w-5" />}
          description="Sedang dikerjakan"
        />
        <StatsCard
          title="Tim Kerja"
          value={isLoading ? '...' : String(teamMembers)}
          icon={<Users className="h-5 w-5" />}
          description="Tukang aktif"
        />
        <StatsCard
          title="Pendapatan"
          value={isLoading ? '...' : formatRupiah(revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Proyek Tersedia</CardTitle>
            <CardDescription>Proyek yang bisa Anda tawarkan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Renovasi Rumah 2 Lantai', budget: 'Rp 150 Jt', location: 'Jakarta Selatan' },
                { name: 'Pembangunan Kolam Renang', budget: 'Rp 80 Jt', location: 'Bekasi' },
                { name: 'Renovasi Kantor', budget: 'Rp 200 Jt', location: 'Jakarta Pusat' },
              ].map((project, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#fd904c]">{project.budget}</p>
                    <Button size="sm" className="mt-1">Tawarkan</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Tim Saya</CardTitle>
            <CardDescription>Tukang yang bekerja dengan Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Ahmad', role: 'Tukang Batu', status: 'Aktif' },
                { name: 'Budi', role: 'Tukang Kayu', status: 'Aktif' },
                { name: 'Candra', role: 'Mandor', status: 'Proyek A' },
              ].map((member, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white font-medium">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{member.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TukangDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json() as Promise<{
        projectsCompleted: number;
        projectsActive: number;
        rating: number | null;
        totalReviews: number;
      }>;
    },
  });

  const projectsCompleted = stats?.projectsCompleted ?? 0;
  const projectsActive = stats?.projectsActive ?? 0;
  const rating = stats?.rating ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Proyek Selesai"
          value={isLoading ? '...' : String(projectsCompleted)}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatsCard
          title="Rating"
          value={isLoading ? '...' : rating.toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
          description={isLoading ? '' : `Dari ${totalReviews} ulasan`}
        />
        <StatsCard
          title="Proyek Aktif"
          value={isLoading ? '...' : String(projectsActive)}
          icon={<FolderKanban className="h-5 w-5" />}
          description="Sedang dikerjakan"
        />
        <StatsCard
          title="Total Proyek Tim"
          value={isLoading ? '...' : String(projectsCompleted + projectsActive)}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Lowongan Tersedia</CardTitle>
            <CardDescription>Pekerjaan yang sesuai keahlian Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Tukang Batu - Proyek Renovasi', daily: 'Rp 250.000/hari', location: 'Jakarta' },
                { title: 'Tukang Kayu - Pembuatan Furnitur', daily: 'Rp 300.000/hari', location: 'Tangerang' },
              ].map((job, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium">{job.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">{job.location}</span>
                    <span className="font-semibold text-[#fd904c]">{job.daily}</span>
                  </div>
                  <Button size="sm" className="w-full mt-2">Lamar</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Jadwal Minggu Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { day: 'Senin', project: 'Renovasi Dapur Pak Budi', time: '08:00 - 17:00' },
                { day: 'Selasa', project: 'Renovasi Dapur Pak Budi', time: '08:00 - 17:00' },
                { day: 'Rabu', project: 'Perbaikan Atap', time: '08:00 - 15:00' },
              ].map((schedule, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                  <div className="text-center px-3 py-1 rounded-lg bg-[#fd904c]/10 text-[#fd904c] font-medium">
                    {schedule.day}
                  </div>
                  <div>
                    <p className="font-medium">{schedule.project}</p>
                    <p className="text-sm text-muted-foreground">{schedule.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SupplierDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json() as Promise<{
        totalOffers: number;
        acceptedOffers: number;
        revenue: number;
        rating: number | null;
        totalReviews: number;
      }>;
    },
  });

  const totalOffers = stats?.totalOffers ?? 0;
  const acceptedOffers = stats?.acceptedOffers ?? 0;
  const revenue = stats?.revenue ?? 0;
  const rating = stats?.rating ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Penawaran"
          value={isLoading ? '...' : String(totalOffers)}
          icon={<Package className="h-5 w-5" />}
        />
        <StatsCard
          title="Penawaran Diterima"
          value={isLoading ? '...' : String(acceptedOffers)}
          icon={<CheckCircle className="h-5 w-5" />}
          description="Penawaran berhasil"
        />
        <StatsCard
          title="Total Penjualan"
          value={isLoading ? '...' : formatRupiah(revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatsCard
          title="Rating"
          value={isLoading ? '...' : rating.toFixed(1)}
          icon={<Wallet className="h-5 w-5" />}
          description={isLoading ? '' : `Dari ${totalReviews} ulasan`}
        />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Permintaan Material Terbaru</CardTitle>
          <CardDescription>Material yang sedang dicari klien</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { material: 'Semen Portland 50kg', qty: '100 sak', budget: 'Rp 8.5 Jt' },
              { material: 'Batako', qty: '5000 biji', budget: 'Rp 12.5 Jt' },
              { material: 'Keramik Lantai 60x60', qty: '200 m²', budget: 'Rp 15 Jt' },
            ].map((item, index) => (
              <div key={index} className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{item.material}</p>
                <p className="text-sm text-muted-foreground">Jumlah: {item.qty}</p>
                <p className="font-semibold text-[#fd904c] mt-2">{item.budget}</p>
                <Button size="sm" className="w-full mt-3">Buat Penawaran</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      return res.json() as Promise<{
        totalUsers: number;
        activeProjects: number;
        totalRevenue: number;
        pendingVerification: number;
        countsByRole: Record<string, number>;
      }>;
    },
  });

  const totalUsers = stats?.totalUsers ?? 0;
  const activeProjects = stats?.activeProjects ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingVerification = stats?.pendingVerification ?? 0;
  const countsByRole = stats?.countsByRole ?? {};

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total User"
          value={isLoading ? '...' : String(totalUsers)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatsCard
          title="Proyek Aktif"
          value={isLoading ? '...' : String(activeProjects)}
          icon={<FolderKanban className="h-5 w-5" />}
          description="Sedang berjalan"
        />
        <StatsCard
          title="Total Transaksi"
          value={isLoading ? '...' : formatRupiah(totalRevenue)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatsCard
          title="Pending Verifikasi"
          value={isLoading ? '...' : String(pendingVerification)}
          icon={<AlertCircle className="h-5 w-5" />}
          description="Perlu review"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>User Baru Menunggu Verifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'PT Konstruksi Jaya', role: 'Vendor', date: 'Hari ini' },
                { name: 'Budi Tukang Kayu', role: 'Tukang', date: 'Kemarin' },
                { name: 'CV Material Prima', role: 'Supplier', date: '2 hari lalu' },
              ].map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.role} • {user.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Review</Button>
                    <Button size="sm">Verifikasi</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Statistik Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Klien</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : String(countsByRole.CLIENT ?? 0)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Vendor</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : String(countsByRole.VENDOR ?? 0)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Tukang</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : String(countsByRole.TUKANG ?? 0)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : String(countsByRole.SUPPLIER ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatsCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  description,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  description?: string;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#fd904c]/20 to-[#e57835]/20 flex items-center justify-center text-[#fd904c]">
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUBLISHED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const labels: Record<string, string> = {
    IN_PROGRESS: 'Berjalan',
    PUBLISHED: 'Dipublikasi',
    COMPLETED: 'Selesai',
    DRAFT: 'Draft',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.DRAFT}`}>
      {labels[status] || status}
    </span>
  );
}
