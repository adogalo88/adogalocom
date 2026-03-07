'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { RoleLandingHeader } from '@/components/landing/RoleLandingHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  MapPin,
  Wallet,
  Calendar,
  CalendarClock,
  FileText,
  MessageSquare,
  Send,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  Building2,
  Hash,
  Layers,
  Star,
  User,
  ChevronDown,
  Download,
  Trash2,
  Plus,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

function maskClientName(name: string | null | undefined): string {
  if (!name || name.length === 0) return '**';
  if (name.length <= 2) return name.slice(0, 2) + '**';
  return name.slice(0, 2) + '**';
}

interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  tenderSubtype?: string;
  status: string;
  budget: number | null;
  offerDeadline: string | null;
  startDate: string | null;
  endDate: string | null;
  photos: string | null;
  files: string | null;
  city?: { id: string; name: string; province?: { id: string; name: string } } | null;
  category?: { id: string; name: string } | null;
  client?: { name?: string | null; rating?: number; totalReviews?: number; completedTenderCount?: number } | null;
  rfq?: {
    id: string;
    title: string;
    status: string;
    items: { id: string; itemName: string; description: string | null; quantity: number; unit: string; sortOrder: number }[];
    submissions?: { id: string; vendorId?: string; vendor?: { id: string }; status: string }[];
    _count?: { submissions: number };
  } | null;
  userApplication?: { id: string; status: string; offerFileUrl?: string | null } | null;
  _count?: { applications?: number; teamMembers?: number };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; role: string; avatar: string | null };
}

