'use client';

import { useState } from 'react';
import { useTransactions, formatCurrency, formatDate, getTransactionStatusConfig } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Wallet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, isLoading, error } = useTransactions({
    search,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });

  const transactions = data?.data || [];
  const stats = (data as { stats?: { totalCompleted: number; totalPending: number; totalCount: number } })?.stats;

  // Stats: dari API (vendor) atau hitung dari list (client/admin)
  const totalCompleted = stats
    ? stats.totalCompleted
    : transactions
        .filter(t => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + ((t as { total?: number }).total ?? t.amount ?? 0), 0);
  const totalPending = stats
    ? stats.totalPending
    : transactions
        .filter(t => t.status === 'PENDING' || t.status === 'PROCESSING')
        .reduce((sum, t) => sum + ((t as { total?: number }).total ?? t.amount ?? 0), 0);
  const totalCount = stats ? stats.totalCount : transactions.length;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pembayaran</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Kelola semua transaksi' : 'Riwayat transaksi Anda'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Selesai</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCompleted)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menunggu</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#fd904c]/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-[#fd904c]" />
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
                placeholder="Cari transaksi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="PENDING">Menunggu</SelectItem>
                <SelectItem value="PROCESSING">Diproses</SelectItem>
                <SelectItem value="COMPLETED">Selesai</SelectItem>
                <SelectItem value="FAILED">Gagal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="PROJECT_PAYMENT">Pembayaran Proyek</SelectItem>
                <SelectItem value="MATERIAL_PAYMENT">Pembayaran Material</SelectItem>
                <SelectItem value="SUBSCRIPTION">Langganan</SelectItem>
                <SelectItem value="WITHDRAWAL">Penarikan</SelectItem>
                <SelectItem value="REFUND">Pengembalian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
            </div>
          ) : error ? (
            <p className="text-center text-muted-foreground py-8">Gagal memuat data transaksi</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada transaksi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>User</TableHead>}
                    <TableHead>Catatan</TableHead>
                    {isAdmin && <TableHead>Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tx.type === 'PROJECT_PAYMENT' ? 'Proyek' :
                           tx.type === 'MATERIAL_PAYMENT' ? 'Material' :
                           tx.type === 'SUBSCRIPTION' ? 'Langganan' :
                           tx.type === 'WITHDRAWAL' ? 'Penarikan' : 'Refund'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransactionStatusConfig(tx.status).className}>
                          {getTransactionStatusConfig(tx.status).label}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {tx.user?.name || '-'}
                        </TableCell>
                      )}
                      <TableCell className="max-w-[200px] truncate">
                        {tx.notes || '-'}
                      </TableCell>
                      {isAdmin && tx.status === 'PENDING' && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
