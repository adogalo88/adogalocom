'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects, useCategories, formatCurrency, formatDate, getProjectStatusConfig } from '@/hooks/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, FolderKanban, MapPin, Calendar, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user && !['CLIENT', 'ADMIN'].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setProvinces(d.data));
    fetch('/api/cities?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setCities(d.data));
  }, []);
  const citiesByProvince = provinceFilter ? cities.filter((c) => c.provinceId === provinceFilter) : cities;

  const { data, isLoading, error } = useProjects({
    search: search || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    provinceId: provinceFilter || undefined,
    cityId: cityFilter || undefined,
  });

  const { data: categoriesData } = useCategories();

  const projects = data?.data || [];

  if (user && !['CLIENT', 'ADMIN'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Mengalihkan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proyek</h1>
          <p className="text-muted-foreground">
            {user?.role === 'CLIENT' 
              ? 'Kelola proyek Anda' 
              : user?.role === 'VENDOR' || user?.role === 'TUKANG'
              ? 'Temukan proyek yang tersedia'
              : 'Semua proyek di platform'}
          </p>
        </div>
        {(user?.role === 'CLIENT' || user?.role === 'ADMIN') && (
          <Link href="/dashboard/projects/create">
            <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2">
              <Plus className="h-4 w-4" />
              Pasang Proyek
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari proyek..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">Menunggu peninjauan</SelectItem>
                <SelectItem value="PUBLISHED">Dipublikasi</SelectItem>
                <SelectItem value="IN_PROGRESS">Berjalan</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="TENDER">Tender</SelectItem>
                <SelectItem value="HARIAN">Harian</SelectItem>
              </SelectContent>
            </Select>
            <Select value={provinceFilter || 'all'} onValueChange={(v) => { setProvinceFilter(v === 'all' ? '' : v); setCityFilter(''); }}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Provinsi</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter || 'all'} onValueChange={(v) => setCityFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Kota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kota</SelectItem>
                {citiesByProvince.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
        </div>
      ) : error ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Gagal memuat data proyek
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada proyek</p>
            {(user?.role === 'CLIENT' || user?.role === 'ADMIN') && (
              <Link href="/dashboard/projects/create">
                <Button className="mt-4">Pasang Proyek Pertama</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-sm">Judul</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Tipe</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">RFQ</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Budget</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Kota</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Klien</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Penawaran</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/projects/${project.id}`} className="font-medium text-[#fd904c] hover:underline line-clamp-2">
                          {project.title}
                        </Link>
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{project.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getProjectStatusConfig(project.status).className}>
                          {getProjectStatusConfig(project.status).label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {project.type === 'TENDER' ? 'Tender' : 'Harian'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {project.type === 'TENDER' ? (
                          project.tenderSubtype === 'WITH_RFQ' ? (
                            <Badge variant="outline" className="text-xs border-[#fd904c] text-[#fd904c]">Dengan RFQ</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Tanpa RFQ</Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {project.budget ? formatCurrency(project.budget) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground max-w-[140px] truncate" title={project.city?.name || ''}>
                        {project.city?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {project.client ? (
                          <span className="truncate block max-w-[120px]" title={project.client.name}>{project.client.name}</span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {(project._count || project.rfq?._count) ? (
                          <>
                            <Users className="h-3.5 w-3.5 inline-block mr-1 align-middle" />
                            {project.tenderSubtype === 'WITH_RFQ' && project.rfq?._count != null
                              ? project.rfq._count.submissions
                              : project._count?.applications ?? 0}
                            <span className="text-xs ml-0.5">{project.tenderSubtype === 'WITH_RFQ' ? ' penawaran' : ' lamaran'}</span>
                          </>
                        ) : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
