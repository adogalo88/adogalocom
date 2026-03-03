'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useSupplierOffers,
  useUpdateOffer,
  useWithdrawOffer,
  formatCurrency,
  formatDate,
  formatDateTime,
  getOfferStatusConfig,
  getMaterialStatusConfig,
} from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Calendar,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

// Stats Card Component
function StatsCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Offer Card Skeleton
function OfferCardSkeleton() {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Edit Offer Dialog
function EditOfferDialog({
  open,
  onOpenChange,
  offer,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
    id: string;
    price: number;
    notes: string | null;
    material: {
      title: string;
      budget: number | null;
    };
  } | null;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const updateOffer = useUpdateOffer(offer?.id || '');

  // Initialize form when offer changes
  useState(() => {
    if (offer) {
      setPrice(offer.price.toString());
      setNotes(offer.notes || '');
    }
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && offer) {
      setPrice(offer.price.toString());
      setNotes(offer.notes || '');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error('Masukkan harga penawaran yang valid');
      return;
    }

    try {
      await updateOffer.mutateAsync({
        price: parseFloat(price),
        notes: notes || undefined,
      });
      toast.success('Penawaran berhasil diperbarui!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui penawaran');
    }
  };

  if (!offer) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Penawaran</DialogTitle>
          <DialogDescription>
            Ubah harga atau catatan penawaran Anda
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Material Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="font-medium">{offer.material.title}</p>
              {offer.material.budget && (
                <p className="text-sm mt-1">
                  <span className="text-muted-foreground">Budget Klien: </span>
                  <span className="font-semibold text-[#fd904c]">{formatCurrency(offer.material.budget)}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-price">Harga Penawaran (Rp) *</Label>
            <Input
              id="edit-price"
              type="number"
              placeholder="Masukkan harga penawaran"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {offer.material.budget && price && parseFloat(price) > offer.material.budget && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Harga melebihi budget klien
              </p>
            )}
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Catatan (Opsional)</Label>
            <Textarea
              id="edit-notes"
              placeholder="Tambahkan catatan untuk penawaran Anda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            onClick={handleSubmit}
            disabled={updateOffer.isPending}
          >
            {updateOffer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplierOffersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [selectedOffer, setSelectedOffer] = useState<{
    id: string;
    price: number;
    notes: string | null;
    material: {
      title: string;
      budget: number | null;
    };
  } | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [offerToWithdraw, setOfferToWithdraw] = useState<string | null>(null);

  // Fetch my offers
  const { data, isLoading, error, refetch } = useSupplierOffers({
    status: statusFilter || undefined,
  });

  const withdrawOffer = useWithdrawOffer(offerToWithdraw || '');

  const offers = data?.data || [];

  // Calculate stats
  const stats = useMemo(() => {
    const total = offers.length;
    const pending = offers.filter(o => o.status === 'PENDING').length;
    const accepted = offers.filter(o => o.status === 'ACCEPTED').length;
    return { total, pending, accepted };
  }, [offers]);

  const handleEditOffer = (offer: typeof selectedOffer) => {
    setSelectedOffer(offer);
    setShowEditDialog(true);
  };

  const handleWithdrawOffer = (offerId: string) => {
    setOfferToWithdraw(offerId);
    setShowWithdrawDialog(true);
  };

  const confirmWithdraw = async () => {
    if (!offerToWithdraw) return;

    try {
      await withdrawOffer.mutateAsync();
      toast.success('Penawaran berhasil ditarik');
      setShowWithdrawDialog(false);
      setOfferToWithdraw(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menarik penawaran');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Penawaran Saya</h1>
        <p className="text-muted-foreground">
          Kelola semua penawaran yang telah Anda kirimkan
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Penawaran"
          value={stats.total}
          icon={DollarSign}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatsCard
          title="Menunggu"
          value={stats.pending}
          icon={Clock}
          color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
        />
        <StatsCard
          title="Diterima"
          value={stats.accepted}
          icon={CheckCircle}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="PENDING">Menunggu</SelectItem>
                <SelectItem value="ACCEPTED">Diterima</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Offers List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Gagal memuat data penawaran
          </CardContent>
        </Card>
      ) : offers.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {statusFilter
                ? 'Tidak ada penawaran dengan status tersebut'
                : 'Anda belum mengirimkan penawaran apapun'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="glass-card hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Content */}
                  <div className="flex-1 space-y-3">
                    {/* Title and Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{offer.material.title}</h3>
                      <Badge className={getOfferStatusConfig(offer.status).className}>
                        {getOfferStatusConfig(offer.status).label}
                      </Badge>
                      <Badge className={getMaterialStatusConfig(offer.material.status).className}>
                        Material: {getMaterialStatusConfig(offer.material.status).label}
                      </Badge>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#fd904c]">
                        {formatCurrency(offer.price)}
                      </span>
                      {offer.material.budget && (
                        <span className="text-sm text-muted-foreground">
                          (Budget: {formatCurrency(offer.material.budget)})
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {offer.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        &quot;{offer.notes}&quot;
                      </p>
                    )}

                    {/* Material Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>{offer.material.quantity} {offer.material.unit}</span>
                      </div>
                      {offer.material.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{offer.material.location}</span>
                        </div>
                      )}
                      {offer.material.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Deadline: {formatDate(offer.material.deadline)}</span>
                        </div>
                      )}
                    </div>

                    {/* Client Info */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-sm">
                        {offer.material.client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{offer.material.client.name}</p>
                        <p className="text-xs text-muted-foreground">{offer.material.client.email}</p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      Dikirim pada {formatDateTime(offer.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/materials/${offer.materialId}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Lihat Material
                    </Button>
                    {offer.status === 'PENDING' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOffer({
                            id: offer.id,
                            price: offer.price,
                            notes: offer.notes,
                            material: {
                              title: offer.material.title,
                              budget: offer.material.budget,
                            },
                          })}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleWithdrawOffer(offer.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Tarik
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Offer Dialog */}
      <EditOfferDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        offer={selectedOffer}
        onSuccess={() => refetch()}
      />

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tarik Penawaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menarik penawaran ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmWithdraw}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={withdrawOffer.isPending}
            >
              {withdrawOffer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Tarik Penawaran
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
