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
import { Search, MapPin, Star, ChevronLeft, ChevronRight, Loader2, Wrench, Clock } from 'lucide-react';

interface Tukang {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  totalReviews: number;
  totalProjects: number;
  description: string | null;
  specialty: string | null;
  experience: number | null;
  city: { id: string; name: string; province: { id: string; name: string } } | null;
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  province: { id: string; name: string };
}

const TUKANG_SPECIALTIES = [
  { value: 'batu', label: 'Tukang Batu' },
  { value: 'kayu', label: 'Tukang Kayu' },
  { value: 'besi', label: 'Tukang Besi' },
  { value: 'listrik', label: 'Tukang Listrik' },
  { value: 'plumbon', label: 'Tukang Plumbon' },
  { value: 'cat', label: 'Tukang Cat' },
  { value: 'mandor', label: 'Mandor' },
];

export default function DirectoryTukangsPage() {
  const [tukangs, setTukangs] = useState<Tukang[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    fetch('/api/cities?activeOnly=true')
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) setCities(data.data);
      });
  }, []);

  const fetchTukangs = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (specialty) params.set('specialty', specialty);
      if (minRating) params.set('minRating', minRating);
      params.set('sortBy', sortBy);
      params.set('page', String(page));
      params.set('limit', '12');
      const res = await fetch(`/api/directory/tukangs?${params}`);
      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        setTukangs(Array.isArray(data.data) ? data.data : []);
        setPagination(data.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTukangs(1);
  }, [cityId, specialty, minRating, sortBy]);

  return (
    <div className="flex flex-col">
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-background to-amber-500/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Cari <span className="bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">Tukang</span> Profesional
            </h1>
            <p className="text-muted-foreground mb-6">
              Temukan tukang terverifikasi sesuai keahlian dan lokasi Anda
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau keahlian..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTukangs(1)}
                  className="pl-10 h-11"
                />
              </div>
              <Button onClick={() => fetchTukangs(1)} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-90 h-11">
                Cari
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={cityId || 'all'} onValueChange={(v) => setCityId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lokasi</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={specialty || 'all'} onValueChange={(v) => setSpecialty(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Keahlian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Keahlian</SelectItem>
                {TUKANG_SPECIALTIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
                <SelectItem value="experience">Pengalaman</SelectItem>
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
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        ) : tukangs.length === 0 ? (
          <div className="text-center py-20">
            <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Tidak ada tukang ditemukan</h3>
            <p className="text-muted-foreground text-sm">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Menampilkan {tukangs.length} dari {pagination.total} tukang
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tukangs.map((t) => (
                <Link key={t.id} href={`/dashboard/profile/${t.id}`}>
                  <article className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-orange-500/30 transition-all duration-200 h-full flex flex-col">
                    <div className="aspect-[4/3] bg-muted/50 relative flex items-center justify-center p-6">
                      <Avatar className="h-24 w-24 ring-4 ring-background">
                        <AvatarImage src={t.avatar ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-2xl">
                          {t.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-lg truncate group-hover:text-orange-600 transition-colors">{t.name}</h3>
                      {t.specialty && (
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded mt-1 w-fit">
                          {t.specialty}
                        </span>
                      )}
                      {t.city && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {t.city.name}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {t.rating.toFixed(1)}
                        </span>
                        {t.experience != null && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {t.experience} tahun
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.description}</p>
                      )}
                      <Button variant="outline" size="sm" className="mt-4 w-full group-hover:bg-orange-500/10 group-hover:border-orange-500/30">
                        Lihat Profil
                      </Button>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button variant="outline" size="sm" onClick={() => fetchTukangs(pagination.page - 1)} disabled={pagination.page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-4">Halaman {pagination.page} dari {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => fetchTukangs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
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
