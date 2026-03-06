'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { RoleLandingHeader } from '@/components/landing/RoleLandingHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { toast } from 'sonner';

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
  rfq?: {
    id: string;
    title: string;
    status: string;
    items: { id: string; itemName: string; description: string | null; quantity: number; unit: string; sortOrder: number }[];
  } | null;
  userApplication?: { id: string; status: string; offerFileUrl?: string | null } | null;
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
  const [rfqNotes, setRfqNotes] = useState('');
  const [offerFileUrl, setOfferFileUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
      } else {
        toast.error(data?.error || 'Gagal mengirim komentar');
      }
    } catch {
      toast.error('Gagal mengirim komentar');
    } finally {
      setSubmittingComment(false);
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
        }));
        if (itemPrices.some((p) => !p.unitPrice || p.unitPrice <= 0)) {
          toast.error('Isi semua harga item RFQ');
          setOfferSubmitting(false);
          return;
        }
        const res = await fetch('/api/rfq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            rfqId: project.rfq.id,
            itemPrices,
            notes: rfqNotes || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          toast.success('Penawaran RFQ berhasil dikirim');
          setOfferDialogOpen(false);
          fetchProject();
        } else {
          toast.error(data?.error || 'Gagal mengirim penawaran');
        }
      } else {
        if (!offerFileUrl.trim()) {
          toast.error('Unggah file penawaran terlebih dahulu');
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
          }),
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          toast.success('Penawaran berhasil dikirim');
          setOfferDialogOpen(false);
          setOfferFileUrl('');
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#fd904c]/5 via-background to-[#e57835]/5">
        <RoleLandingHeader title="Adogalo" subtitle="Proyek Tender" />
        <div className="container max-w-4xl mx-auto px-4 py-8">
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
  const locationText = project.city
    ? [project.city.province?.name, project.city.name].filter(Boolean).join(', ')
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#fd904c]/5 via-background to-[#e57835]/5">
      <RoleLandingHeader title="Adogalo" subtitle="Proyek Tender / Kontrak" />

      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Link href="/proyek-tender" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar proyek
        </Link>

        {/* Banner */}
        <div className="rounded-2xl border border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl overflow-hidden mb-8">
          <div className="p-6 md:p-8 bg-gradient-to-br from-[#fd904c]/10 to-[#e57835]/10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {project.category && (
                <Badge className="bg-[#fd904c]/20 text-[#e57835]">{project.category.name}</Badge>
              )}
              {isExpired && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">Kadaluarsa</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{project.title}</h1>
            <div className="flex flex-wrap gap-4 md:gap-6 text-sm">
              {project.budget != null && (
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#e57835]" />
                  Anggaran: Rp {(project.budget / 1e6).toFixed(0)}jt
                </span>
              )}
              {project.offerDeadline && (
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-[#e57835]" />
                  Batas penawaran: {new Date(project.offerDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {locationText && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#e57835]" />
                  {locationText}
                </span>
              )}
              {project.startDate && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#e57835]" />
                  Target mulai: {new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body - Deskripsi */}
        <Card className="rounded-2xl border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deskripsi Proyek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>

        {/* Gallery */}
        {photos.length > 0 && (
          <Card className="rounded-2xl border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Galeri Foto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className="relative aspect-video rounded-lg overflow-hidden bg-muted"
                    onClick={() => setPreviewImage(url)}
                  >
                    <img src={url.startsWith('/') ? url : url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lampiran */}
        {files.length > 0 && (
          <Card className="rounded-2xl border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Lampiran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {files.map((url, i) => (
                  <li key={i}>
                    <a href={url.startsWith('/') ? url : url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Dokumen {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Diskusi */}
        <Card className="rounded-2xl border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Diskusi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#fd904c]/20 flex items-center justify-center text-[#e57835] font-medium">
                  {c.user.name?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.user.name}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(c.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
            {(user.role === 'VENDOR' || user.role === 'CLIENT') && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Tulis komentar..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="shrink-0 bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                >
                  {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ajukan penawaran */}
        <Card className="rounded-2xl border-white/20 bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl mb-8">
          <CardContent className="pt-6">
            {project.userApplication ? (
              <p className="text-muted-foreground">Anda sudah mengajukan penawaran. Status: {project.userApplication.status}</p>
            ) : isExpired ? (
              <p className="text-amber-600 dark:text-amber-400">Batas akhir penawaran telah lewat. Proyek kadaluarsa.</p>
            ) : (
              <Button
                onClick={() => setOfferDialogOpen(true)}
                className="bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90"
              >
                Ajukan Penawaran
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Ajukan Penawaran */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {project.rfq?.items?.length ? 'Isi Penawaran RFQ' : 'Upload File Penawaran'}
            </DialogTitle>
          </DialogHeader>
          {project.rfq?.items?.length ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Isi harga per satuan untuk setiap item.</p>
              {project.rfq.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {item.itemName} ({item.quantity} {item.unit})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Harga per satuan (Rp)"
                    value={rfqPrices[item.id] || ''}
                    onChange={(e) => setRfqPrices((prev) => ({ ...prev, [item.id]: Number(e.target.value) || 0 }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">Catatan (opsional)</label>
                <Textarea
                  placeholder="Catatan untuk client..."
                  value={rfqNotes}
                  onChange={(e) => setRfqNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Unggah file penawaran (PDF/dokumen).</p>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleUploadOfferFile}
                  disabled={uploadingFile}
                />
                {uploadingFile && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              {offerFileUrl && (
                <p className="text-sm text-green-600 dark:text-green-400">File terunggah. Klik Kirim untuk mengajukan penawaran.</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>Batal</Button>
            <Button
              onClick={handleSubmitOffer}
              disabled={offerSubmitting || (!!project.rfq?.items?.length && Object.values(rfqPrices).every((v) => !v || v <= 0)) || (!project.rfq?.items?.length && !offerFileUrl)}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {offerSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kirim Penawaran'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
