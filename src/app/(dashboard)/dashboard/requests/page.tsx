'use client';

import { useState, useMemo } from 'react';
import { useMaterials, useSupplierOffers, formatCurrency, formatDate, getMaterialStatusConfig, getOfferStatusConfig } from '@/hooks/api';
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
  Loader2,
  Search,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCreateOffer } from '@/hooks/api';

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

// Material Card Skeleton
function MaterialCardSkeleton() {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

// Make Offer Dialog
function MakeOfferDialog({
  open,
  onOpenChange,
  material,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: {
    id: string;
    title: string;
    budget: number | null;
    quantity: number;
    unit: string;
  } | null;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const createOffer = useCreateOffer(material?.id || '');

  const handleSubmit = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error('Masukkan harga penawaran yang valid');
      return;
    }

    try {
      await createOffer.mutateAsync({
        price: parseFloat(price),
        notes: notes || undefined,
      });
      toast.success('Penawaran berhasil dikirim!');
      onOpenChange(false);
      setPrice('');
      setNotes('');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim penawaran');
    }
  };

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Penawaran</DialogTitle>
          <DialogDescription>
            Kirim penawaran harga Anda untuk material ini
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Material Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="font-medium">{material.title}</p>
              <p className="text-sm text-muted-foreground">
                {material.quantity} {material.unit}
              </p>
              {material.budget && (
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Budget Klien: </span>
                  <span className="font-semibold text-[#fd904c]">{formatCurrency(material.budget)}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">Harga Penawaran (Rp) *</Label>
            <Input
              id="price"
              type="number"
              placeholder="Masukkan harga penawaran"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {material.budget && price && parseFloat(price) > material.budget && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Harga melebihi budget klien
              </p>
            )}
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
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
            disabled={createOffer.isPending}
          >
            {createOffer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Kirim Penawaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplierRequestsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id: string;
    title: string;
    budget: number | null;
    quantity: number;
    unit: string;
  } | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);

  // Fetch published materials
  const { data: materialsData, isLoading: materialsLoading, error: materialsError, refetch } = useMaterials({
    search,
    status: 'PUBLISHED',
  });

  // Fetch my offers to check which materials already have offers
  const { data: offersData } = useSupplierOffers();

  const materials = materialsData?.data || [];
  const myOffers = offersData?.data || [];

  // Create a map of material IDs that have offers
  const offeredMaterialIds = useMemo(() => {
    return new Set(myOffers.map(offer => offer.materialId));
  }, [myOffers]);

  // Filter materials by location and deadline
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      if (locationFilter && material.location) {
        if (!material.location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      }
      if (deadlineFilter && material.deadline) {
        const deadline = new Date(material.deadline);
        const today = new Date();
        const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (deadlineFilter === '7' && daysUntilDeadline > 7) return false;
        if (deadlineFilter === '14' && daysUntilDeadline > 14) return false;
        if (deadlineFilter === '30' && daysUntilDeadline > 30) return false;
        if (deadlineFilter === 'passed' && daysUntilDeadline >= 0) return false;
      }
      return true;
    });
  }, [materials, locationFilter, deadlineFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRequests = materials.length;
    const myOffersCount = myOffers.length;
    const acceptedOffers = myOffers.filter(o => o.status === 'ACCEPTED').length;
    return { totalRequests, myOffersCount, acceptedOffers };
  }, [materials, myOffers]);

  const handleMakeOffer = (material: typeof selectedMaterial) => {
    setSelectedMaterial(material);
    setShowOfferDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Permintaan Material</h1>
        <p className="text-muted-foreground">
          Temukan permintaan material dari klien dan kirimkan penawaran Anda
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Permintaan"
          value={stats.totalRequests}
          icon={Package}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatsCard
          title="Penawaran Saya"
          value={stats.myOffersCount}
          icon={TrendingUp}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        />
        <StatsCard
          title="Diterima"
          value={stats.acceptedOffers}
          icon={CheckCircle}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Filter lokasi..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full md:w-40"
            />
            <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Deadline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Deadline</SelectItem>
                <SelectItem value="7">7 Hari ke Depan</SelectItem>
                <SelectItem value="14">14 Hari ke Depan</SelectItem>
                <SelectItem value="30">30 Hari ke Depan</SelectItem>
                <SelectItem value="passed">Sudah Lewat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Materials Grid */}
      {materialsLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <MaterialCardSkeleton key={i} />
          ))}
        </div>
      ) : materialsError ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Gagal memuat data permintaan material
          </CardContent>
        </Card>
      ) : filteredMaterials.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search || locationFilter || deadlineFilter
                ? 'Tidak ada permintaan material yang sesuai filter'
                : 'Belum ada permintaan material yang tersedia'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => {
            const hasOffered = offeredMaterialIds.has(material.id);
            const myOffer = myOffers.find(o => o.materialId === material.id);
            
            return (
              <Card key={material.id} className="glass-card hover:shadow-lg transition-all h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{material.title}</CardTitle>
                    <Badge className={getMaterialStatusConfig(material.status).className}>
                      {getMaterialStatusConfig(material.status).label}
                    </Badge>
                  </div>
                  {material.description && (
                    <CardDescription className="line-clamp-2">{material.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Jumlah</span>
                    <span className="font-medium">{material.quantity} {material.unit}</span>
                  </div>
                  
                  {material.budget && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Budget</span>
                      <span className="font-semibold text-[#fd904c]">{formatCurrency(material.budget)}</span>
                    </div>
                  )}
                  
                  {material.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{material.location}</span>
                    </div>
                  )}
                  
                  {material.deadline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Deadline: {formatDate(material.deadline)}</span>
                    </div>
                  )}
                  
                  {material.client && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-xs">
                        {material.client.name.charAt(0)}
                      </div>
                      <span className="text-sm text-muted-foreground truncate">{material.client.name}</span>
                      {material._count && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {material._count.offers} penawaran
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-auto pt-3">
                    {hasOffered && myOffer ? (
                      <div className="flex items-center gap-2">
                        <Badge className={getOfferStatusConfig(myOffer.status).className}>
                          {getOfferStatusConfig(myOffer.status).label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(myOffer.price)}
                        </span>
                      </div>
                    ) : (
                      <Button
                        className="w-full bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                        onClick={() => handleMakeOffer({
                          id: material.id,
                          title: material.title,
                          budget: material.budget,
                          quantity: material.quantity,
                          unit: material.unit,
                        })}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Buat Penawaran
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Make Offer Dialog */}
      <MakeOfferDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        material={selectedMaterial}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
