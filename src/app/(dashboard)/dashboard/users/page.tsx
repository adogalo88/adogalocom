'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers, useUser, formatDate } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Search, Users, UserCheck, UserX, Shield, Star, Mail, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

/** Format nomor untuk WhatsApp: 08xxx -> 628xxx */
function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (!digits.startsWith('62')) return '62' + digits;
  return digits;
}

export default function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true')
      .then((r) => r.json())
      .then((d) => d.success && d.data && setProvinces(d.data));
    fetch('/api/cities?activeOnly=true')
      .then((r) => r.json())
      .then((d) => d.success && d.data && setCities(d.data));
  }, []);

  const citiesByProvince = provinceFilter
    ? cities.filter((c) => c.provinceId === provinceFilter)
    : cities;

  const { data, isLoading, error } = useUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    provinceId: provinceFilter || undefined,
    cityId: cityFilter || undefined,
    limit: '100',
    page: '1',
  });

  const users = data?.data || [];

  // Stats
  const stats = {
    total: users.length,
    verified: users.filter(u => u.isVerified).length,
    pending: users.filter(u => u.status === 'PENDING_VERIFICATION').length,
    admins: users.filter(u => u.role === 'ADMIN').length,
  };

  const refetchUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    if (selectedUserId) queryClient.invalidateQueries({ queryKey: ['user', selectedUserId] });
  };

  const handleVerify = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVerified: true,
          status: 'ACTIVE',
          verifiedAt: new Date().toISOString(),
          verifiedBy: user?.id,
        }),
      });
      if (!response.ok) throw new Error('Gagal memverifikasi user');
      toast.success('User berhasil diverifikasi!');
      refetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memverifikasi user');
    }
  };

  const handleActivate = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      if (!response.ok) throw new Error('Gagal mengaktifkan user');
      toast.success('User berhasil diaktifkan!');
      refetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengaktifkan user');
    }
  };

  const handleSuspend = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUSPENDED' }),
      });
      if (!response.ok) throw new Error('Gagal menangguhkan user');
      toast.success('User berhasil ditangguhkan!');
      refetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menangguhkan user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Yakin ingin menghapus user ini? Tindakan tidak dapat dibatalkan.')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus user');
      toast.success('User berhasil dihapus');
      setSelectedUserId(null);
      refetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus user');
    }
  };

  const roleLabels: Record<string, string> = {
    CLIENT: 'Klien',
    VENDOR: 'Vendor',
    TUKANG: 'Tukang',
    SUPPLIER: 'Supplier',
    ADMIN: 'Admin',
  };

  const roleColors: Record<string, string> = {
    CLIENT: 'bg-purple-100 text-purple-700',
    VENDOR: 'bg-blue-100 text-blue-700',
    TUKANG: 'bg-orange-100 text-orange-700',
    SUPPLIER: 'bg-teal-100 text-teal-700',
    ADMIN: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Manajemen User</h1>
        <p className="text-muted-foreground">Kelola semua pengguna platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#fd904c]/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#fd904c]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total User</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-xs text-muted-foreground">Terverifikasi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Menunggu Verifikasi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter || 'all'} onValueChange={(v) => setRoleFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="CLIENT">Klien</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
                <SelectItem value="TUKANG">Tukang</SelectItem>
                <SelectItem value="SUPPLIER">Supplier</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">Menunggu</SelectItem>
                <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={provinceFilter || 'all'} onValueChange={(v) => { setProvinceFilter(v === 'all' ? '' : v); setCityFilter(''); }}>
              <SelectTrigger className="w-full md:w-44">
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
              <SelectTrigger className="w-full md:w-44">
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

      {/* Users Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
            </div>
          ) : error ? (
            <p className="text-center text-muted-foreground py-8">Gagal memuat data user</p>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tidak ada user ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={u.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                              {u.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[u.role]}>
                          {roleLabels[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[u.status]}>
                          {u.status === 'ACTIVE' ? 'Aktif' :
                           u.status === 'PENDING_VERIFICATION' ? 'Menunggu' :
                           u.status === 'SUSPENDED' ? 'Ditangguhkan' : 'Tidak Aktif'}
                        </Badge>
                        {u.isVerified && (
                          <Badge className="ml-1 bg-green-100 text-green-700">✓</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{u.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-sm">
                            ({u.totalReviews})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => window.open(`mailto:${u.email}`, '_blank')}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Email
                            </DropdownMenuItem>
                            {toWhatsAppNumber(u.phone) && (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    `https://wa.me/${toWhatsAppNumber(u.phone)}`,
                                    '_blank'
                                  )
                                }
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                WhatsApp
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!u.isVerified && u.status === 'PENDING_VERIFICATION' && (
                              <DropdownMenuItem onClick={() => handleVerify(u.id)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Verifikasi
                              </DropdownMenuItem>
                            )}
                            {u.status === 'SUSPENDED' && (
                              <DropdownMenuItem onClick={() => handleActivate(u.id)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Aktifkan
                              </DropdownMenuItem>
                            )}
                            {u.status !== 'SUSPENDED' && u.role !== 'ADMIN' && (
                              <DropdownMenuItem
                                onClick={() => handleSuspend(u.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Tangguhkan
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {u.id !== user?.id && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(u.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail user (Sheet) */}
      <UserDetailSheet
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onVerify={handleVerify}
        onActivate={handleActivate}
        onSuspend={handleSuspend}
        onDelete={handleDelete}
        roleLabels={roleLabels}
        roleColors={roleColors}
        statusColors={statusColors}
        currentUserId={user?.id}
      />
    </div>
  );
}

