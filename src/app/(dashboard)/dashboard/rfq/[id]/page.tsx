'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Loader2,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  FileText,
  ChevronDown,
  MessageSquare,
  Send,
  Building2,
  Hash,
  UserPlus,
  Star,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RFQItemPrice {
  id: string;
  unitPrice: number;
  totalPrice: number;
  vendorNotes: string | null;
  item: {
    id: string;
    itemName: string;
    description: string | null;
    quantity: number;
    unit: string;
  };
}

interface RFQSubmissionExtraItem {
  id: string;
  itemName: string;
  spesifikasi: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  vendorNotes: string | null;
  sortOrder: number;
}

interface RFQSubmission {
  id: string;
  status: string;
  notes: string | null;
  totalOffer: number | null;
  submittedAt: string | null;
  originalTotalOffer?: number | null;
  negotiationRequestedTotal?: number | null;
  negotiationMessage?: string | null;
  negotiationStatus?: string | null;
  negotiationDiscountAmount?: number | null;
  vendorCounterTotal?: number | null;
  vendorCounterMessage?: string | null;
  vendor: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    rating: number;
    totalProjects?: number;
    isVerified?: boolean;
  };
  prices: RFQItemPrice[];
  extraItems?: RFQSubmissionExtraItem[];
}

interface RFQItem {
  id: string;
  itemName: string;
  description: string | null;
  quantity: number;
  unit: string;
  prices: { submission: RFQSubmission; unitPrice: number; totalPrice: number }[];
}

