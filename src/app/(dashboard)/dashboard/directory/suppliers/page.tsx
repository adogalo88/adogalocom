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
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Truck,
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  totalReviews: number;
  totalProjects: number;
  description: string | null;
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

export default function SupplierDirectoryPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
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
  const [provinceId, setProvinceId] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  // Fetch provinces and cities for filter
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const [provincesRes, citiesRes] = await Promise.all([
          fetch('/api/provinces?activeOnly=true'),
          fetch('/api/cities?activeOnly=true'),
        ]);
        
        const provincesData = await provincesRes.json();
        const citiesData = await citiesRes.json();
        
        if (provincesData.success) {
          setProvinces(provincesData.data);
        }
        if (citiesData.success) {
          setCities(citiesData.data);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };
    fetchLocations();
  }, []);

  // Filter cities based on selected province
  const filteredCities = provinceId
    ? cities.filter(c => c.province.id === provinceId)
    : cities;

  // Fetch suppliers
  const fetchSuppliers = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cityId) params.set('cityId', cityId);
      if (provinceId) params.set('provinceId', provinceId);
      if (minRating) params.set('minRating', minRating);
      params.set('sortBy', sortBy);
      params.set('page', page.toString());
      params.set('limit', '12');

      const res = await fetch(`/api/directory/suppliers?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSuppliers(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers(1);
  }, [cityId, provinceId, minRating, sortBy]);

  const handleSearch = () => {
    fetchSuppliers(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchSuppliers(newPage);
  };

  // Reset city when province changes
  const handleProvinceChange = (value: string) => {
    setProvinceId(value);
    setCityId(''); // Reset city when province changes
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Direktori Supplier</h1>
        <p className="text-muted-foreground">Temukan supplier terpercaya untuk kebutuhan material Anda</p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={provinceId} onValueChange={handleProvinceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Provinsi</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger>
                <SelectValue placeholder="Kota/Kab." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kota</SelectItem>
                {filteredCities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
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
                <SelectItem value="totalProjects">Proyek Terbanyak</SelectItem>
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
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Tidak ada supplier ditemukan</h3>
          <p className="text-muted-foreground">Coba ubah filter pencarian Anda</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <Link key={supplier.id} href={`/dashboard/profile/${supplier.id}`}>
                <Card className="glass-card hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={supplier.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white text-xl">
                          {supplier.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{supplier.name}</h3>
                        <Badge variant="secondary" className="mt-1 bg-teal-100 text-teal-700">
                          Supplier
                        </Badge>
                        {supplier.city && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {supplier.city.name}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{supplier.rating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({supplier.totalReviews})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Package className="h-3 w-3" />
                            {supplier.totalProjects} proyek
                          </div>
                        </div>
                        {supplier.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {supplier.description}
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
