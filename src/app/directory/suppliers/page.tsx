'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin, Star, ChevronLeft, ChevronRight, Loader2, Truck, Package } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  totalReviews: number;
  totalProjects: number;
  description: string | null;
  city: { id: string; name: string; province: { id: string; name: string } } | null;
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  province: { id: string; name: string };
}

interface Province {
  id: string;
  name: string;
}

export default function DirectorySuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    Promise.all([
      fetch('/api/provinces?activeOnly=true').then((r) => r.json().catch(() => ({}))),
      fetch('/api/cities?activeOnly=true').then((r) => r.json().catch(() => ({}))),
    ]).then(([provincesData, citiesData]) => {
      if (provincesData?.success && Array.isArray(provincesData.data)) setProvinces(provincesData.data);
      if (citiesData?.success && Array.isArray(citiesData.data)) setCities(citiesData.data);
    });
  }, []);

  const filteredCities = provinceId ? cities.filter((c) => c.province?.id === provinceId) : cities;

  const fetchSuppliers = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (provinceId) params.set('provinceId', provinceId);
      if (minRating) params.set('minRating', minRating);
      params.set('sortBy', sortBy);
      params.set('page', String(page));
      params.set('limit', '12');
      const res = await fetch(`/api/directory/suppliers?${params}`);
      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        setSuppliers(Array.isArray(data.data) ? data.data : []);
        setPagination(data.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(1);
  }, [cityId, provinceId, minRating, sortBy]);

  return (
    <div className="flex flex-col">
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-background to-cyan-500/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Cari <span className="bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">Supplier</span> Material
            </h1>
            <p className="text-muted-foreground mb-6">
              Temukan supplier material bangunan terverifikasi untuk kebutuhan proyek Anda
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers(1)}
                  className="pl-10 h-11"
                />
              </div>
              <Button onClick={() => fetchSuppliers(1)} className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:opacity-90 h-11">
                Cari
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={provinceId || 'all'} onValueChange={(v) => { setProvinceId(v === 'all' ? '' : v); setCityId(''); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Provinsi</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityId || 'all'} onValueChange={(v) => setCityId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kota/Kab." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kota</SelectItem>
                {filteredCities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={minRating || 'all'} onValueChange={(v) => setMinRating(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Rating</SelectItem>
                <SelectItem value="4.5">4.5+ Bintang</SelectItem>
                <SelectItem value="4">4+ Bintang</SelectItem>
                <SelectItem value="3.5">3.5+ Bintang</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Rating Tertinggi</SelectItem>
                <SelectItem value="totalProjects">Proyek Terbanyak</SelectItem>
                <SelectItem value="reviews">Ulasan Terbanyak</SelectItem>
                <SelectItem value="name">Nama A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-20">
            <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Tidak ada supplier ditemukan</h3>
            <p className="text-muted-foreground text-sm">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Menampilkan {suppliers.length} dari {pagination.total} supplier
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {suppliers.map((s) => (
                <Link key={s.id} href={`/dashboard/profile/${s.id}`}>
                  <article className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-teal-500/30 transition-all duration-200 h-full flex flex-col">
                    <div className="aspect-[4/3] bg-muted/50 relative flex items-center justify-center p-6">
                      <Avatar className="h-24 w-24 ring-4 ring-background">
                        <AvatarImage src={s.avatar ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-2xl">
                          {s.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-lg truncate group-hover:text-teal-600 transition-colors">{s.name}</h3>
                      <span className="text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-950/30 px-2 py-0.5 rounded mt-1 w-fit">
                        Supplier
                      </span>
                      {s.city && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {s.city.name}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {s.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Package className="h-3.5 w-3.5" />
                          {s.totalProjects} proyek
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                      )}
                      <Button variant="outline" size="sm" className="mt-4 w-full group-hover:bg-teal-500/10 group-hover:border-teal-500/30">
                        Lihat Profil
                      </Button>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button variant="outline" size="sm" onClick={() => fetchSuppliers(pagination.page - 1)} disabled={pagination.page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-4">Halaman {pagination.page} dari {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchSuppliers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
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
