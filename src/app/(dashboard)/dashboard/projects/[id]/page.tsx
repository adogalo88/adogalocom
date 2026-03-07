'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject, useCreateApplication, useUpdateApplication, useDeleteProject, formatCurrency, formatDate, getProjectStatusConfig, getApplicationStatusConfig } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2,
  MapPin,
  Calendar,
  Users,
  Wallet,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  MessageSquare,
  Send,
  Ban,
  Trash2,
  ShieldCheck,
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

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (val == null || val === '') return [];
  if (typeof val !== 'string') return [];
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;
  
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [skillRatings, setSkillRatings] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingSkillRatings, setSubmittingSkillRatings] = useState(false);
  const [comments, setComments] = useState<{ id: string; content: string; createdAt: string; user: { id: string; name: string; role: string; avatar: string | null } }[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, refetch } = useProject(projectId);
  const project = data?.project;

  const fetchComments = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, { credentials: 'include' });
      const data = await res.json();
      setComments(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      console.error(e);
    }
  }, [projectId]);

  useEffect(() => {
    if (project?.type === 'TENDER' && projectId) fetchComments();
  }, [project?.type, projectId, fetchComments]);

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!projectId || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
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
        setTimeout(() => chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' }), 100);
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
    if (!projectId || user?.role !== 'ADMIN') return;
    if (!confirm('Hapus komentar ini? (untuk pesan tidak pantas/spam)')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/comments/${commentId}`, { method: 'DELETE', credentials: 'include' });
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

  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication(selectedApplication ?? '');
  const deleteProject = useDeleteProject(projectId);

  const isOwner = project?.clientId === user?.id;
  const isVendor = user?.role === 'VENDOR';
  const isTukang = user?.role === 'TUKANG';
  const isAdmin = user?.role === 'ADMIN';
  const canApply = (isVendor || isTukang) && project?.status === 'PUBLISHED';
  const hasApplied = project?.applications?.some(a => a.userId === user?.id);

  const handleApply = async () => {
    try {
      await createApplication.mutateAsync({
        projectId,
        coverLetter,
        proposedBudget: proposedBudget ? parseFloat(proposedBudget) : undefined,
      });
      toast.success('Penawaran berhasil dikirim!');
      setShowApplyDialog(false);
      setCoverLetter('');
      setProposedBudget('');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim penawaran');
    }
  };

  const handleAcceptApplication = async () => {
    if (!selectedApplication) return;
    try {
      await updateApplication.mutateAsync({ status: 'ACCEPTED' });
      toast.success('Penawaran diterima!');
      setShowAcceptDialog(false);
      setSelectedApplication(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menerima penawaran');
    }
  };

  const handleRejectApplication = async () => {
    if (!selectedApplication) return;
    try {
      await updateApplication.mutateAsync({ status: 'REJECTED' });
      toast.success('Penawaran ditolak');
      setShowRejectDialog(false);
      setSelectedApplication(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menolak penawaran');
    }
  };

  const handleUpdateProjectStatus = async (newStatus: 'PUBLISHED' | 'COMPLETED' | 'CANCELLED') => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        const statusMessages: Record<string, string> = {
          'PUBLISHED': 'Proyek berhasil dipublikasi!',
          'COMPLETED': 'Proyek ditandai selesai!',
          'CANCELLED': 'Proyek dibatalkan',
        };
        toast.success(statusMessages[newStatus]);
        refetch();
      } else {
        toast.error(result.error || 'Gagal mengubah status proyek');
      }
    } catch (error) {
      toast.error('Gagal mengubah status proyek');
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

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Proyek tidak ditemukan</p>
        <Link href="/dashboard/projects">
          <Button className="mt-4">Kembali ke Daftar Proyek</Button>
        </Link>
      </div>
    );
  }

  const applicationCount =
    project.tenderSubtype === 'WITH_RFQ' && project.rfq
      ? (project.rfq._count?.submissions ?? project.rfq.submissions?.length ?? 0)
      : (project._count?.applications ?? project.applications?.length ?? 0);
  const offerList = project.tenderSubtype === 'WITH_RFQ' && project.rfq?.submissions
    ? project.rfq.submissions
    : project.applications ?? [];

  return (
    <div className="w-full max-w-[100%] space-y-0">
      {/* Aurora-style header (full width) */}
      <header className="relative overflow-hidden h-[200px] md:h-[240px] bg-gradient-to-br from-[#fff8f3] via-[#fff5f0] to-[#fff0e8] dark:from-[#2d1f18] dark:via-[#1f1510] dark:to-[#1a120d] -mx-4 sm:-mx-6 lg:-mx-8 mt-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_30%,rgba(253,144,76,0.15)_0%,transparent_50%)]" />
        <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 self-start -ml-2 mb-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl md:text-2xl font-bold text-[#c2652a] dark:text-[#fd904c]">{project.title}</h1>
            <Badge className={getProjectStatusConfig(project.status).className}>
              {getProjectStatusConfig(project.status).label}
            </Badge>
            {project.type === 'TENDER' && (
              <span className="text-sm font-medium text-muted-foreground">
                {applicationCount} penawaran masuk
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {project.category && (
              <span className="px-2 py-1 rounded-full bg-muted">{project.category.name}</span>
            )}
            <Badge variant="outline">
              {project.type === 'TENDER' ? 'Tender (Kontrak)' : 'Harian'}
            </Badge>
            {project.tenderSubtype === 'WITH_RFQ' && (
              <Badge variant="outline" className="text-[#fd904c] border-[#fd904c]">
                Dengan RFQ
              </Badge>
            )}
            <span>Dibuat {formatDate(project.createdAt)}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-background rounded-t-2xl" />
      </header>

      <div className="relative -mt-2 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
          {/* Vendor/Tukang Actions */}
          {canApply && !hasApplied && (
            <Button
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
              onClick={() => setShowApplyDialog(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Kirim Penawaran
            </Button>
          )}

          {/* Owner Actions */}
          {/* Client tidak bisa edit; hanya admin yang bisa publish dari draft. Proyek client submit langsung PENDING_VERIFICATION. */}
          {isOwner && project.status === 'DRAFT' && isAdmin && (
            <Button
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
              onClick={() => setShowPublishDialog(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Publikasikan
            </Button>
          )}

          {isOwner && project.status === 'IN_PROGRESS' && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowCompleteDialog(true)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Selesaikan Proyek
            </Button>
          )}

          {(isOwner || isAdmin) && ['DRAFT', 'PUBLISHED', 'IN_PROGRESS'].includes(project.status) && (
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Batalkan
            </Button>
          )}

          {/* Hanya admin yang bisa edit proyek */}
          {isAdmin && (
            <>
              <Link href={`/dashboard/projects/${project.id}/edit`}>
                <Button variant="outline">Edit Proyek</Button>
              </Link>
              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                Hapus
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content - full width */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Deskripsi Proyek</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{project.description}</p>
            </CardContent>
          </Card>

          {/* Dana Komitmen - hanya untuk Client & Admin, proyek Tender/Kontrak */}
          {(isOwner || isAdmin) && project.type === 'TENDER' && (
            <Card className="glass-card border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                  <ShieldCheck className="h-5 w-5" />
                  Dana Komitmen Proyek
                </CardTitle>
                <CardDescription>
                  Dana ini akan dikembalikan 100% setelah proyek selesai dan Anda memberi rating ke vendor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="text-sm text-muted-foreground">Nilai Dana Komitmen</span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">Rp200.000</span>
                </div>
                <p className="text-sm text-emerald-800/90 dark:text-emerald-200/90">
                  ✓ Bukan biaya layanan — dana disimpan dan dikembalikan 100% setelah proyek selesai dikerjakan dan Anda memberikan rating serta ulasan kepada Vendor. Admin akan mengirimkan link pembayaran melalui WhatsApp atau kontak terdaftar.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {parseJsonArray(project.photos).length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Foto Proyek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {parseJsonArray(project.photos).map((url: string, index: number) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="rounded-lg object-cover w-full h-32"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {parseJsonArray(project.files).length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Dokumen Pendukung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parseJsonArray(project.files).map((url: string, index: number) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80"
                    >
                      <FileText className="h-5 w-5 text-[#fd904c]" />
                      <span className="text-sm">{url.split('/').pop()}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating Keahlian (proyek harian selesai) */}
          {isOwner && project.status === 'COMPLETED' && project.type === 'HARIAN' && project.vendorId && (project.skills?.length ?? 0) > 0 && (
            <Card className="glass-card border-emerald-500/30">
              <CardHeader>
                <CardTitle>Beri Rating Keahlian</CardTitle>
                <CardDescription>
                  Beri rating untuk setiap keahlian yang dikerjakan tukang (1–5 bintang)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(project.skills as { id: string; name: string }[]).map((skill) => (
                  <div key={skill.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border">
                    <span className="font-medium sm:w-40">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSkillRatings((p) => ({ ...p, [skill.id]: { ...p[skill.id], rating: star } }))}
                          className="text-lg text-muted-foreground hover:text-amber-500 focus:outline-none"
                        >
                          {(skillRatings[skill.id]?.rating ?? 0) >= star ? '★' : '☆'}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Komentar (opsional)"
                      className="flex-1"
                      value={skillRatings[skill.id]?.comment ?? ''}
                      onChange={(e) => setSkillRatings((p) => ({ ...p, [skill.id]: { ...p[skill.id], comment: e.target.value } }))}
                    />
                  </div>
                ))}
                <Button
                  disabled={submittingSkillRatings || (project.skills as { id: string }[]).some((s) => !skillRatings[s.id]?.rating)}
                  onClick={async () => {
                    setSubmittingSkillRatings(true);
                    try {
                      const res = await fetch(`/api/projects/${projectId}/skill-ratings`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ratings: (project.skills as { id: string }[]).map((s) => ({
                            skillId: s.id,
                            rating: skillRatings[s.id]?.rating ?? 0,
                            comment: skillRatings[s.id]?.comment,
                          })),
                        }),
                        credentials: 'include',
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
                      toast.success('Rating keahlian berhasil disimpan');
                      refetch();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan rating');
                    } finally {
                      setSubmittingSkillRatings(false);
                    }
                  }}
                >
                  {submittingSkillRatings && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Rating Keahlian
                </Button>
              </CardContent>
            </Card>
          )}

          {/* RFQ Link for WITH_RFQ projects */}
          {project.type === 'TENDER' && project.tenderSubtype === 'WITH_RFQ' && (
            <Card className="glass-card border-[#fd904c]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#fd904c]/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-[#fd904c]" />
                    </div>
                    <div>
                      <p className="font-medium">RFQ (Request for Quotation)</p>
                      <p className="text-sm text-muted-foreground">
                        Kelola penawaran dari vendor
                      </p>
                    </div>
                  </div>
                  <Link href={project.rfq?.id ? `/dashboard/rfq/${project.rfq.id}` : `/dashboard/rfq?projectId=${project.id}`}>
                    <Button variant="outline">
                      Lihat RFQ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diskusi Proyek (TENDER) - client bisa diskusi dengan vendor */}
          {project.type === 'TENDER' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#fd904c]" />
                  Diskusi Proyek
                </CardTitle>
                <CardDescription>Diskusi dengan vendor yang tertarik atau yang sudah mengajukan penawaran</CardDescription>
              </CardHeader>
              <CardContent>
                <div ref={chatContainerRef} className="h-[320px] overflow-y-auto pr-2 mb-4 space-y-4 rounded-lg bg-muted/30 p-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Belum ada diskusi. Mulai percakapan dengan vendor.</p>
                  ) : (
                    comments.map((c) => {
                      const isVendor = c.user.role === 'VENDOR';
                      const isAdminRole = c.user.role === 'ADMIN';
                      return (
                        <div key={c.id} className={`flex gap-3 ${isVendor || isAdminRole ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${isAdminRole ? 'bg-slate-600' : isVendor ? 'bg-[#e57835]' : 'bg-[#fd904c]'}`}>
                            {c.user.name?.charAt(0) ?? '?'}
                          </div>
                          <div className={`max-w-[75%] ${isVendor || isAdminRole ? 'text-right' : ''}`}>
                            <div className={`flex items-center gap-2 mb-1 ${isVendor || isAdminRole ? 'justify-end' : ''}`}>
                              <span className={`text-sm font-medium ${isAdminRole ? 'text-slate-600' : isVendor ? 'text-[#e57835]' : 'text-[#fd904c]'}`}>{c.user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(c.createdAt).toLocaleDateString('id-ID')}, {new Date(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {user?.role === 'ADMIN' && (
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteComment(c.id)} title="Hapus komentar">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className={`inline-block px-4 py-3 rounded-2xl text-sm border ${isAdminRole ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-tr-md' : 'bg-[#fd904c]/10 border-[#fd904c]/20 rounded-tl-md'}`}>
                              {c.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {(user?.role === 'VENDOR' || user?.role === 'CLIENT' || user?.role === 'ADMIN') && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Textarea
                      placeholder="Tulis pesan... (Enter untuk kirim)"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                      className="min-h-[50px] max-h-[100px] resize-none"
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={submittingComment || !commentText.trim()}
                      className="self-end bg-[#fd904c] hover:bg-[#e57835]"
                    >
                      {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Applications / RFQ Penawaran Tab (for owner) */}
          {isOwner && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Penawaran Masuk ({offerList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {offerList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada penawaran masuk
                  </p>
                ) : (
                  <div className="space-y-4">
                    {project.tenderSubtype === 'WITH_RFQ' && project.rfq?.submissions ? (
                      offerList.map((sub: { id: string; status: string; totalOffer?: number | null; notes?: string | null; vendor?: { name?: string; email?: string }; submittedAt?: string | null }) => (
                        <div
                          key={sub.id}
                          className={`p-4 rounded-lg border ${
                            sub.status === 'ACCEPTED'
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                              : sub.status === 'REJECTED'
                              ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                              : 'border-border bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                                  {sub.vendor?.name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{sub.vendor?.name ?? 'Vendor'}</p>
                                <p className="text-sm text-muted-foreground">{sub.vendor?.email}</p>
                              </div>
                            </div>
                            <Badge className={
                              sub.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                              sub.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                              sub.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-muted'
                            }>
                              {sub.status === 'SUBMITTED' ? 'Menunggu' : sub.status === 'ACCEPTED' ? 'Diterima' : sub.status === 'REJECTED' ? 'Ditolak' : sub.status}
                            </Badge>
                          </div>
                          {sub.totalOffer != null && (
                            <p className="mt-2 text-sm">
                              <span className="text-muted-foreground">Total penawaran: </span>
                              <span className="font-semibold text-[#fd904c]">{formatCurrency(sub.totalOffer)}</span>
                            </p>
                          )}
                          {sub.notes && <p className="mt-2 text-sm text-muted-foreground">{sub.notes}</p>}
                          <Link href={`/dashboard/rfq/${project.rfq?.id}`} className="inline-block mt-3 text-sm text-[#fd904c] hover:underline">
                            Kelola penawaran di halaman RFQ →
                          </Link>
                        </div>
                      ))
                    ) : (
                      (offerList as { id: string; user?: { name?: string; email?: string; specialty?: string }; coverLetter?: string; proposedBudget?: number; status: string }[]).map((app) => (
                        <div
                          key={app.id}
                          className={`p-4 rounded-lg border ${
                            app.status === 'ACCEPTED'
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                              : app.status === 'REJECTED'
                              ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                              : 'border-border bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                                  {app.user?.name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{app.user?.name}</p>
                                <p className="text-sm text-muted-foreground">{app.user?.email}</p>
                                {app.user?.specialty && (
                                  <p className="text-xs text-[#fd904c]">{app.user.specialty}</p>
                                )}
                              </div>
                            </div>
                            <Badge className={getApplicationStatusConfig(app.status).className}>
                              {getApplicationStatusConfig(app.status).label}
                            </Badge>
                          </div>
                          {app.coverLetter && (
                            <p className="mt-3 text-sm text-muted-foreground">{app.coverLetter}</p>
                          )}
                          {app.proposedBudget != null && (
                            <p className="mt-2 text-sm">
                              <span className="text-muted-foreground">Penawaran: </span>
                              <span className="font-semibold text-[#fd904c]">{formatCurrency(app.proposedBudget)}</span>
                            </p>
                          )}
                          {app.status === 'PENDING' && project.status === 'PUBLISHED' && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedApplication(app.id);
                                  setShowAcceptDialog(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Terima
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedApplication(app.id);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Tolak
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Budget Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Informasi Proyek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.budget && (
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-[#fd904c]" />
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-semibold text-[#fd904c]">{formatCurrency(project.budget)}</p>
                  </div>
                </div>
              )}

              {project.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Lokasi</p>
                    <p>{project.location}</p>
                  </div>
                </div>
              )}

              {project.workerNeeded && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pekerja Dibutuhkan</p>
                    <p>{project.workerNeeded} orang</p>
                  </div>
                </div>
              )}

              {project.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Periode</p>
                    <p>
                      {formatDate(project.startDate)}
                      {project.endDate && ` - ${formatDate(project.endDate)}`}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Klien</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={project.client?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-lg">
                    {project.client?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{project.client?.name}</p>
                  <p className="text-sm text-muted-foreground">{project.client?.email}</p>
                </div>
              </div>
              {!isOwner && (
                <Link href={`/dashboard/messages?with=${project.clientId}`}>
                  <Button variant="outline" className="w-full mt-4">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Hubungi Klien
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          {project._count && (
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[#fd904c]">{project._count.applications}</p>
                    <p className="text-sm text-muted-foreground">Penawaran</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#e57835]">{project._count.teamMembers}</p>
                    <p className="text-sm text-muted-foreground">Tim</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim Penawaran</AlertDialogTitle>
            <AlertDialogDescription>
              Kirim penawaran Anda untuk proyek ini
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Surat Pengantar</Label>
              <Textarea
                placeholder="Ceritakan mengapa Anda cocok untuk proyek ini..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Penawaran Harga (Rp)</Label>
              <Input
                type="number"
                placeholder="Masukkan penawaran harga Anda"
                value={proposedBudget}
                onChange={(e) => setProposedBudget(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApply}
              disabled={createApplication.isPending}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {createApplication.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Kirim Penawaran
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accept Application Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terima Penawaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menerima penawaran ini. Penawaran lain akan ditolak otomatis dan proyek akan berubah status menjadi "Berjalan".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptApplication}
              disabled={updateApplication.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Ya, Terima
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Application Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Penawaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Penawaran ini akan ditolak dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectApplication}
              disabled={updateApplication.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publikasikan Proyek?</AlertDialogTitle>
            <AlertDialogDescription>
              Proyek akan dipublikasikan dan dapat dilihat oleh Vendor/Tukang untuk mengirim penawaran.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowPublishDialog(false);
                handleUpdateProjectStatus('PUBLISHED');
              }}
              disabled={isProcessing}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Publikasikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan Proyek?</AlertDialogTitle>
            <AlertDialogDescription>
              Proyek akan ditandai sebagai selesai. Vendor/Tukang tidak dapat mengirim penawaran lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCompleteDialog(false);
                handleUpdateProjectStatus('COMPLETED');
              }}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Selesaikan Proyek
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Proyek?</AlertDialogTitle>
            <AlertDialogDescription>
              Proyek akan dibatalkan dan tidak dapat dikembalikan. Semua penawaran yang masuk akan ditolak otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tidak, Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelDialog(false);
                handleUpdateProjectStatus('CANCELLED');
              }}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog (Admin only) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Proyek?</AlertDialogTitle>
            <AlertDialogDescription>
              Proyek akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowDeleteDialog(false);
                try {
                  await deleteProject.mutateAsync();
                  toast.success('Proyek telah dihapus');
                  router.push('/dashboard/projects');
                } catch {
                  toast.error('Gagal menghapus proyek');
                }
              }}
              disabled={deleteProject.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteProject.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
