'use client';

import { useEffect, useState } from 'react';
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
  const { user } = useAuth();
  const [search, setSearch] = useState('');
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="glass-card hover:shadow-lg transition-all h-full cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                    <Badge className={getProjectStatusConfig(project.status).className}>
                      {getProjectStatusConfig(project.status).label}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {project.budget && (
                      <span className="font-semibold text-[#fd904c]">
                        {formatCurrency(project.budget)}
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {project.type === 'TENDER' ? 'Tender' : 'Harian'}
                    </Badge>
                  </div>
                  
                  {project.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{project.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    {project.client && (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-xs">
                          {project.client.name.charAt(0)}
                        </div>
                        <span className="text-muted-foreground truncate">{project.client.name}</span>
                      </div>
                    )}
                    {project._count && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{project._count.applications}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