function parseJsonArray(str: string | null): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ProyekTenderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const id = params?.id as string | undefined;
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [rfqPrices, setRfqPrices] = useState<Record<string, number>>({});
  const [rfqVendorNotes, setRfqVendorNotes] = useState<Record<string, string>>({});
  const [rfqExtraRows, setRfqExtraRows] = useState<Array<{ id: string; itemName: string; spesifikasi: string; quantity: number; unit: string; unitPrice: number; vendorNotes: string }>>([]);
  const [rfqNotes, setRfqNotes] = useState('');
  const [offerFileUrl, setOfferFileUrl] = useState('');
  const [proposedBudget, setProposedBudget] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewCaption, setPreviewCaption] = useState('');
  const [rfqOpen, setRfqOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Pajak & diskon (default non-aktif)
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxPercent, setTaxPercent] = useState(10);
  const [taxLabel, setTaxLabel] = useState('PPn');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(0);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data?.project) {
        setProject(data.project);
        if (data.project.rfq?.items) {
          const initial: Record<string, number> = {};
          data.project.rfq.items.forEach((item: { id: string }) => {
            initial[item.id] = 0;
          });
          setRfqPrices(initial);
        }
      } else {
        router.replace('/proyek-tender');
      }
    } catch {
      router.replace('/proyek-tender');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}/comments`, { credentials: 'include' });
      const data = await res.json();
      if (data?.data) setComments(data.data);
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      router.replace('/dashboard');
      return;
    }
    fetchProject();
    fetchComments();
  }, [user, authLoading, router, fetchProject, fetchComments]);

  // Scroll diskusi ke bawah saat ada komentar baru
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/projects/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        setComments((prev) => [...prev, data.data]);
        setCommentText('');
        toast.success('Komentar terkirim');
        setTimeout(() => {
          chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
      } else {
        toast.error(data?.error || 'Gagal mengirim komentar');
      }
    } catch {
      toast.error('Gagal mengirim komentar');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id || user?.role !== 'ADMIN') return;
    if (!confirm('Hapus komentar ini? (untuk pesan tidak pantas/spam)')) return;
    try {
      const res = await fetch(`/api/projects/${id}/comments/${commentId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (res.ok && data?.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success('Komentar telah dihapus');
      } else {
        toast.error(data?.error || 'Gagal menghapus komentar');
      }
    } catch {
      toast.error('Gagal menghapus komentar');
    }
  };

  const handleUploadOfferFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const form = new FormData();
      form.append('files', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const data = await res.json();
      const url = data?.data?.urls?.[0] ?? data?.data?.files?.[0] ?? data?.urls?.[0];
      if (url) {
        setOfferFileUrl(url);
        toast.success('File terunggah');
      } else {
        toast.error('Gagal mengunggah file');
      }
    } catch {
      toast.error('Gagal mengunggah file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitOffer = async () => {
    if (!project?.id) return;
    const isExpired = project.status === 'EXPIRED';
    if (isExpired) {
      toast.error('Batas akhir penawaran telah lewat');
      return;
    }
    if (project.userApplication) {
      toast.info('Anda sudah mengajukan penawaran');
      setOfferDialogOpen(false);
      return;
    }

    setOfferSubmitting(true);
    try {
      if (project.rfq?.items?.length) {
        const itemPrices = project.rfq.items.map((item) => ({
          itemId: item.id,
          unitPrice: rfqPrices[item.id] ?? 0,
          vendorNotes: (rfqVendorNotes[item.id] ?? '').trim() || undefined,
        }));
        const extraItemsPayload = rfqExtraRows.map((r) => ({
          itemName: (r.itemName || '').trim() || 'Item',
          spesifikasi: (r.spesifikasi || '').trim() || undefined,
          quantity: Number(r.quantity) || 0,
          unit: (r.unit || 'pcs').trim(),
          unitPrice: Number(r.unitPrice) || 0,
          vendorNotes: (r.vendorNotes || '').trim() || undefined,
        }));
        if (itemPrices.some((p) => !p.unitPrice || p.unitPrice <= 0)) {
          toast.error('Isi semua harga item RFQ');
          setOfferSubmitting(false);
          return;
        }
        let notes = rfqNotes ?? '';
        if ((taxEnabled || discountEnabled) && project.rfq?.items) {
          const st = project.rfq.items.reduce((s, item) => s + (rfqPrices[item.id] ?? 0) * item.quantity, 0) +
            rfqExtraRows.reduce((s, r) => s + (r.quantity || 0) * (r.unitPrice || 0), 0);
          const disc = discountEnabled
            ? discountType === 'percent'
              ? (st * Math.min(100, Math.max(0, discountValue))) / 100
              : Math.max(0, discountValue)
            : 0;
          const afterDisc = Math.max(0, st - disc);
          const tax = taxEnabled ? (afterDisc * Math.min(100, Math.max(0, taxPercent))) / 100 : 0;
          const total = afterDisc + tax;
          const parts: string[] = [];
          if (notes) parts.push(notes);
          parts.push(`Subtotal: Rp ${st.toLocaleString('id-ID')}`);
          if (discountEnabled) parts.push(`Diskon: -Rp ${disc.toLocaleString('id-ID')}`);
          if (taxEnabled) parts.push(`${taxLabel} (${taxPercent}%): Rp ${tax.toLocaleString('id-ID')}`);
          parts.push(`Total: Rp ${total.toLocaleString('id-ID')}`);
          notes = parts.join(' | ');
        }
        const res = await fetch('/api/rfq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            rfqId: project.rfq.id,
            itemPrices,
            extraItems: extraItemsPayload,
            notes: notes || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          toast.success('Penawaran RFQ berhasil dikirim');
          setOfferDialogOpen(false);
          setRfqOpen(false);
          fetchProject();
        } else {
          toast.error(data?.error || 'Gagal mengirim penawaran');
        }
      } else {
        const nominal = proposedBudget.trim() ? Number(proposedBudget.replace(/\D/g, '')) : 0;
        if (!offerFileUrl.trim()) {
          toast.error('Unggah file penawaran terlebih dahulu');
          setOfferSubmitting(false);
          return;
        }
        if (!nominal || nominal <= 0) {
          toast.error('Masukkan nominal total penawaran');
          setOfferSubmitting(false);
          return;
        }
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            projectId: project.id,
            offerFileUrl: offerFileUrl.trim(),
            proposedBudget: nominal,
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          toast.success('Penawaran berhasil dikirim');
          setOfferDialogOpen(false);
          setOfferFileUrl('');
          setProposedBudget('');
          fetchProject();
        } else {
          toast.error(data?.error || 'Gagal mengirim penawaran');
        }
      }
    } catch {
      toast.error('Gagal mengirim penawaran');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const openLightbox = (url: string, caption: string) => {
    setPreviewImage(url);
    setPreviewCaption(caption);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
        <RoleLandingHeader title="Adogalo" subtitle="Proyek Tender" />
        <div className="max-w-4xl mx-auto px-4 py-8 w-full">
          <Skeleton className="h-12 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project || (user?.role !== 'VENDOR' && user?.role !== 'ADMIN')) return null;

  const photos = parseJsonArray(project.photos);
  const files = parseJsonArray(project.files);
  const isExpired = project.status === 'EXPIRED';
  const offerCount = project.rfq
    ? (project.rfq._count?.submissions ?? project.rfq.submissions?.length ?? 0)
    : (project._count?.applications ?? (project as { applications?: unknown[] }).applications?.length ?? 0);
  const hasVendorSubmittedRfq =
    user?.role === 'VENDOR' &&
    project.rfq?.submissions?.some(
      (s: { vendorId?: string; vendor?: { id: string } }) =>
        s.vendorId === user?.id || s.vendor?.id === user?.id
    );

  // RFQ: auto hitung total per baris dan grand total (tanpa hook agar urutan hooks stabil)
  const rowTotals: Record<string, number> = {};
  let grandTotal = 0;
  if (project.rfq?.items?.length) {
    project.rfq.items.forEach((item) => {
      const price = rfqPrices[item.id] ?? 0;
      const total = item.quantity * price;
      rowTotals[item.id] = total;
      grandTotal += total;
    });
  }
  rfqExtraRows.forEach((row) => {
    grandTotal += (row.quantity || 0) * (row.unitPrice || 0);
  });

  const locationText = project.city
    ? [project.city.province?.name, project.city.name].filter(Boolean).join(', ')
    : null;
  const canOffer = project.rfq
    ? !hasVendorSubmittedRfq && !isExpired
    : !project.userApplication && !isExpired;

  // Pajak & diskon (hitung dari subtotal)
  const subtotal = grandTotal;
  const discountAmount = discountEnabled
    ? discountType === 'percent'
      ? (subtotal * Math.min(100, Math.max(0, discountValue))) / 100
      : Math.max(0, discountValue)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxEnabled ? (afterDiscount * Math.min(100, Math.max(0, taxPercent))) / 100 : 0;
  const totalWithTaxDiscount = afterDiscount + taxAmount;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100">
      <RoleLandingHeader title="Adogalo" subtitle="Proyek Tender / Kontrak" />

      {/* Aurora-style header */}
      <header className="relative overflow-hidden h-[320px] bg-gradient-to-br from-[#fff8f3] via-[#fff5f0] to-[#fff0e8] dark:from-[#2d1f18] dark:via-[#1f1510] dark:to-[#1a120d]">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 bg-[radial-gradient(ellipse_60%_40%_at_30%_30%,rgba(253,144,76,0.2)_0%,transparent_50%)] animate-pulse" />
          <div className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 bg-[radial-gradient(ellipse_50%_30%_at_70%_60%,rgba(229,120,53,0.15)_0%,transparent_50%)]" />
        </div>
        <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-[2px]" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="inline-flex items-center gap-2 bg-[#e57835]/90 text-white px-4 py-2 rounded-full text-sm font-medium mb-4 shadow-lg border border-white/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isExpired ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isExpired ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </span>
            {isExpired
              ? 'Kadaluarsa'
              : project.offerDeadline
                ? `Dibuka hingga ${new Date(project.offerDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Dibuka'}
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#c2652a] dark:text-[#fd904c] text-center mb-3 max-w-3xl">
            {project.title}
          </h1>
          <p className="text-sm md:text-base text-[#c2652a]/80 dark:text-[#fd904c]/90 text-center max-w-xl bg-white/50 dark:bg-black/20 px-6 py-3 rounded-2xl border border-[#fd904c]/20 backdrop-blur-sm">
            {project.category?.name ?? 'Proyek Tender'}
          </p>
          <p className="text-sm font-medium text-[#c2652a]/90 dark:text-[#fd904c]/90 mt-2">
            {offerCount} penawaran masuk
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto block">
            <path d="M0 80L48 70C96 60 192 40 288 35C384 30 480 40 576 50C672 60 768 70 864 65C960 60 1056 40 1152 35C1248 30 1344 40 1392 45L1440 50V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0Z" fill="var(--background)" />
          </svg>
        </div>
      </header>

      <main className="w-full max-w-[100%] px-4 sm:px-6 lg:px-10 xl:px-12 -mt-5 relative z-20 pb-12">
        {/* Top bar: Kembali (kiri) + Pemilik Proyek (kanan, menonjol) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            href="/proyek-tender"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#fd904c] text-white hover:bg-[#e57835] shadow-lg shadow-[#fd904c]/30 border border-[#e57835]/50 transition-all hover:shadow-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar proyek
          </Link>
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-[#fd904c]/20 shadow-xl shadow-[#fd904c]/10 backdrop-blur-md">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-[#fd904c]/20">
              {maskClientName(project.client?.name)?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pemilik Proyek</p>
              <p className="text-lg font-bold text-[#c2652a] dark:text-[#fd904c]">{maskClientName(project.client?.name)}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-amber-500">
                  <Star className="w-5 h-5 fill-amber-500" />
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {project.client?.rating != null ? Number(project.client.rating).toFixed(1) : '0.0'}
                  </span>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">·</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {project.client?.completedTenderCount ?? 0} proyek selesai
                </span>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
            <TabsTrigger value="info" className="flex-1 min-w-[140px] data-[state=active]:bg-[#fd904c] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg py-2.5">
              <FileText className="w-4 h-4 mr-2 shrink-0" />
              Informasi Proyek
            </TabsTrigger>
            <TabsTrigger value="diskusi" className="flex-1 min-w-[120px] data-[state=active]:bg-[#fd904c] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg py-2.5">
              <MessageSquare className="w-4 h-4 mr-2 shrink-0" />
              Diskusi
            </TabsTrigger>
            <TabsTrigger value="penawaran" className="flex-1 min-w-[140px] data-[state=active]:bg-[#fd904c] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg py-2.5">
              <Send className="w-4 h-4 mr-2 shrink-0" />
              Buat Penawaran
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-0 space-y-8">
        {/* Card: Informasi Proyek */}
        <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 mb-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#fd904c] text-white shadow-lg shadow-[#fd904c]/30">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#c2652a] dark:text-[#fd904c]">Informasi Proyek</h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Deskripsi */}
            <div className="flex-[2] min-w-0">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#fd904c]" />
                Deskripsi Proyek
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-5 text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line min-h-[120px]">
                {project.description || 'Tidak ada deskripsi.'}
              </div>
            </div>

            {/* Detail Proyek */}
            <div className="flex-1 lg:max-w-[380px]">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#fd904c]" />
                Detail Proyek
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">ID Proyek</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{project.id.slice(-8)}</p>
                  </div>
                </div>
                {project.category && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Kategori</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{project.category.name}</p>
                    </div>
                  </div>
                )}
                {locationText && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Lokasi</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{locationText}</p>
                    </div>
                  </div>
                )}
                {project.budget != null && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#fd904c]/10 dark:bg-[#fd904c]/10 border border-[#fd904c]/20">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#fd904c]/20 text-[#e57835]">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Budget Estimasi</p>
                      <p className="text-sm font-semibold text-[#e57835] dark:text-[#fd904c]">Rp {project.budget.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                )}
                {project.offerDeadline && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#fd904c]/10 dark:bg-[#fd904c]/10 border border-[#fd904c]/20">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#fd904c]/20 text-[#e57835]">
                      <CalendarClock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Batas Penawaran</p>
                      <p className="text-sm font-semibold text-[#e57835] dark:text-[#fd904c]">
                        {new Date(project.offerDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                {project.startDate && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Target Mulai</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Card: Galeri Foto */}
        {photos.length > 0 && (
          <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 mb-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#fd904c] text-white shadow-lg shadow-[#fd904c]/30">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#c2652a] dark:text-[#fd904c]">Galeri Foto Preferensi & Ruangan</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md hover:scale-[1.02] hover:shadow-xl transition-all duration-300 group"
                  onClick={() => openLightbox(url, `Foto ${i + 1}`)}
                >
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#c2652a]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-white text-sm font-medium truncate w-full">Foto {i + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Card: Lampiran Dokumen */}
        {files.length > 0 && (
          <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 mb-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#fd904c] text-white shadow-lg shadow-[#fd904c]/30">
                <Paperclip className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#c2652a] dark:text-[#fd904c]">Lampiran Dokumen</h2>
            </div>
            <div className="space-y-3">
              {files.map((url, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-[#fd904c]/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#fd904c]/10 text-[#e57835]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">Dokumen {i + 1}</p>
                      <p className="text-sm text-gray-500">Lampiran proyek</p>
                    </div>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#e57835] hover:bg-[#fd904c]/10 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Unduh
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
          </TabsContent>

          <TabsContent value="diskusi" className="mt-0">
        {/* Card: Diskusi Proyek */}
        <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 md:p-8 mb-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#e57835] text-white shadow-lg shadow-[#e57835]/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#c2652a] dark:text-[#fd904c]">Diskusi Proyek</h2>
          </div>

          <div
            ref={chatContainerRef}
            className="h-[320px] overflow-y-auto pr-2 mb-4 space-y-4"
          >
            {comments.map((c) => {
              const isVendor = c.user.role === 'VENDOR';
              const isAdminRole = c.user.role === 'ADMIN';
              return (
                <div key={c.id} className={`flex gap-3 ${isVendor || isAdminRole ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white/30 shadow-md ${isAdminRole ? 'bg-slate-600' : isVendor ? 'bg-[#e57835]' : 'bg-[#fd904c]'}`}>
                    {c.user.name?.charAt(0) ?? '?'}
                  </div>
                  <div className={`max-w-[75%] ${isVendor || isAdminRole ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isVendor || isAdminRole ? 'justify-end' : ''}`}>
                      <span className={`text-sm font-medium ${isAdminRole ? 'text-slate-600' : isVendor ? 'text-[#e57835]' : 'text-[#fd904c]'}`}>{c.user.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {user?.role === 'ADMIN' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteComment(c.id)}
                          title="Hapus komentar (spam/tidak pantas)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div
                      className={`inline-block px-4 py-3 rounded-2xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${
                        isAdminRole
                          ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tr-md'
                          : isVendor
                            ? 'bg-[#fd904c]/10 dark:bg-[#fd904c]/10 border border-[#fd904c]/20 rounded-tr-md'
                            : 'bg-[#fd904c]/10 dark:bg-[#fd904c]/10 border border-[#fd904c]/20 rounded-tl-md'
                      }`}
                    >
                      {c.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {(user.role === 'VENDOR' || user.role === 'CLIENT' || user.role === 'ADMIN') && (
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Textarea
                placeholder="Tulis pesan Anda... (Enter untuk kirim)"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                className="min-h-[50px] max-h-[100px] resize-none rounded-xl border-gray-200 dark:border-gray-700 focus:border-[#fd904c] focus:ring-[#fd904c]/20"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={submittingComment || !commentText.trim()}
                className="self-end h-12 px-5 bg-[#fd904c] hover:bg-[#e57835] text-white rounded-xl shadow-lg shadow-[#fd904c]/30"
              >
                {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </section>
          </TabsContent>

          <TabsContent value="penawaran" className="mt-0">
        {/* Card: Buat Penawaran (collapsible) atau cap stempel jika vendor sudah submit */}
        <section className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden mb-8 shadow-sm">
          {hasVendorSubmittedRfq ? (
            <div className="p-8 md:p-10 flex flex-col items-center justify-center text-center border-2 border-red-300 dark:border-red-600 rounded-2xl bg-red-50/80 dark:bg-red-950/30">
              <div className="inline-block px-6 py-4 rounded-xl border-2 border-red-400 dark:border-red-500 bg-white dark:bg-gray-900 shadow-lg">
                <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                  Anda sudah berhasil membuat penawaran, mohon menunggu kabar baik dari client.
                </p>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => canOffer && setRfqOpen((o) => !o)}
                className="w-full flex items-center justify-between p-6 md:p-8 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#fd904c] text-white shadow-lg shadow-[#fd904c]/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#c2652a] dark:text-[#fd904c]">Buat Penawaran</h2>
                    <p className="text-sm text-gray-500">
                      {project.rfq?.items?.length ? 'Isi form RFQ untuk mengajukan penawaran Anda' : 'Upload file penawaran'}
                    </p>
                  </div>
                </div>
                {canOffer && (
                  <div className={`w-10 h-10 flex items-center justify-center rounded-lg bg-[#fd904c]/10 text-[#e57835] transition-transform ${rfqOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                )}
              </button>

              {!canOffer && (
                <div className="px-6 pb-6 text-gray-500">
                  {project.userApplication ? 'Anda sudah mengajukan penawaran.' : isExpired ? 'Batas akhir penawaran telah lewat. Proyek kadaluarsa.' : null}
                </div>
              )}

          {canOffer && rfqOpen && (
            <div className="border-t border-gray-100 dark:border-gray-800 p-6 md:p-8">
              {project.rfq?.items?.length ? (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold rounded-tl-xl">No</th>
                          <th className="text-left p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold">Item Pekerjaan</th>
                          <th className="text-center p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold">Qty</th>
                          <th className="text-center p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold">Satuan</th>
                          <th className="text-left p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold">Spesifikasi Material</th>
                          <th className="text-left p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold">Catatan Tambahan</th>
                          <th className="text-right p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold">Harga/Unit (Rp)</th>
                          <th className="text-right p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold">Total (Rp)</th>
                          <th className="text-center p-3 bg-[#fd904c]/10 text-[#e57835] font-semibold rounded-tr-xl w-14">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.rfq.items.map((item, idx) => (
                          <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <td className="p-3 text-gray-500">{idx + 1}</td>
                            <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{item.itemName}</td>
                            <td className="p-3 text-center text-gray-600">{item.quantity}</td>
                            <td className="p-3 text-center text-gray-600">{item.unit}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">{item.description || '–'}</td>
                            <td className="p-3">
                              <Input
                                placeholder="Diisi oleh vendor"
                                value={rfqVendorNotes[item.id] ?? ''}
                                onChange={(e) => setRfqVendorNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-full min-w-[120px] text-sm rounded-lg border-gray-200 focus:border-[#fd904c]"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="0"
                                value={rfqPrices[item.id] ?? ''}
                                onChange={(e) => setRfqPrices((prev) => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                                className="w-28 text-right rounded-lg border-gray-200 focus:border-[#fd904c]"
                              />
                            </td>
                            <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                              {rowTotals[item.id] > 0 ? `Rp ${rowTotals[item.id].toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="p-3"></td>
                          </tr>
                        ))}
                        {rfqExtraRows.map((row, idx) => (
                          <tr key={row.id} className="border-b border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20">
                            <td className="p-3 text-gray-500">{project.rfq!.items.length + idx + 1}</td>
                            <td className="p-3">
                              <Input
                                placeholder="Nama item"
                                value={row.itemName}
                                onChange={(e) => setRfqExtraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, itemName: e.target.value } : r))}
                                className="w-full min-w-[100px] text-sm rounded-lg border-amber-200 dark:border-amber-700"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="0"
                                value={row.quantity || ''}
                                onChange={(e) => setRfqExtraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, quantity: Number(e.target.value) || 0 } : r))}
                                className="w-20 text-center text-sm rounded-lg border-amber-200 dark:border-amber-700"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={row.unit}
                                onChange={(e) => setRfqExtraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, unit: e.target.value } : r))}
                                className="rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 w-full min-w-[70px]"
                              >
                                <option value="m">m</option>
                                <option value="m2">m²</option>
                                <option value="m3">m³</option>
                                <option value="kg">kg</option>
                                <option value="pcs">pcs</option>
                                <option value="unit">unit</option>
                                <option value="ls">ls</option>
                                <option value="set">set</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <Input
                                placeholder="Spesifikasi"
                                value={row.spesifikasi}
                                onChange={(e) => setRfqExtraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, spesifikasi: e.target.value } : r))}
                                className="w-full min-w-[80px] text-sm rounded-lg border-amber-200 dark:border-amber-700"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                placeholder="Catatan"
                                value={row.vendorNotes}
                                onChange={(e) => setRfqExtraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, vendorNotes: e.target.value } : r))}
                                className="w-full min-w-[80px] text-sm rounded-lg border-amber-200 dark:border-amber-700"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="0"
                                value={row.unitPrice || ''}
                                onChange={(e) => setRfqExtraRows((prev) => prev.map((r) => r.id === row.id ? { ...r, unitPrice: Number(e.target.value) || 0 } : r))}
                                className="w-28 text-right text-sm rounded-lg border-amber-200 dark:border-amber-700"
                              />
                            </td>
                            <td className="p-3 text-right font-medium text-amber-800 dark:text-amber-200 whitespace-nowrap">
                              Rp {((row.quantity || 0) * (row.unitPrice || 0)).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                onClick={() => setRfqExtraRows((prev) => prev.filter((r) => r.id !== row.id))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td colSpan={8} className="p-3 text-right text-gray-600 dark:text-gray-400">Subtotal</td>
                          <td className="p-3 text-right font-medium whitespace-nowrap">Rp {subtotal.toLocaleString('id-ID')}</td>
                        </tr>
                        {discountEnabled && (
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td colSpan={8} className="p-3 text-right text-gray-600 dark:text-gray-400">
                              Diskon {discountType === 'percent' ? `(${discountValue}%)` : '(Rp tetap)'}
                            </td>
                            <td className="p-3 text-right text-red-600 dark:text-red-400 whitespace-nowrap">
                              - Rp {discountAmount.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        )}
                        {taxEnabled && (
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td colSpan={8} className="p-3 text-right text-gray-600 dark:text-gray-400">
                              {taxLabel} ({taxPercent}%)
                            </td>
                            <td className="p-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              Rp {taxAmount.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        )}
                        <tr className="bg-[#fd904c] text-white font-bold">
                          <td colSpan={8} className="p-3 rounded-bl-xl">Total Penawaran</td>
                          <td className="p-3 text-right rounded-br-xl whitespace-nowrap">
                            Rp {totalWithTaxDiscount.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="mb-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRfqExtraRows((prev) => [...prev, { id: `ex-${Date.now()}-${prev.length}`, itemName: '', spesifikasi: '', quantity: 0, unit: 'pcs', unitPrice: 0, vendorNotes: '' }])}
                      className="border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah baris (item tambahan dari vendor)
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Untuk antisipasi item yang mungkin kurang di RFQ client.</p>
                  </div>

                  {/* Pajak & Diskon (default non-aktif) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="discount-toggle" className="text-sm font-medium">Aktifkan Diskon</Label>
                        <Switch id="discount-toggle" checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
                      </div>
                      {discountEnabled && (
                        <div className="space-y-2 pl-1">
                          <div className="flex gap-2 items-center">
                            <select
                              value={discountType}
                              onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                              className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2"
                            >
                              <option value="percent">Persentase (%)</option>
                              <option value="fixed">Fixed (Rp)</option>
                            </select>
                            <Input
                              type="number"
                              min={0}
                              step={discountType === 'percent' ? 1 : 1000}
                              value={discountValue || ''}
                              onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                              placeholder={discountType === 'percent' ? '0-100' : '0'}
                              className="w-28 text-right"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="tax-toggle" className="text-sm font-medium">Aktifkan Pajak</Label>
                        <Switch id="tax-toggle" checked={taxEnabled} onCheckedChange={setTaxEnabled} />
                      </div>
                      {taxEnabled && (
                        <div className="space-y-2 pl-1 flex flex-wrap gap-3 items-end">
                          <div>
                            <Label className="text-xs text-muted-foreground">Jenis Pajak</Label>
                            <Input
                              value={taxLabel}
                              onChange={(e) => setTaxLabel(e.target.value)}
                              placeholder="PPn"
                              className="mt-1 w-32"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Persen (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={taxPercent}
                              onChange={(e) => setTaxPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                              className="mt-1 w-20 text-right"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">Catatan Vendor</label>
                  <Textarea
                    placeholder="Tambahkan catatan atau keterangan tambahan..."
                    value={rfqNotes}
                    onChange={(e) => setRfqNotes(e.target.value)}
                    className="min-h-[80px] rounded-xl border-gray-200 focus:border-[#fd904c] mb-6"
                  />
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>Batal</Button>
                    <Button
                      onClick={handleSubmitOffer}
                      disabled={offerSubmitting || Object.values(rfqPrices).every((v) => !v || v <= 0)}
                      className="bg-[#fd904c] hover:bg-[#e57835] text-white shadow-lg shadow-[#fd904c]/30"
                    >
                      {offerSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kirim Penawaran
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Unggah file penawaran (PDF/dokumen) dan isi nominal total penawaran. Nilai ini dapat dinegosiasikan atau disetujui oleh client.</p>
                  <div className="flex items-center gap-3 mb-4">
                    <Input type="file" accept=".pdf,.doc,.docx" onChange={handleUploadOfferFile} disabled={uploadingFile} className="flex-1" />
                    {uploadingFile && <Loader2 className="w-5 h-5 animate-spin text-[#fd904c]" />}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nominal total penawaran (Rp) *</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Contoh: 150000000"
                      value={proposedBudget}
                      onChange={(e) => setProposedBudget(e.target.value.replace(/\D/g, ''))}
                      className="max-w-xs"
                    />
                    {proposedBudget && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Rp {Number(proposedBudget.replace(/\D/g, '')).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                  {offerFileUrl && <p className="text-sm text-green-600 dark:text-green-400 mb-4">File terunggah. Isi nominal total lalu Kirim untuk mengajukan penawaran.</p>}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitOffer}
                      disabled={offerSubmitting || !offerFileUrl || !proposedBudget.trim() || Number(proposedBudget.replace(/\D/g, '')) <= 0}
                      className="bg-[#fd904c] hover:bg-[#e57835] text-white shadow-lg shadow-[#fd904c]/30"
                    >
                      {offerSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Kirim Penawaran
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
            </>
          )}
        </section>
          </TabsContent>
        </Tabs>

        <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100 dark:border-gray-800">
          © {new Date().getFullYear()} Adogalo. All rights reserved.
        </footer>
      </main>

      {/* Dialog fallback untuk ajukan penawaran (opsional - form sudah inline di card) */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{project.rfq?.items?.length ? 'Isi Penawaran RFQ' : 'Upload File Penawaran'}</DialogTitle>
          </DialogHeader>
          {project.rfq?.items?.length ? (
            <div className="space-y-4">
              {project.rfq.items.map((item) => (
                <div key={item.id}>
                  <label className="text-sm font-medium">{item.itemName} ({item.quantity} {item.unit})</label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={rfqPrices[item.id] || ''}
                    onChange={(e) => setRfqPrices((prev) => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
              ))}
              <Textarea placeholder="Catatan" value={rfqNotes} onChange={(e) => setRfqNotes(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-4">
              <Input type="file" accept=".pdf,.doc,.docx" onChange={handleUploadOfferFile} disabled={uploadingFile} />
              <div>
                <label className="block text-sm font-medium mb-2">Nominal total penawaran (Rp) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 150000000"
                  value={proposedBudget}
                  onChange={(e) => setProposedBudget(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {offerFileUrl && <p className="text-sm text-green-600">File terunggah.</p>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>Batal</Button>
            <Button
              onClick={handleSubmitOffer}
              disabled={offerSubmitting || (project.rfq?.items?.length ? false : (!offerFileUrl || !proposedBudget.trim() || Number(proposedBudget.replace(/\D/g, '')) <= 0))}
              className="bg-[#fd904c] hover:bg-[#e57835]"
            >
              {offerSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!previewImage} onOpenChange={() => { setPreviewImage(null); setPreviewCaption(''); }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewImage && (
            <>
              <img src={previewImage} alt={previewCaption} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
              {previewCaption && <p className="text-center font-medium py-2 text-sm text-gray-600 dark:text-gray-400">{previewCaption}</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
