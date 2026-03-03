'use client';

import { useState } from 'react';
import { useProjects, useTeamMembers, formatCurrency, formatDate, getProjectStatusConfig, getTukangRoleConfig, getSalaryTypeConfig, Project } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Project Card Component (defined outside render)
function ProjectCard({ project, isTeamMember = false }: { project: ExtendedProject; isTeamMember?: boolean }) {
  const statusConfig = getProjectStatusConfig(project.status);

  return (
    <Card className="glass-card hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
            <CardTitle className="text-lg hover:text-[#fd904c] transition-colors line-clamp-2">
              {project.title}
            </CardTitle>
          </Link>
          <Badge className={statusConfig.className}>
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {project.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Badge */}
        {isTeamMember && project.teamRole && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[#fd904c] border-[#fd904c]">
              <User className="h-3 w-3 mr-1" />
              {getTukangRoleConfig(project.teamRole).label}
            </Badge>
            {project.salaryAmount && (
              <Badge variant="secondary">
                {formatCurrency(project.salaryAmount)} / {project.salaryType ? getSalaryTypeConfig(project.salaryType).label : ''}
              </Badge>
            )}
          </div>
        )}
        {project.isVendor && (
          <Badge variant="outline" className="text-[#e57835] border-[#e57835]">
            <Briefcase className="h-3 w-3 mr-1" />
            Vendor
          </Badge>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {project.budget && (
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#fd904c]" />
              <span className="font-semibold text-[#fd904c]">
                {formatCurrency(project.budget)}
              </span>
            </div>
          )}
          {project.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{project.location}</span>
            </div>
          )}
          {project.workerNeeded && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{project.workerNeeded} pekerja</span>
            </div>
          )}
          {project.startDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(project.startDate)}</span>
            </div>
          )}
        </div>

        {/* Category & Type */}
        <div className="flex items-center gap-2">
          {project.category && (
            <Badge variant="outline" className="text-xs">
              {project.category.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {project.type === 'TENDER' ? 'Tender' : 'Harian'}
          </Badge>
        </div>

        {/* Client/Vendor Info */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {project.client && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-xs">
                {project.client.name.charAt(0)}
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground text-xs">Klien</p>
                <p className="font-medium truncate">{project.client.name}</p>
              </div>
            </div>
          )}
          <Link href={`/dashboard/projects/${project.id}`}>
            <Button variant="ghost" size="sm">
              Lihat Detail
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Empty State Component (defined outside render)
function EmptyState({ type, userRole }: { type: 'active' | 'completed'; userRole?: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="py-12 text-center">
        <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {type === 'active'
            ? 'Belum ada proyek aktif'
            : 'Belum ada proyek yang selesai'}
        </p>
        {type === 'active' && (userRole === 'VENDOR' || userRole === 'TUKANG') && (
          <Link href="/dashboard/jobs">
            <Button className="mt-4 bg-gradient-to-r from-[#fd904c] to-[#e57835]">
              Cari Pekerjaan
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MyProjectsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');

  // Fetch projects where user is vendor
  const { data: vendorProjectsData, isLoading: vendorLoading } = useProjects({
    vendorId: user?.id,
  });

  // Fetch team memberships
  const { data: teamMembersData, isLoading: teamLoading } = useTeamMembers();

  const vendorProjects = vendorProjectsData?.data || [];
  const teamMemberships = teamMembersData?.data || [];

  // Get projects where user is team member
  const teamProjects: ExtendedProject[] = teamMemberships.map(tm => ({
    ...tm.project,
    teamRole: tm.role,
    salaryType: tm.salaryType,
    salaryAmount: tm.salaryAmount,
    isActive: tm.isActive,
    teamMemberId: tm.id,
  }));

  // Combine and deduplicate projects
  const allProjects: ExtendedProject[] = [
    ...vendorProjects.map(p => ({ ...p, isVendor: true })),
    ...teamProjects.filter(tp => !vendorProjects.some(vp => vp.id === tp.id)),
  ];

  // Filter by status
  const activeProjects = allProjects.filter(p =>
    p.status === 'IN_PROGRESS' || p.status === 'PUBLISHED'
  );
  const completedProjects = allProjects.filter(p =>
    p.status === 'COMPLETED' || p.status === 'CANCELLED'
  );

  // Stats
  const totalProjects = allProjects.length;
  const activeCount = activeProjects.length;
  const completedCount = completedProjects.filter(p => p.status === 'COMPLETED').length;
  const asTeamCount = teamMemberships.length;

  const isLoading = vendorLoading || teamLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proyek Saya</h1>
          <p className="text-muted-foreground">
            Kelola proyek yang sedang Anda kerjakan
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{asTeamCount}</p>
              <p className="text-xs text-muted-foreground">Sebagai Tim</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="active" className="gap-2">
            <Clock className="h-4 w-4" />
            Aktif ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Selesai ({completedProjects.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Projects */}
        <TabsContent value="active">
          {isLoading ? (
            <LoadingSkeleton />
          ) : activeProjects.length === 0 ? (
            <EmptyState type="active" userRole={user?.role} />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isTeamMember={!!project.teamRole}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Projects */}
        <TabsContent value="completed">
          {isLoading ? (
            <LoadingSkeleton />
          ) : completedProjects.length === 0 ? (
            <EmptyState type="completed" userRole={user?.role} />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {completedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isTeamMember={!!project.teamRole}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
