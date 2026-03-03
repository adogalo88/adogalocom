'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject, useCreateApplication, useUpdateApplication, formatCurrency, formatDate, getProjectStatusConfig, getApplicationStatusConfig } from '@/hooks/api';
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
  const [isProcessing, setIsProcessing] = useState(false);

  const { data, isLoading, error, refetch } = useProject(projectId);
  const createApplication = useCreateApplication();
  const updateApplication = useUpdateApplication(projectId);

  const project = data?.project;

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
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Badge className={getProjectStatusConfig(project.status).className}>
              {getProjectStatusConfig(project.status).label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
        <div className="flex gap-2 flex-wrap">
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
          {isOwner && project.status === 'DRAFT' && (
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

          {isOwner && project.status === 'DRAFT' && (
            <Link href={`/dashboard/projects/${project.id}/edit`}>
              <Button variant="outline">Edit Proyek</Button>
            </Link>
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
              <CardTitle>Deskripsi Proyek</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{project.description}</p>
            </CardContent>
          </Card>

          {/* Photos */}
          {project.photos && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Foto Proyek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {JSON.parse(project.photos).map((url: string, index: number) => (
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
          {project.files && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Dokumen Pendukung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {JSON.parse(project.files).map((url: string, index: number) => (
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
                  <Link href={`/dashboard/rfq?projectId=${project.id}`}>
                    <Button variant="outline">
                      Lihat RFQ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Applications Tab (for owner) */}
          {isOwner && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Penawaran Masuk ({project.applications?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!project.applications || project.applications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada penawaran masuk
                  </p>
                ) : (
                  <div className="space-y-4">
                    {project.applications.map((app) => (
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
                        
                        {app.proposedBudget && (
                          <p className="mt-2 text-sm">
                            <span className="text-muted-foreground">Penawaran: </span>
                            <span className="font-semibold text-[#fd904c]">
                              {formatCurrency(app.proposedBudget)}
                            </span>
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
                    ))}
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
    </div>
  );
}