interface RFQ {
  id: string;
  title: string;
  description: string | null;
  status: string;
  notes: string | null;
  deadline: string | null;
  createdAt: string;
  project: {
    id: string;
    title: string;
    description: string;
    address?: string | null;
    budget: number | null;
    startDate: string | null;
    endDate: string | null;
    offerDeadline?: string | null;
    clientId?: string;
    categoryId?: string | null;
    client: { id: string; name: string; email: string; phone: string | null; avatar: string | null };
    city?: { id: string; name: string; province?: { name: string } } | null;
  };
  items: RFQItem[];
  submissions: RFQSubmission[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Tersedia',
  CLOSED: 'Ditutup',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
};

const negoStatusLabels: Record<string, string> = {
  PENDING: 'Menunggu respons vendor',
  ACCEPTED: 'Disetujui',
  REJECTED: 'Ditolak vendor',
  COUNTERED: 'Vendor mengajukan counter',
};

export default function RFQDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [rfq, setRFQ] = useState<RFQ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('items');
  const [openOfferId, setOpenOfferId] = useState<string | null>(null);
  const [openNegoId, setOpenNegoId] = useState<string | null>(null);
  const [negoRequestedTotal, setNegoRequestedTotal] = useState('');
  const [negoMessage, setNegoMessage] = useState('');
  const [submittingNego, setSubmittingNego] = useState(false);
  const [openRespondId, setOpenRespondId] = useState<string | null>(null);
  const [respondAction, setRespondAction] = useState<'ACCEPT' | 'REJECT' | 'COUNTER'>('ACCEPT');
  const [counterTotal, setCounterTotal] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submittingRespond, setSubmittingRespond] = useState(false);
  const [inviteVendors, setInviteVendors] = useState<Array<{ id: string; name: string; avatar: string | null; rating: number; totalProjects: number; description?: string | null }>>([]);
  const [inviteVendorsLoading, setInviteVendorsLoading] = useState(false);
  const [invitingVendorId, setInvitingVendorId] = useState<string | null>(null);

  useEffect(() => {
    fetchRFQ();
  }, [id]);

  const fetchInviteVendors = useCallback(async () => {
    if (!rfq?.project?.id) return;
    setInviteVendorsLoading(true);
    try {
      const categoryId = rfq.project.categoryId;
      const params = new URLSearchParams();
      if (categoryId) params.set('categoryIds', categoryId);
      params.set('limit', '50');
      const res = await fetch(`/api/directory/vendors?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setInviteVendors(data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat daftar vendor');
    } finally {
      setInviteVendorsLoading(false);
    }
  }, [rfq?.project?.id, rfq?.project?.categoryId]);

  useEffect(() => {
    if (activeTab === 'invite-vendor' && rfq?.project?.id) {
      fetchInviteVendors();
    }
  }, [activeTab, rfq?.project?.id, fetchInviteVendors]);

  const fetchRFQ = async () => {
    try {
      const response = await fetch(`/api/rfq/${id}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setRFQ(result.data);
        const mySubmission = result.data.submissions?.find((s: RFQSubmission) => s.vendor.id === user?.id);
        if (mySubmission?.prices) {
          const initialPrices: Record<string, number> = {};
          mySubmission.prices.forEach((p: RFQItemPrice) => {
            initialPrices[p.item.id] = p.unitPrice;
          });
          setPrices(initialPrices);
          setNotes(mySubmission.notes || '');
        }
      } else {
        toast.error(result.error || 'Gagal memuat data RFQ');
        router.push('/dashboard/projects');
      }
    } catch (error) {
      console.error('Error fetching RFQ:', error);
      toast.error('Gagal memuat data RFQ');
      router.push('/dashboard/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChange = (itemId: string, value: string) => {
    setPrices((prev) => ({ ...prev, [itemId]: parseFloat(value) || 0 }));
  };

  const calculateItemTotal = (itemId: string, quantity: number) => (prices[itemId] || 0) * quantity;
  const calculateTotal = () =>
    rfq ? rfq.items.reduce((sum, item) => sum + calculateItemTotal(item.id, item.quantity), 0) : 0;

  const handleSubmitOffer = async () => {
    if (!rfq) return;
    const missingPrices = rfq.items.filter((item) => !prices[item.id] || prices[item.id] <= 0);
    if (missingPrices.length > 0) {
      toast.error('Harap isi semua harga item');
      return;
    }
    setIsSaving(true);
    try {
      const itemPrices = rfq.items.map((item) => ({ itemId: item.id, unitPrice: prices[item.id] }));
      const response = await fetch('/api/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rfqId: rfq.id, itemPrices, notes: notes || undefined }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Penawaran berhasil dikirim!');
        fetchRFQ();
      } else toast.error(result.error || 'Gagal mengirim penawaran');
    } catch (error) {
      toast.error('Gagal mengirim penawaran');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (action: string, submissionId?: string) => {
    if (!rfq) return;
    if (action === 'accept' && !submissionId) {
      toast.error('Pilih penawaran yang akan diterima');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/rfq/${rfq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, submissionId: submissionId || selectedSubmissionId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchRFQ();
      } else toast.error(result.error || 'Gagal memproses aksi');
    } catch (error) {
      toast.error('Gagal memproses aksi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendNego = async (submissionId: string) => {
    const req = parseFloat(negoRequestedTotal.replace(/\D/g, ''));
    if (!Number.isFinite(req) || req <= 0) {
      toast.error('Masukkan harga negosiasi yang valid');
      return;
    }
    setSubmittingNego(true);
    try {
      const res = await fetch(`/api/rfq/${id}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ submissionId, requestedTotal: req, message: negoMessage.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setOpenNegoId(null);
        setNegoRequestedTotal('');
        setNegoMessage('');
        fetchRFQ();
      } else toast.error(data.error || 'Gagal mengirim negosiasi');
    } catch (e) {
      toast.error('Gagal mengirim negosiasi');
    } finally {
      setSubmittingNego(false);
    }
  };

  const handleRespondNego = async (submissionId: string) => {
    if (respondAction === 'COUNTER') {
      const c = parseFloat(counterTotal.replace(/\D/g, ''));
      if (!Number.isFinite(c) || c <= 0) {
        toast.error('Masukkan nilai counter yang valid');
        return;
      }
    }
    setSubmittingRespond(true);
    try {
      const body: { submissionId: string; action: string; counterTotal?: number; counterMessage?: string } = {
        submissionId,
        action: respondAction,
      };
      if (respondAction === 'COUNTER') {
        body.counterTotal = parseFloat(counterTotal.replace(/\D/g, ''));
        body.counterMessage = counterMessage.trim() || undefined;
      }
      const res = await fetch(`/api/rfq/${id}/negotiate/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setOpenRespondId(null);
        setCounterTotal('');
        setCounterMessage('');
        fetchRFQ();
      } else toast.error(data.error || 'Gagal mengirim respons');
    } catch (e) {
      toast.error('Gagal mengirim respons');
    } finally {
      setSubmittingRespond(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  if (!rfq) return null;

  const isVendor = user?.role === 'VENDOR';
  const isClient = user?.role === 'CLIENT' || user?.role === 'ADMIN';
  const canSubmitOffer = isVendor && (rfq.status === 'PUBLISHED' || rfq.status === 'CLOSED');
  const canPublish = isClient && rfq.status === 'DRAFT';
  const canClose = isClient && rfq.status === 'PUBLISHED';
  const canAcceptOrNego = isClient && (rfq.status === 'PUBLISHED' || rfq.status === 'CLOSED');

  const mySubmission = rfq.submissions?.find((s) => s.vendor.id === user?.id);
  const submittedSubmissions = rfq.submissions?.filter((s) => s.status === 'SUBMITTED') || [];
  const sortedSubmissions = [...submittedSubmissions].sort((a, b) => (a.totalOffer || 0) - (b.totalOffer || 0));

  const stats = {
    total: sortedSubmissions.length,
    lowest: sortedSubmissions.length ? Math.min(...sortedSubmissions.map((s) => s.totalOffer || 0)) : 0,
    highest: sortedSubmissions.length ? Math.max(...sortedSubmissions.map((s) => s.totalOffer || 0)) : 0,
    avg:
      sortedSubmissions.length
        ? sortedSubmissions.reduce((s, x) => s + (x.totalOffer || 0), 0) / sortedSubmissions.length
        : 0,
  };

  const proj = rfq.project;
  const city = proj && proj.city ? proj.city : null;
  const locationStr =
    (proj && proj.address && proj.address.trim()) ||
    (city && city.name) ||
    (city && city.province && city.province.name) ||
    '-';
  const deadlineStr = rfq.project.offerDeadline
    ? new Date(rfq.project.offerDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : rfq.deadline
      ? new Date(rfq.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : '-';

  return (
    <div className="space-y-6">
      {/* Aurora-style header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50/90 via-slate-50/90 to-amber-50/90 border border-slate-100 px-6 py-8">
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <h1 className="text-xl md:text-2xl font-bold text-[#1e5a8c] mb-1">Penawaran RFQ Masuk</h1>
          <p className="text-sm text-slate-600">Review dan bandingkan penawaran dari vendor</p>
        </div>
      </div>

      {/* Back + Project info bar */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(rfq.project?.id ? `/dashboard/projects/${rfq.project.id}` : '/dashboard/projects')}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke detail proyek
        </Button>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#fd904c] flex items-center justify-center text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{rfq.project.title}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  {rfq.project.id.slice(-8)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationStr}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Batas: {deadlineStr}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1e5a8c]/10 rounded-xl">
            <Users className="h-5 w-5 text-[#1e5a8c]" />
            <span className="text-sm font-semibold text-[#1e5a8c]">
              {sortedSubmissions.length} Penawaran Masuk
            </span>
          </div>
        </div>
      </div>

      {/* Stats row (only when there are submissions) */}
      {sortedSubmissions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total Penawaran', value: String(stats.total) },
            { label: 'Penawaran Terendah', value: formatCurrency(stats.lowest) },
            { label: 'Penawaran Tertinggi', value: formatCurrency(stats.highest) },
            { label: 'Rata-rata', value: formatCurrency(stats.avg) },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-xl font-bold text-[#1e5a8c]">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items" className="gap-2">
            <FileText className="h-4 w-4" />
            Item Pekerjaan
          </TabsTrigger>
          {isClient && (
            <>
              <TabsTrigger value="submissions" className="gap-2">
                <Users className="h-4 w-4" />
                Daftar Penawaran ({submittedSubmissions.length})
              </TabsTrigger>
              <TabsTrigger value="invite-vendor" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Undang Vendor
              </TabsTrigger>
            </>
          )}
          {isVendor && mySubmission && (
            <TabsTrigger value="my-offer" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Penawaran Saya
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="items" className="space-y-4 mt-4">
          <Card className="border border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle>Item Pekerjaan</CardTitle>
              <CardDescription>
                {canSubmitOffer && !mySubmission
                  ? 'Isi harga per satuan untuk setiap item pekerjaan'
                  : 'Daftar item pekerjaan dalam RFQ ini'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama Item</TableHead>
                      <TableHead className="text-center">Jumlah</TableHead>
                      <TableHead className="text-center">Satuan</TableHead>
                      {canSubmitOffer && !mySubmission && (
                        <>
                          <TableHead className="text-right">Harga/Satuan</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfq.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.unit}</TableCell>
                        {canSubmitOffer && !mySubmission && (
                          <>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                placeholder="0"
                                value={prices[item.id] ?? ''}
                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                className="w-32 ml-auto text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency((prices[item.id] || 0) * item.quantity)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {canSubmitOffer && !mySubmission && (
                <>
                  <div className="mt-4 space-y-2">
                    <Label>Catatan (Opsional)</Label>
                    <Textarea
                      placeholder="Tambahkan catatan untuk penawaran Anda..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Penawaran</p>
                      <p className="text-2xl font-bold text-[#fd904c]">{formatCurrency(calculateTotal())}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSubmitOffer}
                    disabled={isSaving}
                    className="bg-[#fd904c] hover:bg-[#fd904c]/90"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Kirim Penawaran
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#fd904c]" />
            Daftar Penawaran
          </h2>

          {sortedSubmissions.length === 0 ? (
            <Card className="border border-slate-100">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada penawaran masuk</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedSubmissions.map((sub) => {
                const isOpen = openOfferId === sub.id;
                const originalTotal = sub.originalTotalOffer ?? sub.totalOffer ?? 0;
                const displayTotal = sub.totalOffer ?? 0;
                const subtotalFromRows =
                  (sub.prices?.reduce((s, p) => s + (p.totalPrice || 0), 0) || 0) +
                  (sub.extraItems?.reduce((s, e) => s + (e.totalPrice || 0), 0) || 0);

                return (
                  <Card key={sub.id} className={cn('border border-slate-100 shadow-sm overflow-hidden', isOpen && 'ring-2 ring-[#fd904c]/30')}>
                    <div
                      className="flex flex-wrap items-center justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      onClick={() => setOpenOfferId(isOpen ? null : sub.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white font-bold shrink-0">
                          {sub.vendor.avatar ? (
                            <img src={sub.vendor.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            sub.vendor.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800">{sub.vendor.name}</span>
                            {sub.vendor.isVerified && (
                              <Badge className="bg-green-100 text-green-800 text-[10px]">Terverifikasi</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1 text-amber-600">⭐ {sub.vendor.rating?.toFixed(1) || '0'}</span>
                            <span>{sub.vendor.totalProjects ?? 0} proyek</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-[#fd904c]">{formatCurrency(displayTotal)}</div>
                        {sub.negotiationStatus && sub.negotiationStatus !== 'NONE' && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {negoStatusLabels[sub.negotiationStatus] || sub.negotiationStatus}
                          </div>
                        )}
                      </div>
                      <div className={cn('w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 transition-transform', isOpen && 'bg-[#fd904c]/10 text-[#fd904c] rotate-180')}>
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>No</TableHead>
                                <TableHead>Item Pekerjaan</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-center">Satuan</TableHead>
                                <TableHead className="text-left">Spesifikasi Material</TableHead>
                                <TableHead className="text-left">Catatan Tambahan</TableHead>
                                <TableHead className="text-right">Harga/Unit</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sub.prices?.map((price, idx) => (
                                <TableRow key={price.id}>
                                  <TableCell>{idx + 1}</TableCell>
                                  <TableCell className="font-medium">{price.item.itemName}</TableCell>
                                  <TableCell className="text-center">{price.item.quantity}</TableCell>
                                  <TableCell className="text-center">{price.item.unit}</TableCell>
                                  <TableCell className="text-xs text-slate-600 max-w-[200px]">
                                    {price.item.description || '-'}
                                  </TableCell>
                                  <TableCell className="text-xs text-[#1e5a8c] max-w-[180px]">
                                    {price.vendorNotes || '-'}
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(price.unitPrice)}</TableCell>
                                  <TableCell className="text-right font-semibold">{formatCurrency(price.totalPrice || 0)}</TableCell>
                                </TableRow>
                              ))}
                              {sub.extraItems?.map((ex, idx) => (
                                <TableRow key={ex.id} className="bg-amber-50/70">
                                  <TableCell>{(sub.prices?.length ?? 0) + idx + 1}</TableCell>
                                  <TableCell className="font-medium">{ex.itemName}</TableCell>
                                  <TableCell className="text-center">{ex.quantity}</TableCell>
                                  <TableCell className="text-center">{ex.unit}</TableCell>
                                  <TableCell className="text-xs text-slate-600">{ex.spesifikasi || '-'}</TableCell>
                                  <TableCell className="text-xs">{ex.vendorNotes || '-'}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(ex.unitPrice)}</TableCell>
                                  <TableCell className="text-right font-semibold">{formatCurrency(ex.totalPrice || 0)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <tfoot>
                              <TableRow className="bg-[#fd904c]/10 font-bold text-[#fd904c]">
                                <TableCell colSpan={7} className="text-right">Total Penawaran</TableCell>
                                <TableCell className="text-right">{formatCurrency(subtotalFromRows)}</TableCell>
                              </TableRow>
                            </tfoot>
                          </Table>
                        </div>

                        <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-orange-50/80 to-slate-50/80 border border-slate-100">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Subtotal</span>
                              <span className="font-semibold">{formatCurrency(subtotalFromRows)}</span>
                            </div>
                            {sub.negotiationDiscountAmount != null && sub.negotiationDiscountAmount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Potongan negosiasi</span>
                                <span className="font-semibold">- {formatCurrency(sub.negotiationDiscountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t-2 border-dashed border-slate-200 mt-2">
                              <span className="font-bold text-slate-800">Total Nilai Penawaran</span>
                              <span className="text-lg font-bold text-[#fd904c]">{formatCurrency(displayTotal)}</span>
                            </div>
                          </div>
                        </div>

                        {sub.notes && (
                          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm"><strong>Catatan Vendor:</strong> {sub.notes}</p>
                          </div>
                        )}

                        {/* Client only: Nego + Terima */}
                        {canAcceptOrNego && (
                          <div className="flex flex-wrap gap-3 mt-4">
                            {sub.negotiationRequestedTotal == null && sub.negotiationStatus !== 'PENDING' && (
                              <Button
                                size="sm"
                                className="bg-[#fd904c] hover:bg-[#fd904c]/90"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenNegoId(openNegoId === sub.id ? null : sub.id);
                                  setNegoRequestedTotal('');
                                  setNegoMessage('');
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Nego / Hubungi Vendor
                              </Button>
                            )}
                            {sub.negotiationStatus === 'PENDING' && (
                              <Badge variant="secondary">Menunggu respons vendor</Badge>
                            )}
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction('accept', sub.id);
                              }}
                              disabled={isSaving}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Terima Penawaran
                            </Button>
                          </div>
                        )}

                        {/* Client: negotiation form */}
                        {canAcceptOrNego && openNegoId === sub.id && sub.negotiationRequestedTotal == null && (
                          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-orange-50/80 to-slate-50/80 border border-slate-200">
                            <div className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-[#fd904c]" />
                              Form Negosiasi Harga
                            </div>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs">Harga Penawaran Awal</Label>
                                  <Input value={formatCurrency(originalTotal)} disabled className="bg-slate-50 mt-1" />
                                </div>
                                <div>
                                  <Label className="text-xs">Harga Negosiasi yang Diinginkan (angka saja)</Label>
                                  <Input
                                    placeholder="Contoh: 26000000"
                                    value={negoRequestedTotal}
                                    onChange={(e) => setNegoRequestedTotal(e.target.value.replace(/\D/g, ''))}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs">Pesan Negosiasi</Label>
                                <Textarea
                                  placeholder="Jelaskan alasan atau pertimbangan negosiasi harga..."
                                  value={negoMessage}
                                  onChange={(e) => setNegoMessage(e.target.value)}
                                  className="mt-1 min-h-[80px]"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-[#fd904c] hover:bg-[#fd904c]/90"
                                  onClick={() => handleSendNego(sub.id)}
                                  disabled={submittingNego}
                                >
                                  {submittingNego ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  <span className="ml-2">Kirim Negosiasi</span>
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setOpenNegoId(null)}>
                                  Batal
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invite-vendor" className="mt-4 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#fd904c]" />
            Undang Vendor
          </h2>
          <p className="text-sm text-muted-foreground">
            {rfq.project.categoryId
              ? 'Vendor yang sesuai kategori proyek akan ditampilkan di bawah. Klik untuk melihat profil atau undang ke proyek ini.'
              : 'Menampilkan vendor terverifikasi. Pilih vendor dan undang untuk mengirim penawaran.'}
          </p>
          {inviteVendorsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
            </div>
          ) : inviteVendors.length === 0 ? (
            <Card className="border border-slate-100">
              <CardContent className="py-12 text-center">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {rfq.project.categoryId
                    ? 'Tidak ada vendor yang sesuai kategori proyek.'
                    : 'Belum ada vendor terverifikasi.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inviteVendors
                .filter((v) => !rfq.submissions?.some((s) => s.vendor.id === v.id))
                .map((vendor) => (
                  <Card key={vendor.id} className="border border-slate-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <Link
                          href={`/directory/vendors/${vendor.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-12 w-12 shrink-0">
                            <AvatarImage src={vendor.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                              {vendor.name?.slice(0, 2).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">{vendor.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1 text-amber-600">
                                <Star className="h-3.5 w-3.5 fill-amber-400" />
                                {vendor.rating?.toFixed(1) || '0'}
                              </span>
                              <span>{vendor.totalProjects ?? 0} proyek</span>
                            </div>
                          </div>
                          <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                        </Link>
                        <Button
                          size="sm"
                          className="bg-[#fd904c] hover:bg-[#fd904c]/90 shrink-0"
                          disabled={invitingVendorId === vendor.id}
                          onClick={async () => {
                            setInvitingVendorId(vendor.id);
                            try {
                              const res = await fetch(`/api/projects/${rfq.project.id}/invite-vendor`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ vendorId: vendor.id }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                toast.success(`Undangan berhasil dikirim ke ${vendor.name}`);
                              } else {
                                toast.error(data.error || 'Gagal mengirim undangan');
                              }
                            } catch {
                              toast.error('Gagal mengirim undangan');
                            } finally {
                              setInvitingVendorId(null);
                            }
                          }}
                        >
                          {invitingVendorId === vendor.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          Undang ke proyek ini
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-offer" className="mt-4">
          {mySubmission && (
            <>
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle>Penawaran Saya</CardTitle>
                  <CardDescription>
                    Status: <Badge>{mySubmission.status === 'SUBMITTED' ? 'Terkirim' : mySubmission.status}</Badge>
                    {mySubmission.negotiationStatus === 'PENDING' && (
                      <span className="block mt-2 text-amber-600 font-medium">Client meminta negosiasi — silakan respons.</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Harga/Satuan</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mySubmission.prices.map((price) => (
                          <TableRow key={price.id}>
                            <TableCell>{price.item.itemName}</TableCell>
                            <TableCell className="text-center">{price.item.quantity} {price.item.unit}</TableCell>
                            <TableCell className="text-right">{formatCurrency(price.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(price.totalPrice || 0)}</TableCell>
                          </TableRow>
                        ))}
                        {mySubmission.extraItems?.map((ex) => (
                          <TableRow key={ex.id} className="bg-amber-50/70">
                            <TableCell>{ex.itemName}</TableCell>
                            <TableCell className="text-center">{ex.quantity} {ex.unit}</TableCell>
                            <TableCell className="text-right">{formatCurrency(ex.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(ex.totalPrice || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Penawaran</p>
                      <p className="text-2xl font-bold text-[#fd904c]">{formatCurrency(mySubmission.totalOffer || 0)}</p>
                    </div>
                  </div>
                  {mySubmission.notes && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm"><strong>Catatan:</strong> {mySubmission.notes}</p>
                    </div>
                  )}

                  {/* Vendor: respond to negotiation (only when PENDING) */}
                  {mySubmission.negotiationStatus === 'PENDING' && (
                    <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                      <div className="font-semibold text-slate-800 mb-2">Client meminta negosiasi</div>
                      <p className="text-sm text-slate-600 mb-2">
                        Harga yang diminta: <strong className="text-[#fd904c]">{formatCurrency(mySubmission.negotiationRequestedTotal || 0)}</strong>
                      </p>
                      {mySubmission.negotiationMessage && (
                        <p className="text-sm text-slate-600 mb-4">Pesan: {mySubmission.negotiationMessage}</p>
                      )}
                      {openRespondId !== mySubmission.id ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setOpenRespondId(mySubmission.id); setRespondAction('ACCEPT'); }}>
                            Setuju
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setOpenRespondId(mySubmission.id); setRespondAction('REJECT'); }}>
                            Tolak
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setOpenRespondId(mySubmission.id); setRespondAction('COUNTER'); setCounterTotal(''); setCounterMessage(''); }}>
                            Counter (naikkan harga, max {formatCurrency(mySubmission.originalTotalOffer ?? mySubmission.totalOffer ?? 0)})
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-2">
                          {respondAction === 'COUNTER' && (
                            <>
                              <div>
                                <Label className="text-xs">Harga counter (tidak melebihi total awal)</Label>
                                <Input
                                  placeholder="Angka saja"
                                  value={counterTotal}
                                  onChange={(e) => setCounterTotal(e.target.value.replace(/\D/g, ''))}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Pesan (opsional)</Label>
                                <Textarea value={counterMessage} onChange={(e) => setCounterMessage(e.target.value)} className="mt-1" rows={2} />
                              </div>
                            </>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleRespondNego(mySubmission.id)} disabled={submittingRespond}>
                              {submittingRespond ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              <span className="ml-2">{respondAction === 'ACCEPT' ? 'Setuju' : respondAction === 'REJECT' ? 'Tolak' : 'Kirim Counter'}</span>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setOpenRespondId(null)}>Batal</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Client-only actions (publish / close) */}
      {isClient && (
        <div className="flex flex-wrap gap-3">
          {canPublish && (
            <Button onClick={() => handleAction('publish')} disabled={isSaving} className="bg-[#fd904c] hover:bg-[#fd904c]/90">
              <Clock className="h-4 w-4 mr-2" />
              Publish RFQ
            </Button>
          )}
          {canClose && (
            <Button onClick={() => handleAction('close')} disabled={isSaving} variant="outline">
              Tutup Penawaran
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
