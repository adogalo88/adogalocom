'use client';

import { useEffect, useState } from 'react';
import { useMaterials, formatCurrency, formatDate, getMaterialStatusConfig } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, Package, MapPin, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

export default function MaterialsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setProvinces(d.data));
    fetch('/api/cities?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setCities(d.data));
  }, []);
  const citiesByProvince = provinceFilter ? cities.filter((c) => c.provinceId === provinceFilter) : cities;

  const { data, isLoading, error } = useMaterials({
    search: search || undefined,
    status: statusFilter || undefined,
    provinceId: provinceFilter || undefined,
    cityId: cityFilter || undefined,
  });

  const materials = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Material</h1>
          <p className="text-muted-foreground">
            {user?.role === 'CLIENT'
              ? 'Kelola permintaan material Anda'
              : user?.role === 'SUPPLIER'
              ? 'Temukan permintaan material dari klien'
              : 'Semua permintaan material'}
          </p>
        </div>
        {(user?.role === 'CLIENT' || user?.role === 'VENDOR' || user?.role === 'ADMIN') && (
          <Link href="/dashboard/materials/create">
            <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2">
              <Plus className="h-4 w-4" />
              Minta Material
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
                placeholder="Cari material..."
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
                <SelectItem value="PUBLISHED">Dipublikasi</SelectItem>
                <SelectItem value="IN_PROGRESS">Proses</SelectItem>
                <SelectItem value="FULFILLED">Terpenuhi</SelectItem>
                <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
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

      {/* Materials Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
        </div>
      ) : error ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Gagal memuat data material
          </CardContent>
        </Card>
      ) : materials.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada permintaan material</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => (
            <Link key={material.id} href={`/dashboard/materials/${material.id}`}>
              <Card className="glass-card hover:shadow-lg transition-all h-full cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{material.title}</CardTitle>
                    <Badge className={getMaterialStatusConfig(material.status).className}>
                      {getMaterialStatusConfig(material.status).label}
                    </Badge>
                  </div>
                  {material.description && (
                    <CardDescription className="line-clamp-2">{material.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jumlah</span>
                    <span className="font-medium">{material.quantity} {material.unit}</span>
                  </div>
                  
                  {material.budget && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-semibold text-[#fd904c]">{formatCurrency(material.budget)}</span>
                    </div>
                  )}
                  
                  {material.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{material.location}</span>
                    </div>
                  )}
                  
                  {material.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Deadline: {formatDate(material.deadline)}</span>
                    </div>
                  )}
                  
                  {material.client && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-xs">
                        {material.client.name.charAt(0)}
                      </div>
                      <span className="text-sm text-muted-foreground truncate">{material.client.name}</span>
                      {material._count && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {material._count.offers} penawaran
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
