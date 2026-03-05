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
import { Search, MapPin, Wallet, Briefcase, Loader2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  budget: number | null;
  city?: { id: string; name: string; province?: { name: string } } | null;
  category?: { id: string; name: string } | null;
  _count?: { applications: number };
}

export default function ProyekTenderPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetch('/api/cities?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setCities(d.data));
    fetch('/api/categories').then((r) => r.json()).then((d) => setCategories(Array.isArray(d?.categories) ? d.categories : []));
  }, []);

  const fetchProjects = async (page = 1) => {
    if (!user || (user.role !== 'VENDOR' && user.role !== 'ADMIN')) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('type', 'TENDER');
      params.set('status', 'PUBLISHED');
      params.set('page', String(page));
      params.set('limit', '12');
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (categoryId) params.set('categoryId', categoryId);
      const res = await fetch(`/api/projects?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data?.data) {
        setProjects(Array.isArray(data.data) ? data.data : []);
        setPagination(data.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'VENDOR' || user?.role === 'ADMIN') fetchProjects(pagination.page);
  }, [user?.role, pagination.page, search, cityId, categoryId]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  if (user?.role !== 'VENDOR' && user?.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#fd904c]/5 via-background to-[#e57835]/5">
      <RoleLandingHeader title="Adogalo" subtitle="Proyek Tender / Kontrak" />

      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fd904c]/10 via-transparent to-[#e57835]/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Proyek <span className="bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">Tender / Kontrak</span>
            </h1>
            <p className="text-muted-foreground mb-6">
              Temukan proyek tender yang sesuai dengan kapasitas Anda
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari judul atau deskripsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProjects(1)}
                  className="pl-10 h-11 rounded-xl border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm"
                />
              </div>
              <Button onClick={() => fetchProjects(1)} className="bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90 h-11 rounded-xl">
                Cari
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-white/30 dark:bg-gray-900/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Select value={cityId || 'all'} onValueChange={(v) => setCityId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px] rounded-xl border-white/20 bg-white/70 dark:bg-gray-900/50">
                <SelectValue placeholder="Lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lokasi</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryId || 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px] rounded-xl border-white/20 bg-white/70 dark:bg-gray-900/50">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((c) => (
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
            <Loader2 className="h-10 w-10 animate-spin text-[#fd904c]" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Tidak ada proyek tender</h3>
            <p className="text-muted-foreground text-sm">Coba ubah filter atau cek lagi nanti</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Menampilkan {projects.length} dari {pagination.total} proyek
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                  <Card className="h-full rounded-2xl border border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl hover:shadow-xl hover:shadow-[#fd904c]/10 hover:border-[#fd904c]/30 transition-all duration-200 overflow-hidden">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-lg line-clamp-2 mb-2">{p.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                      {p.category && (
                        <span className="inline-block text-xs font-medium text-[#e57835] bg-[#fd904c]/10 px-2 py-0.5 rounded mb-3">{p.category.name}</span>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {p.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {p.city.name}
                          </span>
                        )}
                        {p.budget != null && (
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" />
                            Rp {(p.budget / 1e6).toFixed(0)}jt
                          </span>
                        )}
                      </div>
                      {p._count?.applications != null && (
                        <p className="text-xs text-muted-foreground mt-2">{p._count.applications} lamaran</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button variant="outline" size="sm" onClick={() => fetchProjects(pagination.page - 1)} disabled={pagination.page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-4">Halaman {pagination.page} dari {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchProjects(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
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