interface UserDetailSheetProps {
  userId: string | null;
  onClose: () => void;
  onVerify: (id: string) => void;
  onActivate: (id: string) => void;
  onSuspend: (id: string) => void;
  onDelete: (id: string) => void;
  roleLabels: Record<string, string>;
  roleColors: Record<string, string>;
  statusColors: Record<string, string>;
  currentUserId?: string;
}

function UserDetailSheet({
  userId,
  onClose,
  onVerify,
  onActivate,
  onSuspend,
  onDelete,
  roleLabels,
  roleColors,
  statusColors,
  currentUserId,
}: UserDetailSheetProps) {
  const { data, isLoading } = useUser(userId ?? '');

  const u = data?.user;
  const isAdmin = u?.role === 'ADMIN';
  const canChangeStatus = currentUserId !== u?.id;

  const waNumber = u?.phone ? toWhatsAppNumber(u.phone) : null;

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Profil User</SheetTitle>
          <SheetDescription>Detail informasi dan aksi untuk user ini</SheetDescription>
        </SheetHeader>
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
          </div>
        )}
        {!isLoading && u && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={u.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-xl">
                  {u.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={roleColors[u.role]}>{roleLabels[u.role]}</Badge>
                  <Badge className={statusColors[u.status]}>
                    {u.status === 'ACTIVE' ? 'Aktif' :
                     u.status === 'PENDING_VERIFICATION' ? 'Menunggu' :
                     u.status === 'SUSPENDED' ? 'Ditangguhkan' : 'Tidak Aktif'}
                  </Badge>
                  {u.isVerified && (
                    <Badge className="bg-green-100 text-green-700">Terverifikasi</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`mailto:${u.email}`, '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              {waNumber && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://wa.me/${waNumber}`, '_blank')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {u.phone && (
                <p><span className="text-muted-foreground">Telepon:</span> {u.phone}</p>
              )}
              {u.address && (
                <p><span className="text-muted-foreground">Alamat:</span> {u.address}</p>
              )}
              {u.city && (
                <p>
                  <span className="text-muted-foreground">Kota:</span>{' '}
                  {typeof u.city === 'object' && u.city !== null
                    ? `${(u.city as { name: string }).name}${(u.city as { province?: { name: string } }).province ? `, ${(u.city as { province: { name: string } }).province.name}` : ''}`
                    : String(u.city)}
                </p>
              )}
              {u.specialty && (
                <p><span className="text-muted-foreground">Keahlian:</span> {u.specialty}</p>
              )}
              {u.experience != null && (
                <p><span className="text-muted-foreground">Pengalaman:</span> {u.experience} tahun</p>
              )}
              {u.description && (
                <p><span className="text-muted-foreground">Deskripsi:</span> {u.description}</p>
              )}
              <p><span className="text-muted-foreground">Rating:</span> {u.rating?.toFixed(1) ?? '0'} ({u.totalReviews ?? 0} ulasan)</p>
              <p><span className="text-muted-foreground">Terdaftar:</span> {formatDate(u.createdAt)}</p>
              {(u as { _count?: { projectsAsClient?: number; projectsAsVendor?: number } })._count != null && (
                <p>
                  <span className="text-muted-foreground">Proyek (klien):</span> {(u as { _count: { projectsAsClient?: number } })._count.projectsAsClient ?? 0}
                  {' · '}
                  <span className="text-muted-foreground">Proyek (vendor):</span> {(u as { _count: { projectsAsVendor?: number } })._count.projectsAsVendor ?? 0}
                </p>
              )}
            </div>

            {canChangeStatus && !isAdmin && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {!u.isVerified && u.status === 'PENDING_VERIFICATION' && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onVerify(u.id)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Verifikasi
                  </Button>
                )}
                {u.status === 'SUSPENDED' && (
                  <Button size="sm" onClick={() => onActivate(u.id)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Aktifkan
                  </Button>
                )}
                {u.status !== 'SUSPENDED' && (
                  <Button size="sm" variant="destructive" onClick={() => onSuspend(u.id)}>
                    <UserX className="h-4 w-4 mr-2" />
                    Tangguhkan
                  </Button>
                )}
              </div>
            )}
            {currentUserId !== u.id && (
              <div className="pt-4 border-t">
                <Button size="sm" variant="destructive" onClick={() => onDelete(u.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus User
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
