'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, MapPin, ChevronLeft, ChevronRight, Loader2, Truck, MessageSquare, Phone } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  picPhone: string | null;
  rating: number;
  totalReviews: number;
  description: string | null;
  city: { id: string; name: string; province: { id: string; name: string } } | null;
  materialCategories: { id: string; name: string }[];
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  province: { id: string; name: string };
}

interface MaterialCat {
  id: string;
  name: string;
  children?: { id: string; name: string }[];
}

export default function DirectorySuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [materialCategories, setMaterialCategories] = useState<MaterialCat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('rating');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/provinces?activeOnly=true').then((r) => r.json().catch(() => ({}))),
      fetch('/api/cities?activeOnly=true').then((r) => r.json().catch(() => ({}))),
      fetch('/api/material-categories').then((r) => r.json().catch(() => ({}))),
    ]    ).then(([provincesData, citiesData, catData]) => {
      if (provincesData?.success && Array.isArray(provincesData.data)) setProvinces(provincesData.data);
      if (citiesData?.success && Array.isArray(citiesData.data)) setCities(citiesData.data);
      const cats = Array.isArray(catData?.categories) ? catData.categories : [];
      setMaterialCategories(cats);
    });
  }, []);

  const filteredCities = provinceId ? cities.filter((c: City) => c.province?.id === provinceId) : cities;

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const fetchSuppliers = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (provinceId) params.set('provinceId', provinceId);
      if (categoryIds.length) params.set('categoryIds', categoryIds.join(','));
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
  }, [cityId, provinceId, categoryIds.join(','), sortBy]);

  const waNumber = (s: Supplier) => {
    const num = s.picPhone || s.phone || '';
    const clean = num.replace(/\D/g, '');
    return clean.startsWith('0') ? '62' + clean.slice(1) : clean.startsWith('62') ? clean : '62' + clean;
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
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

      {/* Filters - centered */}
      <section className="border-b border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <select
              value={provinceId || 'all'}
              onChange={(e) => { setProvinceId(e.target.value === 'all' ? '' : e.target.value); setCityId(''); }}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[180px]"
            >
              <option value="all">Semua Provinsi</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={cityId || 'all'}
              onChange={(e) => setCityId(e.target.value === 'all' ? '' : e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[180px]"
            >
              <option value="all">Semua Kota</option>
              {filteredCities.map((c: City) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="relative group">
              <details className="dropdown">
                <summary className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[200px] cursor-pointer list-none flex items-center justify-between">
                  Kategori Material {categoryIds.length > 0 && `(${categoryIds.length})`}
                </summary>
                <div className="absolute left-0 mt-1 p-3 rounded-lg border bg-background shadow-lg z-10 max-h-64 overflow-y-auto w-64">
                  {materialCategories.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={categoryIds.includes(p.id)}
                          onChange={() => toggleCategory(p.id)}
                          className="rounded"
                        />
                        {p.name}
                      </label>
                      {p.children?.map((ch) => (
                        <label key={ch.id} className="flex items-center gap-2 cursor-pointer text-sm pl-4">
                          <input
                            type="checkbox"
                            checked={categoryIds.includes(ch.id)}
                            onChange={() => toggleCategory(ch.id)}
                            className="rounded"
                          />
                          {ch.name}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[180px]"
            >
              <option value="rating">Rating Tertinggi</option>
              <option value="name">Nama A-Z</option>
            </select>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="container mx-auto px-4 py-8 flex-1">
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
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Menampilkan {suppliers.length} dari {pagination.total} supplier
            </p>
            <div className="max-w-4xl mx-auto space-y-3">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:bg-muted/30 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => s.avatar && setEnlargedImage(s.avatar)}
                    className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    <Avatar className="h-14 w-14 ring-2 ring-border cursor-pointer hover:ring-teal-500/50 transition-all">
                      <AvatarImage src={s.avatar ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-lg">
                        {s.name?.charAt(0)?.toUpperCase() ?? 'S'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{s.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      {s.city?.province && <span>{s.city.province.name}</span>}
                      {s.city && <span>{s.city.name}</span>}
                    </div>
                    {s.materialCategories?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.materialCategories.map((c) => (
                          <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open('/dashboard/messages', '_blank')}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </Button>
                    {(s.picPhone || s.phone) && (
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                        onClick={() => window.open(`https://wa.me/${waNumber(s)}`, '_blank')}
                      >
                        <Phone className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
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
