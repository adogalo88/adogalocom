'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMaterial, useMaterialOffers, useCreateOffer, formatCurrency, formatDate, getMaterialStatusConfig, getApplicationStatusConfig } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  Package,
  MapPin,
  Clock,
  ArrowLeft,
  DollarSign,
  CheckCircle,
  XCircle,
  Edit,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const materialId = params.id as string;
  
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [showConfirmDeliveryDialog, setShowConfirmDeliveryDialog] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const { data, isLoading, error, refetch } = useMaterial(materialId);
  const { data: offersData, refetch: refetchOffers } = useMaterialOffers(materialId);
  const createOffer = useCreateOffer(materialId);

  const material = data?.material;
  const offers = offersData?.offers || [];

  const isOwner = material?.clientId === user?.id;
  const isSupplier = user?.role === 'SUPPLIER';
  const isAdmin = user?.role === 'ADMIN';
  const canOffer = isSupplier && material?.status === 'PUBLISHED';
  const hasOffered = offers.some(o => o.supplierId === user?.id);

  const handleCreateOffer = async () => {
    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      toast.error('Masukkan harga penawaran yang valid');
      return;
    }
    
    try {
      await createOffer.mutateAsync({
        price: parseFloat(offerPrice),
        notes: offerNotes || undefined,
      });
      toast.success('Penawaran berhasil dikirim!');
      setShowOfferDialog(false);
      setOfferPrice('');
      setOfferNotes('');
      refetchOffers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim penawaran');
    }
  };

  const handleAcceptOffer = async () => {
    if (!selectedOfferId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/materials/${materialId}/offers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOfferId,
          status: 'ACCEPTED',
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Penawaran diterima!');
        setAcceptDialogOpen(false);
        setSelectedOfferId(null);
        refetch();
        refetchOffers();
      } else {
        toast.error(result.error || 'Gagal menerima penawaran');
      }
    } catch (error) {
      toast.error('Gagal menerima penawaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!selectedOfferId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/materials/${materialId}/offers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOfferId,
          status: 'REJECTED',
          rejectionReason: rejectReason || undefined,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Penawaran ditolak');
        setRejectDialogOpen(false);
        setSelectedOfferId(null);
        setRejectReason('');
        refetchOffers();
      } else {
        toast.error(result.error || 'Gagal menolak penawaran');
      }
    } catch (error) {
      toast.error('Gagal menolak penawaran');
    } finally {
      setIsProcessing(false);
    }
  };

  // Supplier starts delivery
  const handleStartDelivery = async () => {
    if (!selectedOfferId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/materials/${materialId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOfferId,
          action: 'start_delivery',
          deliveryNotes: deliveryNotes || undefined,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Status pengiriman diperbarui!');
        setShowDeliveryDialog(false);
        setSelectedOfferId(null);
        setDeliveryNotes('');
        refetchOffers();
      } else {
        toast.error(result.error || 'Gagal memulai pengiriman');
      }
    } catch (error) {
      toast.error('Gagal memulai pengiriman');
    } finally {
      setIsProcessing(false);
    }
  };

  // Client confirms delivery
  const handleConfirmDelivery = async () => {
    if (!selectedOfferId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/materials/${materialId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOfferId,
          action: 'confirm_delivery',
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Penerimaan material dikonfirmasi!');
        setShowConfirmDeliveryDialog(false);
        setSelectedOfferId(null);
        refetch();
        refetchOffers();
      } else {
        toast.error(result.error || 'Gagal mengkonfirmasi penerimaan');
      }
    } catch (error) {
      toast.error('Gagal mengkonfirmasi penerimaan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateMaterialStatus = async (newStatus: 'PUBLISHED' | 'FULFILLED' | 'CANCELLED') => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(`Material ${newStatus === 'PUBLISHED' ? 'dipublikasi' : newStatus === 'FULFILLED' ? 'selesai' : 'dibatalkan'}`);
        refetch();
      } else {
        toast.error(result.error || 'Gagal mengubah status material');
      }
    } catch (error) {
      toast.error('Gagal mengubah status material');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Material tidak ditemukan</p>
        <Link href="/dashboard/materials">
          <Button className="mt-4">Kembali ke Daftar Material</Button>
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
            <h1 className="text-2xl font-bold">{material.title}</h1>
            <Badge className={getMaterialStatusConfig(material.status).className}>
              {getMaterialStatusConfig(material.status).label}
            </Badge>
          </div>
          {material.description && (
            <p className="text-muted-foreground">{material.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Supplier Actions */}
          {canOffer && !hasOffered && (
            <Button
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
              onClick={() => setShowOfferDialog(true)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Buat Penawaran
            </Button>
          )}
          
          {/* Client Actions - Publish */}
          {isOwner && material.status === 'DRAFT' && (
            <Button
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
              onClick={() => handleUpdateMaterialStatus('PUBLISHED')}
              disabled={isProcessing}
            >
              <Send className="h-4 w-4 mr-2" />
              Publikasikan
            </Button>
          )}
          
          {/* Client Actions - Mark Fulfilled */}
          {isOwner && material.status === 'IN_PROGRESS' && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleUpdateMaterialStatus('FULFILLED')}
              disabled={isProcessing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Material Diterima
            </Button>
          )}
          
          {/* Client Actions - Cancel */}
          {(isOwner || isAdmin) && (material.status === 'DRAFT' || material.status === 'PUBLISHED' || material.status === 'IN_PROGRESS') && (
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => handleUpdateMaterialStatus('CANCELLED')}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Batalkan
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Detail Material</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah</p>
                  <p className="font-semibold text-lg">{material.quantity} {material.unit}</p>
                </div>
                {material.budget && (
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-semibold text-lg text-[#fd904c]">{formatCurrency(material.budget)}</p>
                  </div>
                )}
              </div>
              
              {material.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{material.location}</span>
                </div>
              )}
              
              {material.deadline && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Deadline: {formatDate(material.deadline)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offers */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Penawaran ({offers.length})</CardTitle>
              <CardDescription>
                {isOwner ? 'Penawaran dari supplier - pilih satu untuk diterima' : 'Penawaran untuk material ini'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada penawaran
                </p>
              ) : (
                <div className="space-y-4">
                  {offers.map((offer) => {
                    const getStatusLabel = (status: string) => {
                      switch (status) {
                        case 'PENDING': return 'Menunggu';
                        case 'ACCEPTED': return 'Diterima';
                        case 'REJECTED': return 'Ditolak';
                        case 'DELIVERING': return 'Dalam Pengiriman';
                        case 'DELIVERED': return 'Sampai';
                        default: return status;
                      }
                    };
                    
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'ACCEPTED': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
                        case 'REJECTED': return 'border-red-300 bg-red-50 dark:bg-red-950/20';
                        case 'DELIVERING': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
                        case 'DELIVERED': return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
                        default: return 'border-border bg-muted/30';
                      }
                    };

                    const isMyOffer = offer.supplierId === user?.id;
                    
                    return (
                      <div
                        key={offer.id}
                        className={`p-4 rounded-lg border ${getStatusColor(offer.status)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                                {offer.supplier?.name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{offer.supplier?.name}</p>
                              <p className="text-sm text-muted-foreground">{offer.supplier?.email}</p>
                            </div>
                          </div>
                          <Badge className={getApplicationStatusConfig(offer.status).className}>
                            {getStatusLabel(offer.status)}
                          </Badge>
                        </div>
                        
                        <div className="mt-3">
                          <span className="text-2xl font-bold text-[#fd904c]">
                            {formatCurrency(offer.price)}
                          </span>
                        </div>
                        
                        {offer.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{offer.notes}</p>
                        )}

                        {/* Delivery info */}
                        {(offer as any).deliveryDate && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Tanggal kirim: {formatDate((offer as any).deliveryDate)}
                          </p>
                        )}
                        {(offer as any).deliveryNotes && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Catatan: {(offer as any).deliveryNotes}
                          </p>
                        )}
                        
                        {/* Action Buttons for Client */}
                        {isOwner && offer.status === 'PENDING' && material.status === 'PUBLISHED' && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedOfferId(offer.id);
                                setAcceptDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Terima
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedOfferId(offer.id);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Tolak
                            </Button>
                          </div>
                        )}

                        {/* Delivery button for Supplier */}
                        {isSupplier && isMyOffer && offer.status === 'ACCEPTED' && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => {
                                setSelectedOfferId(offer.id);
                                setShowDeliveryDialog(true);
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Mulai Pengiriman
                            </Button>
                          </div>
                        )}

                        {/* Confirm delivery button for Client */}
                        {isOwner && (offer.status === 'DELIVERING' || offer.status === 'ACCEPTED') && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedOfferId(offer.id);
                                setShowConfirmDeliveryDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Konfirmasi Penerimaan
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Peminta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-lg">
                    {material.client?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{material.client?.name}</p>
                  <p className="text-sm text-muted-foreground">{material.client?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${material.status === 'DRAFT' ? 'bg-gray-500' : 'bg-green-500'}`} />
                  <span className={material.status === 'DRAFT' ? 'font-medium' : 'text-muted-foreground'}>Draft</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${material.status === 'PUBLISHED' ? 'bg-blue-500' : material.status === 'IN_PROGRESS' || material.status === 'FULFILLED' ? 'bg-green-500' : 'text-muted-foreground'}`} />
                  <span className={material.status === 'PUBLISHED' ? 'font-medium' : 'text-muted-foreground'}>Dipublikasi</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${material.status === 'IN_PROGRESS' ? 'bg-yellow-500' : material.status === 'FULFILLED' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={material.status === 'IN_PROGRESS' ? 'font-medium' : 'text-muted-foreground'}>Dalam Proses</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${material.status === 'FULFILLED' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={material.status === 'FULFILLED' ? 'font-medium' : 'text-muted-foreground'}>Selesai</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Penawaran</DialogTitle>
            <DialogDescription>
              Kirim penawaran harga Anda untuk material ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Harga Penawaran (Rp) *</Label>
              <Input
                type="number"
                placeholder="Masukkan harga penawaran"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan untuk penawaran Anda..."
                value={offerNotes}
                onChange={(e) => setOfferNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
              Batal
            </Button>
            <Button
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
              onClick={handleCreateOffer}
              disabled={createOffer.isPending}
            >
              {createOffer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Kirim Penawaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Dialog */}
      <AlertDialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terima Penawaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menerima penawaran ini. Penawaran lain akan ditolak otomatis dan material akan berubah status menjadi "Dalam Proses".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptOffer}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Terima
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Penawaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Penawaran ini akan ditolak dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Alasan Penolakan (Opsional)</Label>
            <Textarea
              placeholder="Masukkan alasan penolakan..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectOffer}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mulai Pengiriman</DialogTitle>
            <DialogDescription>
              Konfirmasi bahwa Anda sudah memulai pengiriman material ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Catatan Pengiriman (Opsional)</Label>
              <Textarea
                placeholder="Contoh: Dikirim via ekspedisi JNE, resi 123456..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Batal
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleStartDelivery}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Konfirmasi Pengiriman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delivery Dialog */}
      <AlertDialog open={showConfirmDeliveryDialog} onOpenChange={setShowConfirmDeliveryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penerimaan Material?</AlertDialogTitle>
            <AlertDialogDescription>
              Dengan mengkonfirmasi, Anda menyatakan bahwa material sudah diterima dalam kondisi baik.
              Status material akan berubah menjadi "Selesai".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelivery}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Material Diterima
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
