'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  MapPin,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Province {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  cities?: City[];
  _count?: { cities: number };
}

interface City {
  id: string;
  name: string;
  code: string | null;
  provinceId: string;
  isActive: boolean;
  province?: { id: string; name: string };
  _count?: { users: number };
}

export default function LocationsPage() {
  const { user } = useAuth();

  // States
  const [activeTab, setActiveTab] = useState('provinces');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [provinceSearch, setProvinceSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [cityProvinceFilter, setCityProvinceFilter] = useState<string>('all');

  // Dialogs
  const [provinceDialogOpen, setProvinceDialogOpen] = useState(false);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form data
  const [editingProvince, setEditingProvince] = useState<Province | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'province' | 'city'; id: string; name: string } | null>(null);

  const [provinceForm, setProvinceForm] = useState({ name: '', code: '' });
  const [cityForm, setCityForm] = useState({ name: '', code: '', provinceId: '' });

  const [expandedProvinces, setExpandedProvinces] = useState<string[]>([]);

  // Fetch data
  const fetchProvinces = async () => {
    try {
      const res = await fetch('/api/provinces?activeOnly=false&includeCities=true');
      const data = await res.json();
      if (data.success) {
        setProvinces(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat data provinsi');
    }
  };

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities?activeOnly=false');
      const data = await res.json();
      if (data.success) {
        setCities(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat data kota');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchProvinces(), fetchCities()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Province handlers
  const openProvinceDialog = (province?: Province) => {
    if (province) {
      setEditingProvince(province);
      setProvinceForm({ name: province.name, code: province.code || '' });
    } else {
      setEditingProvince(null);
      setProvinceForm({ name: '', code: '' });
    }
    setProvinceDialogOpen(true);
  };

  const saveProvince = async () => {
    if (!provinceForm.name.trim()) {
      toast.error('Nama provinsi wajib diisi');
      return;
    }

    try {
      const url = editingProvince
        ? `/api/provinces/${editingProvince.id}`
        : '/api/provinces';
      const method = editingProvince ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provinceForm),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setProvinceDialogOpen(false);
        fetchProvinces();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  // City handlers
  const openCityDialog = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setCityForm({
        name: city.name,
        code: city.code || '',
        provinceId: city.provinceId,
      });
    } else {
      setEditingCity(null);
      setCityForm({ name: '', code: '', provinceId: '' });
    }
    setCityDialogOpen(true);
  };

  const saveCity = async () => {
    if (!cityForm.name.trim()) {
      toast.error('Nama kota wajib diisi');
      return;
    }
    if (!cityForm.provinceId && !editingCity) {
      toast.error('Provinsi wajib dipilih');
      return;
    }

    try {
      const url = editingCity ? `/api/cities/${editingCity.id}` : '/api/cities';
      const method = editingCity ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cityForm),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setCityDialogOpen(false);
        fetchCities();
        fetchProvinces();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  // Toggle active status
  const toggleProvinceStatus = async (province: Province) => {
    try {
      const res = await fetch(`/api/provinces/${province.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !province.isActive }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Provinsi berhasil ${province.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
        fetchProvinces();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const toggleCityStatus = async (city: City) => {
    try {
      const res = await fetch(`/api/cities/${city.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !city.isActive }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Kota berhasil ${city.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
        fetchCities();
        fetchProvinces();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!deletingItem) return;

    try {
      const url = deletingItem.type === 'province'
        ? `/api/provinces/${deletingItem.id}`
        : `/api/cities/${deletingItem.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        if (deletingItem.type === 'province') {
          fetchProvinces();
        } else {
          fetchCities();
          fetchProvinces();
        }
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    }
  };

  // Filter data
  const filteredProvinces = provinces.filter(p =>
    p.name.toLowerCase().includes(provinceSearch.toLowerCase())
  );

  const filteredCities = cities.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(citySearch.toLowerCase());
    const matchProvince = cityProvinceFilter === 'all' || c.provinceId === cityProvinceFilter;
    return matchSearch && matchProvince;
  });

  // Toggle expand province
  const toggleExpand = (provinceId: string) => {
    setExpandedProvinces(prev =>
      prev.includes(provinceId)
        ? prev.filter(id => id !== provinceId)
        : [...prev, provinceId]
    );
  };

  // Check admin access
  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Manajemen Lokasi</h1>
        <p className="text-muted-foreground">Kelola provinsi dan kota/kabupaten di Indonesia</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{provinces.length}</p>
                <p className="text-xs text-muted-foreground">Total Provinsi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{provinces.filter(p => p.isActive).length}</p>
                <p className="text-xs text-muted-foreground">Provinsi Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cities.length}</p>
                <p className="text-xs text-muted-foreground">Total Kota/Kab.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cities.filter(c => c.isActive).length}</p>
                <p className="text-xs text-muted-foreground">Kota/Kab. Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="provinces">Provinsi</TabsTrigger>
          <TabsTrigger value="cities">Kota/Kabupaten</TabsTrigger>
        </TabsList>

        {/* Provinces Tab */}
        <TabsContent value="provinces" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari provinsi..."
                    value={provinceSearch}
                    onChange={(e) => setProvinceSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => openProvinceDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Provinsi
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Provinsi</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Kota/Kab.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProvinces.map((province) => (
                        <>
                          <TableRow key={province.id}>
                            <TableCell>
                              <button onClick={() => toggleExpand(province.id)}>
                                {expandedProvinces.includes(province.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="font-medium">{province.name}</TableCell>
                            <TableCell>{province.code || '-'}</TableCell>
                            <TableCell>{province.cities?.length || 0}</TableCell>
                            <TableCell>
                              <Badge
                                className={province.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                                }
                              >
                                {province.isActive ? 'Aktif' : 'Nonaktif'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openProvinceDialog(province)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleProvinceStatus(province)}
                                >
                                  {province.isActive ? (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => {
                                    setDeletingItem({ type: 'province', id: province.id, name: province.name });
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedProvinces.includes(province.id) && province.cities && province.cities.length > 0 && (
                            <TableRow key={`${province.id}-cities`}>
                              <TableCell colSpan={6} className="bg-muted/30 p-0">
                                <div className="px-12 py-2">
                                  <p className="text-sm font-medium mb-2">Kota/Kabupaten:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {province.cities.map((city) => (
                                      <Badge
                                        key={city.id}
                                        variant="outline"
                                        className={city.isActive ? '' : 'opacity-50'}
                                      >
                                        {city.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cities Tab */}
        <TabsContent value="cities" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col md:flex-row gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari kota..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={cityProvinceFilter} onValueChange={setCityProvinceFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter Provinsi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Provinsi</SelectItem>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openCityDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Kota
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kota/Kabupaten</TableHead>
                        <TableHead>Provinsi</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCities.map((city) => (
                        <TableRow key={city.id}>
                          <TableCell className="font-medium">{city.name}</TableCell>
                          <TableCell>{city.province?.name || '-'}</TableCell>
                          <TableCell>{city.code || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              className={city.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                              }
                            >
                              {city.isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openCityDialog(city)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleCityStatus(city)}
                              >
                                {city.isActive ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => {
                                  setDeletingItem({ type: 'city', id: city.id, name: city.name });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Province Dialog */}
      <Dialog open={provinceDialogOpen} onOpenChange={setProvinceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvince ? 'Edit Provinsi' : 'Tambah Provinsi'}
            </DialogTitle>
            <DialogDescription>
              {editingProvince
                ? 'Perbarui informasi provinsi'
                : 'Tambahkan provinsi baru ke dalam sistem'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="province-name">Nama Provinsi *</Label>
              <Input
                id="province-name"
                value={provinceForm.name}
                onChange={(e) => setProvinceForm({ ...provinceForm, name: e.target.value })}
                placeholder="Contoh: Jawa Barat"
              />
            </div>
            <div>
              <Label htmlFor="province-code">Kode Provinsi (Opsional)</Label>
              <Input
                id="province-code"
                value={provinceForm.code}
                onChange={(e) => setProvinceForm({ ...provinceForm, code: e.target.value })}
                placeholder="Contoh: 32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvinceDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveProvince}>
              {editingProvince ? 'Simpan Perubahan' : 'Tambah Provinsi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City Dialog */}
      <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCity ? 'Edit Kota/Kabupaten' : 'Tambah Kota/Kabupaten'}
            </DialogTitle>
            <DialogDescription>
              {editingCity
                ? 'Perbarui informasi kota/kabupaten'
                : 'Tambahkan kota/kabupaten baru ke dalam sistem'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="city-province">Provinsi *</Label>
              <Select
                value={cityForm.provinceId}
                onValueChange={(value) => setCityForm({ ...cityForm, provinceId: value })}
                disabled={!!editingCity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Provinsi" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.filter(p => p.isActive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="city-name">Nama Kota/Kabupaten *</Label>
              <Input
                id="city-name"
                value={cityForm.name}
                onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                placeholder="Contoh: Bandung"
              />
            </div>
            <div>
              <Label htmlFor="city-code">Kode Kota (Opsional)</Label>
              <Input
                id="city-code"
                value={cityForm.code}
                onChange={(e) => setCityForm({ ...cityForm, code: e.target.value })}
                placeholder="Contoh: 32.73"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCityDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveCity}>
              {editingCity ? 'Simpan Perubahan' : 'Tambah Kota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus {deletingItem?.type === 'province' ? 'provinsi' : 'kota'} <strong>{deletingItem?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
