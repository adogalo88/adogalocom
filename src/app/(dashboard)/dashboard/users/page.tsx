'use client';

import { useState } from 'react';
import { useUsers, formatCurrency, formatDate } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Users, UserCheck, UserX, Shield, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, error } = useUsers({
    search,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  });

  const users = data?.data || [];

  // Stats
  const stats = {
    total: users.length,
    verified: users.filter(u => u.isVerified).length,
    pending: users.filter(u => u.status === 'PENDING_VERIFICATION').length,
    admins: users.filter(u => u.role === 'ADMIN').length,
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memverifikasi user');
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menangguhkan user');
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                    <TableRow key={u.id}>
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
                      <TableCell>
                        <div className="flex gap-1">
                          {!u.isVerified && u.status === 'PENDING_VERIFICATION' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleVerify(u.id)}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Verifikasi
                            </Button>
                          )}
                          {u.status !== 'SUSPENDED' && u.role !== 'ADMIN' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(u.id)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Tangguhkan
                            </Button>
                          )}
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
    </div>
  );
}
