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
  Briefcase,
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
        {(user?.role === 'CLIENT' || user?.role === 'ADMIN') && (
          <div className="flex gap-2">
            <Link href="/dashboard/projects/create">
              <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2">
                <Plus className="h-4 w-4" />
                Pasang Proyek
              </Button>
            </Link>
          </div>
        )}
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

        {/* Notifications - live dari API */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Notifikasi Terbaru</CardTitle>
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="gap-1 text-[#fd904c]">
                Lihat semua notifikasi
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notif: { id?: string; title: string; createdAt?: string }) => (
                  <Link key={notif.id ?? notif.title} href="/dashboard/notifications">
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.createdAt ? new Date(notif.createdAt).toLocaleString('id-ID') : ''}</p>
                      </div>
                    </div>
                  </Link>
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
        revenue: number;
        pendingRevenue?: number;
      }>;
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard', 'vendor', 'available-projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects?type=TENDER&status=PUBLISHED&page=1&limit=5');
      if (!res.ok) throw new Error('Failed to load projects');
      return res.json() as Promise<{ data: Array<{ id: string; title: string; budget: number | null; city?: { name: string } | null; location?: string | null }> }>;
    },
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['dashboard', 'vendor', 'notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?page=1&limit=5');
      if (!res.ok) throw new Error('Failed to load notifications');
      return res.json() as Promise<{ data: Array<{ id: string; title: string; message: string; readAt: string | null; createdAt: string }> }>;
    },
  });

  const projectsCompleted = stats?.projectsCompleted ?? 0;
  const projectsActive = stats?.projectsActive ?? 0;
  const revenue = stats?.revenue ?? 0;
  const pendingRevenue = stats?.pendingRevenue ?? 0;
  const availableProjects = projectsData?.data ?? [];
  const notifications = notificationsData?.data ?? [];

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
          title="Pendapatan"
          value={isLoading ? '...' : formatRupiah(revenue)}
          description={!isLoading && pendingRevenue > 0 ? `${formatRupiah(pendingRevenue)} menunggu pembayaran` : undefined}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatsCard
          title="Proyek Tersedia"
          value={String(availableProjects.length)}
          icon={<Briefcase className="h-5 w-5" />}
          description="Proyek tender terbuka"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Proyek Tersedia</CardTitle>
              <CardDescription>Proyek tender yang bisa Anda tawarkan</CardDescription>
            </div>
            <Link href="/proyek-tender">
              <Button variant="ghost" size="sm" className="gap-1">
                Lihat Semua <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada proyek tender tersedia. Cek halaman Proyek Tender untuk daftar lengkap.</p>
                  <Link href="/proyek-tender">
                    <Button size="sm" className="mt-2">Buka Proyek Tender</Button>
                  </Link>
                </div>
              ) : (
                availableProjects.map((project) => (
                  <Link key={project.id} href={`/proyek-tender/${project.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.title}</p>
                        <p className="text-sm text-muted-foreground">{project.city?.name ?? project.location ?? '-'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-[#fd904c]">{formatRupiah(project.budget ?? 0)}</p>
                        <span className="inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-1.5 mt-1 border border-input bg-background hover:bg-accent">Tawarkan</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Notifikasi Terbaru</CardTitle>
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="gap-1 text-[#fd904c]">
                Lihat semua <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <Link key={notif.id} href="/dashboard/notifications">
                    <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-[#fd904c]/20 flex items-center justify-center shrink-0">
                        <Inbox className="h-4 w-4 text-[#fd904c]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{notif.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.createdAt ? new Date(notif.createdAt).toLocaleString('id-ID') : ''}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
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

  const { data: jobsData } = useQuery({
    queryKey: ['dashboard', 'tukang', 'lowongan'],
    queryFn: async () => {
      const res = await fetch('/api/projects?status=PUBLISHED&type=HARIAN&limit=5');
      if (!res.ok) throw new Error('Failed to load lowongan');
      return res.json() as Promise<{ data: Array<{ id: string; title: string; budget: number | null; workerNeeded: number | null; city?: { name: string } | null }> }>;
    },
  });

  const { data: teamData } = useQuery({
    queryKey: ['dashboard', 'tukang', 'team'],
    queryFn: async () => {
      const res = await fetch('/api/team-members?limit=50');
      if (!res.ok) throw new Error('Failed to load jadwal');
      return res.json() as Promise<{
        data: Array<{
          id: string;
          project: { id: string; title: string; status: string; startDate: string | null; endDate: string | null };
        }>;
      }>;
    },
  });

  const projectsCompleted = stats?.projectsCompleted ?? 0;
  const projectsActive = stats?.projectsActive ?? 0;
  const rating = stats?.rating ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;

  const lowonganList = jobsData?.data ?? [];
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const jadwalList = (teamData?.data ?? [])
    .filter((tm: { project: { startDate: string | null; endDate: string | null } }) => {
      const start = tm.project.startDate ? new Date(tm.project.startDate) : null;
      const end = tm.project.endDate ? new Date(tm.project.endDate) : null;
      if (!start) return false;
      const rangeEnd = end ?? start;
      return start <= weekEnd && rangeEnd >= weekStart;
    })
    .map((tm: { id: string; project: { id: string; title: string; startDate: string | null; endDate: string | null } }) => {
      const d = tm.project.startDate ? new Date(tm.project.startDate) : null;
      return {
        id: tm.id,
        projectId: tm.project.id,
        day: d ? DAY_NAMES[d.getDay()] : '-',
        date: d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-',
        project: tm.project.title,
      };
    })
    .slice(0, 10);

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
              {lowonganList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada lowongan proyek harian. Cek halaman Proyek Harian untuk daftar lengkap.</p>
              ) : (
                lowonganList.map((job) => (
                  <div key={job.id} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium">{job.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">{job.city?.name ?? '-'}</span>
                      <span className="font-semibold text-[#fd904c]">
                        {job.budget != null ? `Rp ${(job.budget / 1000).toFixed(0)} rb` : '-'}
                      </span>
                    </div>
                    <Link href={`/dashboard/projects/${job.id}`}>
                      <Button size="sm" className="w-full mt-2">Lamar</Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Jadwal Minggu Ini</CardTitle>
            <CardDescription>Proyek tempat Anda tergabung dalam tim</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jadwalList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada jadwal proyek minggu ini.</p>
              ) : (
                jadwalList.map((item) => (
                  <Link key={item.id} href={`/dashboard/projects/${item.projectId}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50">
                      <div className="text-center px-3 py-1 rounded-lg bg-[#fd904c]/10 text-[#fd904c] font-medium min-w-[4rem]">
                        {item.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.project}</p>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))
              )}
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
  const { data: verificationData } = useQuery({
    queryKey: ['admin', 'verification', 'pending-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/verification?status=PENDING_VERIFICATION');
      if (!res.ok) throw new Error('Failed to load verification');
      const json = await res.json();
      return json?.data?.pendingUsers ?? [];
    },
  });

  const totalUsers = stats?.totalUsers ?? 0;
  const activeProjects = stats?.activeProjects ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const pendingVerification = stats?.pendingVerification ?? 0;
  const countsByRole = stats?.countsByRole ?? {};
  const pendingUsers = Array.isArray(verificationData) ? verificationData : [];
  const roleLabel: Record<string, string> = { CLIENT: 'Klien', VENDOR: 'Vendor', TUKANG: 'Tukang', SUPPLIER: 'Supplier' };

  function formatPendingDate(createdAt: string) {
    const d = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return 'Hari ini';
    if (diff < 172800000) return 'Kemarin';
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} hari lalu`;
    return d.toLocaleDateString('id-ID');
  }

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Baru Menunggu Verifikasi</CardTitle>
            <Link href="/dashboard/verification">
              <Button variant="ghost" size="sm" className="gap-1 text-[#fd904c]">
                Ke halaman Verifikasi
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada user menunggu verifikasi.</p>
              ) : (
                pendingUsers.slice(0, 5).map((u: { id: string; name: string; role: string; createdAt: string }) => (
                  <Link key={u.id} href="/dashboard/verification">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white">
                          {u.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-muted-foreground">{roleLabel[u.role] ?? u.role} • {formatPendingDate(u.createdAt)}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
              {pendingUsers.length > 5 && (
                <Link href="/dashboard/verification">
                  <Button variant="outline" size="sm" className="w-full mt-2">Lihat semua ({pendingUsers.length})</Button>
                </Link>
              )}
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
