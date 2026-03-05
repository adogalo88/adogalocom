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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cities?activeOnly=true')
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) setCities(data.data);
      });
  }, []);

  const toggleSpecialty = (value: string) => {
    setSpecialties((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  };

  const fetchTukangs = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (specialties.length) params.set('specialties', specialties.join(','));
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
  }, [cityId, specialties.join(','), minRating, sortBy]);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Cari <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Tukang</span> Profesional
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
              <Button onClick={() => fetchTukangs(1)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 h-11">
                Cari
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters - centered, keahlian multi-select */}
      <section className="border-b border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
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
            <div className="relative">
              <details className="dropdown">
                <summary className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px] cursor-pointer list-none flex items-center justify-between gap-2">
                  Keahlian {specialties.length > 0 && `(${specialties.length})`}
                </summary>
                <div className="absolute left-0 mt-1 p-3 rounded-lg border bg-background shadow-lg z-10 w-56">
                  {TUKANG_SPECIALTIES.map((s) => (
                    <label key={s.value} className="flex items-center gap-2 cursor-pointer text-sm py-1">
                      <input
                        type="checkbox"
                        checked={specialties.includes(s.value)}
                        onChange={() => toggleSpecialty(s.value)}
                        className="rounded"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </details>
            </div>
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

      <section className="container mx-auto px-4 py-8 md:py-12 flex-1">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          </div>
        ) : tukangs.length === 0 ? (
          <div className="text-center py-20">
            <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Tidak ada tukang ditemukan</h3>
            <p className="text-muted-foreground text-sm">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Menampilkan {tukangs.length} dari {pagination.total} tukang
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tukangs.map((t) => (
                <Link key={t.id} href={`/directory/tukangs/${t.id}`}>
                  <article className="group rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 h-full flex flex-col">
                    <div className="aspect-[4/3] bg-muted/50 relative flex items-center justify-center p-6">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (t.avatar) setEnlargedImage(t.avatar); }}
                        className="rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
<Avatar className="h-24 w-24 ring-4 ring-background/80 cursor-pointer hover:ring-emerald-500/50 transition-all">
                        <AvatarImage src={t.avatar ?? undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-2xl">
                            {t.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-lg truncate group-hover:text-emerald-600 transition-colors">{t.name}</h3>
                      {t.specialty && (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded mt-1 w-fit">
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
                      <Button variant="outline" size="sm" className="mt-4 w-full group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30">
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

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto profil</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            <img
              src={enlargedImage}
              alt="Foto profil"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
