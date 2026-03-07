'use client';

import { useState, useEffect } from 'react';
import { useProjects, useTeamMembers, formatCurrency, formatDate, getProjectStatusConfig, getTukangRoleConfig, getSalaryTypeConfig, Project } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderKanban,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Clock,
  CheckCircle,
  User,
  Briefcase,
  ClipboardList,
  FileText,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

// Types
interface ExtendedProject extends Project {
  teamRole?: string;
  salaryType?: string;
  salaryAmount?: number;
  isActive?: boolean;
  teamMemberId?: string;
  isVendor?: boolean;
}

interface OfferRow {
  id: string;
  rfqId: string | null;
  projectTitle: string;
  projectCity: string | null;
  totalOffer: number | null;
  status: string;
  submittedAt: string | null;
}

const offerStatusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
};

const offerStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// Project Row (list format)
function ProjectRow({ project, isTeamMember = false }: { project: ExtendedProject; isTeamMember?: boolean }) {
  const statusConfig = getProjectStatusConfig(project.status);

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-4 -mx-4 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors border-b border-border last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground truncate">{project.title}</p>
          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{project.description}</p>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
          {project.budget && (
            <span className="flex items-center gap-1 font-medium text-[#fd904c]">
              <Wallet className="h-3.5 w-3.5" />
              {formatCurrency(project.budget)}
            </span>
          )}
          {project.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {project.location}
            </span>
          )}
          {project.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(project.startDate)}
            </span>
          )}
          {project.workerNeeded && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {project.workerNeeded} pekerja
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {isTeamMember && project.teamRole && (
            <Badge variant="outline" className="text-[#fd904c] border-[#fd904c] text-xs">
              <User className="h-3 w-3 mr-1" />
              {getTukangRoleConfig(project.teamRole).label}
            </Badge>
          )}
          {project.isVendor && (
            <Badge variant="outline" className="text-[#e57835] border-[#e57835] text-xs">
              <Briefcase className="h-3 w-3 mr-1" />
              Vendor
            </Badge>
          )}
          {project.category && (
            <Badge variant="outline" className="text-xs">{project.category.name}</Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {project.type === 'TENDER' ? 'Tender' : 'Harian'}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {project.client && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-xs">
              {project.client.name.charAt(0)}
            </div>
            <span className="hidden sm:inline">{project.client.name}</span>
          </div>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

// Empty State
function EmptyState({ type, userRole }: { type: 'active' | 'completed' | 'offers'; userRole?: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="py-12 text-center">
        {type === 'offers' ? (
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        ) : (
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        )}
        <p className="text-muted-foreground">
          {type === 'offers'
            ? 'Belum ada penawaran. Kirim penawaran dari halaman Proyek Tender.'
            : type === 'active'
              ? 'Belum ada proyek aktif'
              : 'Belum ada proyek yang selesai'}
        </p>
        {type === 'offers' ? (
          <Button asChild className="mt-4 bg-[#fd904c] hover:bg-[#e57835]">
            <Link href="/proyek-tender">Lihat Proyek Tender</Link>
          </Button>
        ) : (
          type === 'active' && (userRole === 'VENDOR' || userRole === 'TUKANG') && (
            <Link href="/dashboard/jobs">
              <Button className="mt-4 bg-gradient-to-r from-[#fd904c] to-[#e57835]">
                Cari Pekerjaan
              </Button>
            </Link>
          )
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton (list format)
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-border">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function MyProjectsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl === 'penawaran-saya' && user?.role === 'VENDOR'
    ? 'penawaran-saya'
    : tabFromUrl === 'completed'
      ? 'completed'
      : user?.role === 'VENDOR'
        ? 'penawaran-saya'
        : 'active';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab from URL (only penawaran-saya for VENDOR)
  useEffect(() => {
    if (tabFromUrl === 'penawaran-saya' && user?.role === 'VENDOR') {
      setActiveTab('penawaran-saya');
    } else if (tabFromUrl === 'completed') {
      setActiveTab('completed');
    } else if (tabFromUrl === 'active') {
      setActiveTab('active');
    } else if (tabFromUrl === 'penawaran-saya' && user?.role !== 'VENDOR') {
      setActiveTab('active'); // Non-vendor: penawaran-saya tab doesn't exist
    }
  }, [tabFromUrl, user?.role]);

  // Fetch projects where user is vendor
  const { data: vendorProjectsData, isLoading: vendorLoading } = useProjects({
    vendorId: user?.id,
  });

  // Fetch team memberships
  const { data: teamMembersData, isLoading: teamLoading } = useTeamMembers();

  // Fetch offer rows (for VENDOR - projects with RFQ submission)
  const [offerRows, setOfferRows] = useState<OfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  useEffect(() => {
    if (!user || user.role !== 'VENDOR') {
      setOffersLoading(false);
      return;
    }
    const fetchOffers = async () => {
      setOffersLoading(true);
      try {
        const res = await fetch('/api/projects?vendorHasRfqSubmission=1&limit=100', { credentials: 'include' });
        const result = await res.json();
        if (!result.success || !Array.isArray(result.data)) {
          setOfferRows([]);
          return;
        }
        const projects = result.data as {
          id: string;
          title: string;
          city?: { name: string } | null;
          rfq?: { id: string; submissions?: { status: string; totalOffer: number | null; submittedAt: string | null }[] } | null;
        }[];
        const list: OfferRow[] = projects.map((p) => {
          const sub = p.rfq?.submissions?.[0];
          return {
            id: p.id,
            rfqId: p.rfq?.id ?? null,
            projectTitle: p.title ?? 'Proyek',
            projectCity: p.city?.name ?? null,
            totalOffer: sub?.totalOffer ?? null,
            status: sub?.status ?? 'DRAFT',
            submittedAt: sub?.submittedAt ?? null,
          };
        });
        setOfferRows(list);
      } catch {
        setOfferRows([]);
      } finally {
        setOffersLoading(false);
      }
    };
    fetchOffers();
  }, [user?.id, user?.role]);

  const vendorProjects = vendorProjectsData?.data || [];
  const teamMemberships = teamMembersData?.data || [];

  const teamProjects: ExtendedProject[] = teamMemberships.map((tm: { project: Project; role: string; salaryType?: string; salaryAmount?: number; isActive?: boolean; id: string }) => ({
    ...tm.project,
    teamRole: tm.role,
    salaryType: tm.salaryType,
    salaryAmount: tm.salaryAmount,
    isActive: tm.isActive,
    teamMemberId: tm.id,
  }));

  const allProjects: ExtendedProject[] = [
    ...vendorProjects.map((p: Project) => ({ ...p, isVendor: true })),
    ...teamProjects.filter((tp: ExtendedProject) => !vendorProjects.some((vp: { id: string }) => vp.id === tp.id)),
  ];

  const activeProjects = allProjects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PUBLISHED');
  const completedProjects = allProjects.filter((p) => p.status === 'COMPLETED' || p.status === 'CANCELLED');

  const totalProjects = allProjects.length;
  const activeCount = activeProjects.length;
  const completedCount = completedProjects.filter((p) => p.status === 'COMPLETED').length;
  const asTeamCount = teamMemberships.length;

  const isLoading = vendorLoading || teamLoading;
  const isVendor = user?.role === 'VENDOR';

  // Filter penawaran by status (all, Diterima, Ditolak)
  const [offerFilter, setOfferFilter] = useState<string>('all');
  const filteredOfferRows = offerFilter === 'all'
    ? offerRows
    : offerFilter === 'ACCEPTED'
      ? offerRows.filter((r) => r.status === 'ACCEPTED')
      : offerRows.filter((r) => r.status === 'REJECTED');

  const formatDateTime = (dt: string | null) => {
    if (!dt) return '–';
    const d = new Date(dt);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proyek Saya</h1>
          <p className="text-muted-foreground">
            Kelola proyek dan penawaran Anda
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isVendor && (
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{offerRows.length}</p>
                <p className="text-xs text-muted-foreground">Penawaran</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#fd904c]/10 flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-[#fd904c]" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalProjects}</p>
              <p className="text-xs text-muted-foreground">Total Proyek</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Aktif</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Selesai</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Penawaran Saya (VENDOR only), Aktif, Selesai */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`flex flex-wrap gap-1 ${isVendor ? '' : ''}`}>
          {isVendor && (
            <TabsTrigger value="penawaran-saya" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Penawaran Saya ({offerRows.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" />
            Aktif ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Selesai ({completedProjects.length})
          </TabsTrigger>
        </TabsList>

        {isVendor && (
          <TabsContent value="penawaran-saya" className="mt-4">
            <Card className="glass-card">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Proyek yang sudah Anda buat penawarannya. Klik baris untuk melihat penawaran di halaman RFQ.
                  </p>
                  {offerRows.length > 0 && (
                    <Select value={offerFilter} onValueChange={setOfferFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="ACCEPTED">Diterima</SelectItem>
                        <SelectItem value="REJECTED">Ditolak</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {offersLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
                  </div>
                ) : offerRows.length === 0 ? (
                  <EmptyState type="offers" />
                ) : filteredOfferRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Tidak ada penawaran dengan status yang dipilih.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredOfferRows.map((row) => (
                      <li key={row.id}>
                        <Link
                          href={row.rfqId ? `/dashboard/rfq/${row.rfqId}` : `/dashboard/projects/${row.id}`}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-2 -mx-2 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{row.projectTitle}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                              {row.projectCity && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  Proyek di {row.projectCity}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Waktu penawaran: {formatDateTime(row.submittedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Nilai penawaran</p>
                              <p className="text-lg font-bold text-[#fd904c]">
                                {row.totalOffer != null ? formatCurrency(row.totalOffer) : '–'}
                              </p>
                            </div>
                            <Badge className={offerStatusColors[row.status] ?? 'bg-muted'}>
                              {offerStatusLabels[row.status] ?? row.status}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="active" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <LoadingSkeleton />
              ) : activeProjects.length === 0 ? (
                <EmptyState type="active" userRole={user?.role} />
              ) : (
                <div className="divide-y divide-border -mx-4">
                  {activeProjects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isTeamMember={!!project.teamRole}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <LoadingSkeleton />
              ) : completedProjects.length === 0 ? (
                <EmptyState type="completed" userRole={user?.role} />
              ) : (
                <div className="divide-y divide-border -mx-4">
                  {completedProjects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isTeamMember={!!project.teamRole}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
