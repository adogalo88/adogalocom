'use client';

import { useState } from 'react';
import { useBOQs, formatCurrency, formatDate, getBOQStatusConfig, BOQ } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Plus,
  Search,
  FileText,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  FolderKanban,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-full bg-gradient-to-br ${color.replace('text-', 'bg-')}/10`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton for table rows
function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
    </TableRow>
  );
}

export default function BOQListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boqToDelete, setBoqToDelete] = useState<BOQ | null>(null);

  const { data, isLoading, error } = useBOQs({
    status: statusFilter || undefined,
  });

  const boqs = data?.data || [];

  // Filter by search
  const filteredBoqs = boqs.filter((boq) =>
    boq.title.toLowerCase().includes(search.toLowerCase()) ||
    boq.project?.title?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: boqs.length,
    draft: boqs.filter((b) => b.status === 'DRAFT').length,
    submitted: boqs.filter((b) => b.status === 'SUBMITTED').length,
    accepted: boqs.filter((b) => b.status === 'ACCEPTED').length,
  };

  const isVendor = user?.role === 'VENDOR' || user?.role === 'TUKANG';
  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN';

  const handleDelete = async () => {
    if (!boqToDelete) return;
    try {
      const response = await fetch(`/api/boq/${boqToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Gagal menghapus BOQ');
      toast.success('BOQ berhasil dihapus');
      setDeleteDialogOpen(false);
      setBoqToDelete(null);
      // Refetch will happen automatically via React Query
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus BOQ');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bill of Quantities (RAB)</h1>
          <p className="text-muted-foreground">
            {isClient
              ? 'Daftar RAB untuk proyek Anda'
              : isVendor
              ? 'Kelola RAB yang Anda buat'
              : 'Semua RAB di platform'}
          </p>
        </div>
        {isVendor && (
          <Link href="/dashboard/boq/create">
            <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2">
              <Plus className="h-4 w-4" />
              Buat RAB Baru
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total RAB"
          value={stats.total}
          icon={FileText}
          color="text-[#e57835]"
        />
        <StatsCard
          title="Draft"
          value={stats.draft}
          icon={FolderKanban}
          color="text-gray-500"
        />
        <StatsCard
          title="Diajukan"
          value={stats.submitted}
          icon={Clock}
          color="text-yellow-500"
        />
        <StatsCard
          title="Diterima"
          value={stats.accepted}
          icon={CheckCircle}
          color="text-green-500"
        />
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari RAB..."
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
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Diajukan</SelectItem>
                <SelectItem value="ACCEPTED">Diterima</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* BOQ Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Total Harga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-12">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : error ? (
            <div className="py-12 text-center text-muted-foreground">
              Gagal memuat data RAB
            </div>
          ) : filteredBoqs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Belum ada RAB</p>
              {isVendor && (
                <Link href="/dashboard/boq/create">
                  <Button className="mt-4">Buat RAB Pertama</Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Proyek</TableHead>
                  <TableHead>Total Harga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="w-12">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoqs.map((boq) => (
                  <TableRow key={boq.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div
                        className="font-medium"
                        onClick={() => router.push(`/dashboard/boq/${boq.id}`)}
                      >
                        {boq.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-[#fd904c] hover:underline"
                        onClick={() => router.push(`/dashboard/projects/${boq.projectId}`)}
                      >
                        {boq.project?.title || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-[#fd904c]">
                      {formatCurrency(boq.totalPrice)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getBOQStatusConfig(boq.status).className}>
                        {getBOQStatusConfig(boq.status).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(boq.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/boq/${boq.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                          {(boq.status === 'DRAFT' && (boq.vendorId === user?.id || isAdmin)) && (
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/boq/${boq.id}?edit=true`)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {(boq.status === 'DRAFT' || boq.status === 'REJECTED') && (boq.vendorId === user?.id || isAdmin) && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setBoqToDelete(boq);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus RAB?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus RAB &quot;{boqToDelete?.title}&quot;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
