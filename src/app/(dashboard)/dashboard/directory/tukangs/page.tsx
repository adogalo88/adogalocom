'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  MapPin,
  Star,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wrench,
  Clock,
} from 'lucide-react';

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
  city: {
    id: string;
    name: string;
    province: { id: string; name: string };
  } | null;
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  province: { id: string; name: string };
}

// Tukang specialties
const TUKANG_SPECIALTIES = [
  { value: 'batu', label: 'Tukang Batu' },
  { value: 'kayu', label: 'Tukang Kayu' },
  { value: 'besi', label: 'Tukang Besi' },
  { value: 'listrik', label: 'Tukang Listrik' },
  { value: 'plumbon', label: 'Tukang Plumbon' },
  { value: 'cat', label: 'Tukang Cat' },
  { value: 'mandor', label: 'Mandor' },
];

export default function TukangDirectoryPage() {
  const [tukangs, setTukangs] = useState<Tukang[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  // Fetch cities for filter
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch('/api/cities?activeOnly=true');
        const data = await res.json();
        if (data.success) {
          setCities(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    };
    fetchCities();
  }, []);

  // Fetch tukangs
  const fetchTukangs = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (specialty) params.set('specialty', specialty);
      if (minRating) params.set('minRating', minRating);
      if (minExperience) params.set('minExperience', minExperience);
      params.set('sortBy', sortBy);
      params.set('page', page.toString());
      params.set('limit', '12');

      const res = await fetch(`/api/directory/tukangs?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTukangs(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch tukangs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTukangs(1);
  }, [cityId, specialty, minRating, minExperience, sortBy]);

  const handleSearch = () => {
    fetchTukangs(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchTukangs(newPage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Direktori Tukang</h1>
        <p className="text-muted-foreground">Temukan tukang profesional untuk kebutuhan Anda</p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari tukang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger>
                <SelectValue placeholder="Lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Lokasi</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Keahlian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Keahlian</SelectItem>
                {TUKANG_SPECIALTIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Rating</SelectItem>
                <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                <SelectItem value="4">4+ ⭐</SelectItem>
                <SelectItem value="3.5">3.5+ ⭐</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Rating Tertinggi</SelectItem>
                <SelectItem value="experience">Pengalaman Terbanyak</SelectItem>
                <SelectItem value="reviews">Ulasan Terbanyak</SelectItem>
                <SelectItem value="name">Nama A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
        </div>
      ) : tukangs.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Tidak ada tukang ditemukan</h3>
          <p className="text-muted-foreground">Coba ubah filter pencarian Anda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tukangs.map((tukang) => (
              <Link key={tukang.id} href={`/dashboard/profile/${tukang.id}`}>
                <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={tukang.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xl">
                          {tukang.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{tukang.name}</h3>
                        {tukang.specialty && (
                          <Badge variant="secondary" className="mt-1">
                            {tukang.specialty}
                          </Badge>
                        )}
                        {tukang.city && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {tukang.city.name}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{tukang.rating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({tukang.totalReviews})
                            </span>
                          </div>
                          {tukang.experience && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {tukang.experience} tahun
                            </div>
                          )}
                        </div>
                        {tukang.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {tukang.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Halaman {pagination.page} dari {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
