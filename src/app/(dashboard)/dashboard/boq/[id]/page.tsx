'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useBOQ, useUpdateBOQ, useDeleteBOQ, formatCurrency, formatDate, formatDateTime, getBOQStatusConfig, BOQ, BOQItem } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Loader2,
  ArrowLeft,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Calendar,
  User,
  Building2,
  Calculator,
  MessageSquare,
  Clock,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// Status history timeline
interface StatusHistory {
  status: string;
  timestamp: string;
  by?: string;
  reason?: string;
}

// Skeleton for loading state
function BOQDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function BOQDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const boqId = params.id as string;
  const isEditMode = searchParams.get('edit') === 'true';

  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isEditing, setIsEditing] = useState(isEditMode);
  const [editItems, setEditItems] = useState<BOQItem[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const initializedRef = useRef(false);

  const { data, isLoading, error, refetch } = useBOQ(boqId);
  const updateBOQ = useUpdateBOQ(boqId);
  const deleteBOQ = useDeleteBOQ(boqId);

  const boq = data?.data;

  // Initialize edit state when boq data is loaded (only once)
  // This is necessary to populate the edit form with server data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (boq && !initializedRef.current) {
      initializedRef.current = true;
      setEditItems(boq.items || []);
      setEditTitle(boq.title);
      setEditDescription(boq.description || '');
      setEditNotes(boq.notes || '');
    }
  }, [boq]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isOwner = boq?.vendorId === user?.id;
  const isProjectClient = boq?.project?.client?.id === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT';
  const isVendor = user?.role === 'VENDOR' || user?.role === 'TUKANG';

  const canAccept = isProjectClient && boq?.status === 'SUBMITTED';
  const canReject = isProjectClient && boq?.status === 'SUBMITTED';
  const canEdit = isOwner && (boq?.status === 'DRAFT' || boq?.status === 'REJECTED');
  const canDelete = isOwner && (boq?.status === 'DRAFT' || boq?.status === 'REJECTED');
  const canSubmit = isOwner && boq?.status === 'DRAFT';

  // Calculate total
  const calculateTotal = (items: BOQItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  // Handle accept BOQ
  const handleAccept = async () => {
    try {
      await updateBOQ.mutateAsync({ status: 'ACCEPTED' });
      toast.success('RAB berhasil diterima!');
      setShowAcceptDialog(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menerima RAB');
    }
  };

  // Handle reject BOQ
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    try {
      await updateBOQ.mutateAsync({ status: 'REJECTED', rejectionReason });
      toast.success('RAB telah ditolak');
      setShowRejectDialog(false);
      setRejectionReason('');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menolak RAB');
    }
  };

  // Handle submit BOQ
  const handleSubmit = async () => {
    try {
      await updateBOQ.mutateAsync({ status: 'SUBMITTED' });
      toast.success('RAB berhasil diajukan!');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengajukan RAB');
    }
  };

  // Handle delete BOQ
  const handleDelete = async () => {
    try {
      await deleteBOQ.mutateAsync();
      toast.success('RAB berhasil dihapus');
      router.push('/dashboard/boq');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus RAB');
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      const items = editItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.quantity) * Number(item.unitPrice),
      }));

      await updateBOQ.mutateAsync({
        title: editTitle,
        description: editDescription,
        notes: editNotes,
        items,
      });
      toast.success('RAB berhasil diperbarui!');
      setIsEditing(false);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui RAB');
    }
  };

  // Edit item handlers
  const updateEditItem = (index: number, field: keyof BOQItem, value: string | number) => {
    const newItems = [...editItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditItems(newItems);
  };

  const addEditItem = () => {
    setEditItems([...editItems, { name: '', quantity: 1, unit: 'buah', unitPrice: 0, totalPrice: 0 }]);
  };

  const removeEditItem = (index: number) => {
    if (editItems.length > 1) {
      setEditItems(editItems.filter((_, i) => i !== index));
    }
  };

  if (isLoading) {
    return <BOQDetailSkeleton />;
  }

  if (error || !boq) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">RAB tidak ditemukan</p>
        <Link href="/dashboard/boq">
          <Button className="mt-4">Kembali ke Daftar RAB</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{boq.title}</h1>
            <Badge className={getBOQStatusConfig(boq.status).className}>
              {getBOQStatusConfig(boq.status).label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Dibuat {formatDate(boq.createdAt)}
            </span>
            {boq.project && (
              <Link
                href={`/dashboard/projects/${boq.projectId}`}
                className="text-[#fd904c] hover:underline"
              >
                <Building2 className="h-4 w-4 inline mr-1" />
                {boq.project.title}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canSubmit && !isEditing && (
            <Button
              onClick={handleSubmit}
              disabled={updateBOQ.isPending}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              <Send className="h-4 w-4 mr-2" />
              Ajukan
            </Button>
          )}
          {canEdit && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && !isEditing && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </Button>
          )}
          {canAccept && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowAcceptDialog(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Terima
            </Button>
          )}
          {canReject && (
            <Button
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Tolak
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Deskripsi</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Deskripsi RAB..."
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {boq.description || 'Tidak ada deskripsi'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Item RAB
                </CardTitle>
                {isEditing && (
                  <Button size="sm" variant="outline" onClick={addEditItem}>
                    Tambah Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">No</TableHead>
                      <TableHead>Nama Item</TableHead>
                      <TableHead className="w-24">Jumlah</TableHead>
                      <TableHead className="w-28">Satuan</TableHead>
                      <TableHead className="w-36">Harga Satuan</TableHead>
                      <TableHead className="w-36">Total</TableHead>
                      {isEditing && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isEditing ? (
                      editItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Input
                              value={item.name}
                              onChange={(e) => updateEditItem(index, 'name', e.target.value)}
                              placeholder="Nama item"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateEditItem(index, 'quantity', Number(e.target.value))}
                              min="1"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.unit}
                              onChange={(e) => updateEditItem(index, 'unit', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateEditItem(index, 'unitPrice', Number(e.target.value))}
                              min="0"
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-[#fd904c]">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeEditItem(index)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      boq.items?.map((item: BOQItem, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="font-semibold text-[#fd904c]">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="font-medium text-lg">Total RAB:</span>
                <span className="text-2xl font-bold text-[#fd904c]">
                  {formatCurrency(isEditing ? calculateTotal(editItems) : boq.totalPrice)}
                </span>
              </div>

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-3 mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateBOQ.isPending}
                    className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                  >
                    {updateBOQ.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Simpan Perubahan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Catatan</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                  rows={3}
                />
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {boq.notes || 'Tidak ada catatan'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          {boq.project && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Proyek</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/dashboard/projects/${boq.projectId}`}
                  className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <p className="font-medium text-[#fd904c]">{boq.project.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {boq.project.location || 'Lokasi tidak ditentukan'}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {boq.project.status}
                  </Badge>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Vendor Info */}
          {boq.vendor && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Vendor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={boq.vendor.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-lg">
                      {boq.vendor.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{boq.vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{boq.vendor.email}</p>
                  </div>
                </div>
                {!isOwner && boq.vendor && (
                  <Link href={`/dashboard/messages?with=${boq.vendorId}`}>
                    <Button variant="outline" className="w-full mt-4">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Hubungi Vendor
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Client Info */}
          {boq.project?.client && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Klien</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={boq.project.client.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-lg">
                      {boq.project.client.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{boq.project.client.name}</p>
                    <p className="text-sm text-muted-foreground">{boq.project.client.email}</p>
                  </div>
                </div>
                {!isProjectClient && boq.project.client && (
                  <Link href={`/dashboard/messages?with=${boq.project.client.id}`}>
                    <Button variant="outline" className="w-full mt-4">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Hubungi Klien
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Riwayat Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getBOQStatusConfig(boq.status).className}>
                        {getBOQStatusConfig(boq.status).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDateTime(boq.createdAt)}
                    </p>
                  </div>
                </div>
                {/* TODO: Add more status history if tracked */}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accept Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terima RAB?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menerima RAB &quot;{boq.title}&quot; dengan total nilai{' '}
              <span className="font-semibold text-[#fd904c]">{formatCurrency(boq.totalPrice)}</span>.
              Tindakan ini menandakan persetujuan Anda terhadap rencana anggaran biaya ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={updateBOQ.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateBOQ.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Ya, Terima
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak RAB?</AlertDialogTitle>
            <AlertDialogDescription>
              Berikan alasan penolakan untuk RAB &quot;{boq.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Alasan Penolakan *</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Jelaskan alasan penolakan..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={updateBOQ.isPending || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {updateBOQ.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus RAB?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus RAB &quot;{boq.title}&quot;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteBOQ.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteBOQ.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
