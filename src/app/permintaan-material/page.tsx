'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { RoleLandingHeader } from '@/components/landing/RoleLandingHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin, Package, Loader2, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';

interface MaterialItem {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  budget: number | null;
  status: string;
  city?: { id: string; name: string; province?: { name: string } } | null;
  client?: { id: string; name: string };
  project?: { id: string; title: string } | null;
  _count?: { offers: number };
  hasOffered?: boolean;
  offerStatus?: string | null;
}

interface City {
  id: string;
  name: string;
}

interface Province {
  id: string;
  name: string;
  cities?: City[];
}

export default function PermintaanMaterialPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [provinceId, setProvinceId] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'SUPPLIER') {
      router.replace('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data)) setProvinces(d.data);
      });
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    fetch(`/api/cities?activeOnly=true&provinceId=${provinceId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data)) setCities(d.data);
      });
  }, [provinceId]);

  const fetchMaterials = async (page = 1) => {
    if (!user || user.role !== 'SUPPLIER') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (provinceId) params.set('provinceId', provinceId);
      const res = await fetch(`/api/materials?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data?.data) {
        setMaterials(Array.isArray(data.data) ? data.data : []);
        const pag = data.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 };
        setPagination(pag);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPPLIER') fetchMaterials(pagination.page);
  }, [user?.role, pagination.page, search, cityId, provinceId]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  if (user?.role !== 'SUPPLIER') return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-500/5 via-background to-fuchsia-500/5">
      <RoleLandingHeader title="Adogalo" subtitle="Permintaan Material" />

      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Permintaan <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Material</span>
            </h1>
            <p className="text-muted-foreground mb-6">
              Lihat permintaan material dari client dan kirim penawaran
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari judul atau deskripsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMaterials(1)}
                  className="pl-10 h-11 rounded-xl border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm"
                />
              </div>
              <Button onClick={() => fetchMaterials(1)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 h-11 rounded-xl">
                Cari
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-white/30 dark:bg-gray-900/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Select value={provinceId || 'all'} onValueChange={(v) => { setProvinceId(v === 'all' ? '' : v); setCityId(''); }}>
              <SelectTrigger className="w-[180px] rounded-xl border-white/20 bg-white/70 dark:bg-gray-900/50">
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Provinsi</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityId || 'all'} onValueChange={(v) => setCityId(v === 'all' ? '' : v)} disabled={!provinceId}>
              <SelectTrigger className="w-[180px] rounded-xl border-white/20 bg-white/70 dark:bg-gray-900/50">
                <SelectValue placeholder="Kota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kota</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12 flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Tidak ada permintaan material</h3>
            <p className="text-muted-foreground text-sm">Coba ubah filter atau cek lagi nanti</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Menampilkan {materials.length} dari {pagination.total} permintaan
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {materials.map((m) => (
                <Link key={m.id} href={`/dashboard/materials/${m.id}`}>
                  <Card className="h-full rounded-2xl border border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/30 transition-all duration-200 overflow-hidden">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-lg line-clamp-2 mb-2">{m.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{m.description || '—'}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Package className="h-3.5 w-3.5" />
                          {m.quantity} {m.unit}
                        </span>
                        {m.budget != null && (
                          <span>Rp {(m.budget / 1e6).toFixed(1)}jt</span>
                        )}
                      </div>
                      {m.city && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {m.city.name}
                          {m.city.province && `, ${m.city.province.name}`}
                        </p>
                      )}
                      {m.client && (
                        <p className="text-xs text-muted-foreground mt-1">Oleh: {m.client.name}</p>
                      )}
                      {m._count?.offers != null && (
                        <p className="text-xs text-muted-foreground mt-1">{m._count.offers} penawaran</p>
                      )}
                      {m.hasOffered && (
                        <span className="inline-block mt-2 text-xs font-medium text-violet-600 bg-violet-100 dark:bg-violet-950/40 px-2 py-0.5 rounded">
                          Sudah kirim penawaran
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button variant="outline" size="sm" onClick={() => fetchMaterials(pagination.page - 1)} disabled={pagination.page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-4">Halaman {pagination.page} dari {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchMaterials(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
