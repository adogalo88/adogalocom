'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Shield,
  FolderKanban,
  Package,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  AlertCircle,
  Clock,
  User,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  location: string | null;
  type: string;
  status: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  category: { id: string; name: string } | null;
  _count: { applications: number };
  rfq?: {
    id: string;
    items: Array<{ id: string; itemName: string; description: string | null; quantity: number; unit: string; sortOrder: number }>;
  } | null;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  budget: number | null;
  quotationType: string;
  status: string;
  location: string | null;
  deadline: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  project: { id: string; title: string } | null;
  _count: { offers: number; rfqItems: number };
}

interface Counts {
  pendingProjects: number;
  pendingMaterials: number;
  rejectedProjects: number;
  rejectedMaterials: number;
  pendingUsers?: number;
}

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  status: string;
  isVerified: boolean;
  ktpPhoto: string | null;
  experience: number | null;
  verificationEntityType: string | null;
  picName: string | null;
  picPhone: string | null;
  picKtpPhoto: string | null;
  nibDoc: string | null;
  npwpDoc: string | null;
  aktaPendirianDoc: string | null;
  siupDoc: string | null;
  skckDoc: string | null;
  address: string | null;
  createdAt: string;
}

export default function VerificationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('users');
  const [status, setStatus] = useState<'PENDING_VERIFICATION' | 'REJECTED'>('PENDING_VERIFICATION');
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [counts, setCounts] = useState<Counts>({
    pendingProjects: 0,
    pendingMaterials: 0,
    rejectedProjects: 0,
    rejectedMaterials: 0,
    pendingUsers: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialogs
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'project' | 'material'; id: string; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [reviewUserOpen, setReviewUserOpen] = useState(false);
  const [selectedReviewUser, setSelectedReviewUser] = useState<PendingUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchVerifications();
  }, [status]);

  const fetchVerifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/verification?status=${status}`);
      const result = await response.json();
      if (result.success && result.data) {
        setProjects(result.data.projects || []);
        setMaterials(result.data.materials || []);
        setCounts(result.data.counts || { pendingProjects: 0, pendingMaterials: 0, rejectedProjects: 0, rejectedMaterials: 0, pendingUsers: 0 });
        setPendingUsers(result.data.pendingUsers || []);
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Gagal memuat data verifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (type: 'project' | 'material', id: string) => {
    setIsSubmitting(true);
    try {
      const endpoint = type === 'project' 
        ? `/api/admin/projects/${id}` 
        : `/api/admin/materials/${id}`;
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });

      const result = await response.json();
      if (response.ok && !result.error) {
        toast.success(result.message || `${type === 'project' ? 'Proyek' : 'Material'} berhasil diverifikasi`);
        fetchVerifications();
      } else {
        toast.error(result.error || 'Gagal memverifikasi');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isVerified: true,
          status: 'ACTIVE',
          verifiedAt: new Date().toISOString(),
          verifiedBy: user?.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memverifikasi');
      toast.success('User berhasil diverifikasi');
      fetchVerifications();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memverifikasi user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (type: 'project' | 'material', id: string) => {
    if (!confirm(`Yakin ingin menghapus ${type === 'project' ? 'proyek' : 'material'} ini?`)) return;
    setIsSubmitting(true);
    try {
      const endpoint = type === 'project' ? `/api/projects/${id}` : `/api/materials/${id}`;
      const response = await fetch(endpoint, { method: 'DELETE', credentials: 'include' });
      const result = await response.json();
      if (response.ok && result?.success !== false) {
        toast.success(`${type === 'project' ? 'Proyek' : 'Material'} berhasil dihapus`);
        fetchVerifications();
      } else {
        toast.error(result?.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !rejectionReason.trim()) {
      toast.error('Alasan penolakan harus diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = selectedItem.type === 'project' 
        ? `/api/admin/projects/${selectedItem.id}` 
        : `/api/admin/materials/${selectedItem.id}`;
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'REJECT', 
          rejectionReason: rejectionReason.trim() 
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`${selectedItem.type === 'project' ? 'Proyek' : 'Material'} telah ditolak`);
        setRejectDialogOpen(false);
        setSelectedItem(null);
        setRejectionReason('');
        fetchVerifications();
      } else {
        toast.error(result.error || 'Gagal menolak');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.client.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.client.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig = {
    PENDING_VERIFICATION: { 
      label: 'Menunggu Verifikasi', 
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
    },
    REJECTED: { 
      label: 'Ditolak', 
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
    },
  };

  const projectTypeConfig = {
    TENDER: { label: 'Borongan', className: 'bg-blue-100 text-blue-700' },
    HARIAN: { label: 'Harian', className: 'bg-purple-100 text-purple-700' },
  };

  const quotationTypeConfig = {
    SIMPLE: { label: 'Sederhana', className: 'bg-gray-100 text-gray-700' },
    RFQ: { label: 'RFQ', className: 'bg-teal-100 text-teal-700' },
    PDF: { label: 'PDF', className: 'bg-indigo-100 text-indigo-700' },
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#fd904c]" />
          Verifikasi Konten
        </h1>
        <p className="text-muted-foreground">
          Verifikasi proyek dan permintaan material sebelum dipublikasikan
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-card cursor-pointer hover:border-[#fd904c] transition-colors"
              onClick={() => setActiveTab('users')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#fd904c]/20 flex items-center justify-center">
                <User className="h-5 w-5 text-[#fd904c]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pendingUsers ?? 0}</p>
                <p className="text-xs text-muted-foreground">User Belum Diverifikasi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card cursor-pointer hover:border-yellow-400 transition-colors" 
              onClick={() => { setStatus('PENDING_VERIFICATION'); setActiveTab('projects'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pendingProjects}</p>
                <p className="text-xs text-muted-foreground">Proyek Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card cursor-pointer hover:border-yellow-400 transition-colors"
              onClick={() => { setStatus('PENDING_VERIFICATION'); setActiveTab('materials'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pendingMaterials}</p>
                <p className="text-xs text-muted-foreground">Material Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card cursor-pointer hover:border-red-400 transition-colors"
              onClick={() => { setStatus('REJECTED'); setActiveTab('projects'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.rejectedProjects}</p>
                <p className="text-xs text-muted-foreground">Proyek Ditolak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card cursor-pointer hover:border-red-400 transition-colors"
              onClick={() => { setStatus('REJECTED'); setActiveTab('materials'); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.rejectedMaterials}</p>
                <p className="text-xs text-muted-foreground">Material Ditolak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="users" className="gap-2">
            <User className="h-4 w-4" />
            User
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Proyek
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <Package className="h-4 w-4" />
            Material
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingUsers.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">Semua user sudah diverifikasi</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((u) => {
                const roleLabels: Record<string, string> = { CLIENT: 'Klien', VENDOR: 'Vendor', TUKANG: 'Tukang', SUPPLIER: 'Supplier' };
                let dataLengkap = true;
                if (u.role === 'VENDOR') {
                  if (u.verificationEntityType === 'PERORANGAN') {
                    dataLengkap = !!u.ktpPhoto;
                  } else {
                    dataLengkap = !!(u.nibDoc || u.npwpDoc || u.aktaPendirianDoc || u.siupDoc);
                  }
                } else if (u.role === 'SUPPLIER') {
                  dataLengkap = !!(u.picName?.trim() && u.picPhone?.trim() && u.picKtpPhoto);
                } else if (u.role === 'TUKANG') {
                  dataLengkap = !!(u.ktpPhoto && u.skckDoc && u.experience != null);
                }
                return (
                  <Card key={u.id} className="glass-card hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={u.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                              {u.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary">{roleLabels[u.role] || u.role}</Badge>
                              {!dataLengkap && (u.role === 'VENDOR' || u.role === 'SUPPLIER' || u.role === 'TUKANG') && (
                                <Badge variant="outline" className="text-amber-600">Data verifikasi belum lengkap</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedReviewUser(u); setReviewUserOpen(true); }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleVerifyUser(u.id)}
                            disabled={isSubmitting || !dataLengkap}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verifikasi
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4 mt-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari proyek..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={status === 'PENDING_VERIFICATION' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('PENDING_VERIFICATION')}
                className={status === 'PENDING_VERIFICATION' ? 'bg-[#fd904c] hover:bg-[#fd904c]/90' : ''}
              >
                <Clock className="h-4 w-4 mr-1" />
                Pending
              </Button>
              <Button 
                variant={status === 'REJECTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('REJECTED')}
                className={status === 'REJECTED' ? 'bg-red-500 hover:bg-red-600' : ''}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Ditolak
              </Button>
            </div>
          </div>

          {/* Projects List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Tidak ada proyek {status === 'PENDING_VERIFICATION' ? 'menunggu verifikasi' : 'yang ditolak'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="glass-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={project.client.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                              {project.client.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{project.title}</h3>
                              <Badge className={projectTypeConfig[project.type as keyof typeof projectTypeConfig]?.className || 'bg-gray-100'}>
                                {projectTypeConfig[project.type as keyof typeof projectTypeConfig]?.label || project.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {project.description}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {project.client.name}
                              </span>
                              {project.budget && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(project.budget)}
                                </span>
                              )}
                              {project.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {project.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(project.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-2">
                        <Badge className={statusConfig[status as keyof typeof statusConfig]?.className}>
                          {statusConfig[status as keyof typeof statusConfig]?.label}
                        </Badge>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedProject(project);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                          {status === 'PENDING_VERIFICATION' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove('project', project.id)}
                                disabled={isSubmitting}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Setujui
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  setSelectedItem({ type: 'project', id: project.id, title: project.title });
                                  setRejectDialogOpen(true);
                                }}
                                disabled={isSubmitting}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Tolak
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/projects/${project.id}/edit`}>
                              <FileText className="h-4 w-4 mr-1" />
                              Edit
                            </Link>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600"
                            onClick={() => handleDelete('project', project.id)}
                            disabled={isSubmitting}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="materials" className="space-y-4 mt-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={status === 'PENDING_VERIFICATION' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('PENDING_VERIFICATION')}
                className={status === 'PENDING_VERIFICATION' ? 'bg-[#fd904c] hover:bg-[#fd904c]/90' : ''}
              >
                <Clock className="h-4 w-4 mr-1" />
                Pending
              </Button>
              <Button 
                variant={status === 'REJECTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('REJECTED')}
                className={status === 'REJECTED' ? 'bg-red-500 hover:bg-red-600' : ''}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Ditolak
              </Button>
            </div>
          </div>

          {/* Materials List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-4">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMaterials.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Tidak ada material {status === 'PENDING_VERIFICATION' ? 'menunggu verifikasi' : 'yang ditolak'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMaterials.map((material) => (
                <Card key={material.id} className="glass-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={material.client.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                              {material.client.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{material.title}</h3>
                              <Badge className={quotationTypeConfig[material.quotationType as keyof typeof quotationTypeConfig]?.className || 'bg-gray-100'}>
                                {quotationTypeConfig[material.quotationType as keyof typeof quotationTypeConfig]?.label || material.quotationType}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {material.description || 'Tidak ada deskripsi'}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {material.client.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {material.quantity} {material.unit}
                              </span>
                              {material.budget && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(material.budget)}
                                </span>
                              )}
                              {material.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {material.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end gap-2">
                        <Badge className={statusConfig[status as keyof typeof statusConfig]?.className}>
                          {statusConfig[status as keyof typeof statusConfig]?.label}
                        </Badge>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            asChild
                          >
                            <Link href={`/dashboard/materials/${material.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Link>
                          </Button>
                          {status === 'PENDING_VERIFICATION' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove('material', material.id)}
                                disabled={isSubmitting}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Setujui
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => {
                                  setSelectedItem({ type: 'material', id: material.id, title: material.title });
                                  setRejectDialogOpen(true);
                                }}
                                disabled={isSubmitting}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Tolak
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600"
                            onClick={() => handleDelete('material', material.id)}
                            disabled={isSubmitting}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak {selectedItem?.type === 'project' ? 'Proyek' : 'Material'}</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menolak "{selectedItem?.title}". Penerima akan diberi tahu dengan alasan penolakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Alasan Penolakan *</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectDialogOpen(false);
              setSelectedItem(null);
              setRejectionReason('');
            }}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isSubmitting || !rejectionReason.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSubmitting ? 'Memproses...' : 'Tolak'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog for Project */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Proyek</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedProject.title}</h3>
                <p className="text-muted-foreground mt-2">{selectedProject.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Klien</p>
                  <p className="font-medium">{selectedProject.client.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedProject.client.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipe</p>
                  <Badge className={projectTypeConfig[selectedProject.type as keyof typeof projectTypeConfig]?.className}>
                    {projectTypeConfig[selectedProject.type as keyof typeof projectTypeConfig]?.label}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p className="font-medium">{selectedProject.category?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-medium">{formatCurrency(selectedProject.budget)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Lokasi</p>
                  <p className="font-medium">{selectedProject.location || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Dibuat</p>
                  <p className="font-medium">{formatDate(selectedProject.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Lamaran</p>
                  <p className="font-medium">{selectedProject._count.applications}</p>
                </div>
              </div>

              {selectedProject.rfq?.items && selectedProject.rfq.items.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Tabel RFQ (Item Pekerjaan)</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-2 font-medium">No</th>
                          <th className="text-left p-2 font-medium">Nama Item</th>
                          <th className="text-left p-2 font-medium">Deskripsi</th>
                          <th className="text-right p-2 font-medium">Jumlah</th>
                          <th className="text-left p-2 font-medium">Satuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProject.rfq.items.map((item, idx) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 font-medium">{item.itemName}</td>
                            <td className="p-2 text-muted-foreground">{item.description || '-'}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review User Verifikasi */}
      <Dialog open={reviewUserOpen} onOpenChange={(open) => { if (!open) setSelectedReviewUser(null); setReviewUserOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Data Verifikasi</DialogTitle>
            <DialogDescription>Data yang akan diverifikasi. Periksa kelengkapan sebelum menyetujui.</DialogDescription>
          </DialogHeader>
          {selectedReviewUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedReviewUser.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-lg">
                    {selectedReviewUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedReviewUser.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedReviewUser.email}</p>
                  <p className="text-sm text-muted-foreground">{selectedReviewUser.phone || '-'}</p>
                  <Badge variant="secondary" className="mt-1">
                    {selectedReviewUser.role === 'VENDOR' ? 'Vendor' : selectedReviewUser.role === 'SUPPLIER' ? 'Supplier' : selectedReviewUser.role === 'TUKANG' ? 'Tukang' : 'Klien'}
                  </Badge>
                </div>
              </div>

              {selectedReviewUser.role === 'VENDOR' && (
                <div className="space-y-3">
                  <p className="font-medium text-sm text-muted-foreground">Tipe: {(selectedReviewUser.verificationEntityType === 'PERORANGAN' ? 'Perorangan' : 'Badan Usaha')}</p>
                  {selectedReviewUser.verificationEntityType === 'PERORANGAN' ? (
                    <>
                      <div className="grid gap-2">
                        <p className="text-sm font-medium">Foto KTP (wajib)</p>
                        {selectedReviewUser.ktpPhoto ? (
                          <a href={selectedReviewUser.ktpPhoto} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Lihat dokumen</a>
                        ) : <span className="text-sm text-amber-600">Belum diupload</span>}
                      </div>
                      {(selectedReviewUser.nibDoc || selectedReviewUser.npwpDoc) && (
                        <div className="flex gap-4 flex-wrap">
                          {selectedReviewUser.nibDoc && <a href={selectedReviewUser.nibDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">NIB</a>}
                          {selectedReviewUser.npwpDoc && <a href={selectedReviewUser.npwpDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">NPWP</a>}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {(selectedReviewUser.picName || selectedReviewUser.picPhone) && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedReviewUser.picName && <><span className="text-muted-foreground">Nama PIC:</span><span>{selectedReviewUser.picName}</span></>}
                          {selectedReviewUser.picPhone && <><span className="text-muted-foreground">WA PIC:</span><span>{selectedReviewUser.picPhone}</span></>}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {selectedReviewUser.picKtpPhoto && <a href={selectedReviewUser.picKtpPhoto} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">KTP PIC</a>}
                        {selectedReviewUser.nibDoc && <a href={selectedReviewUser.nibDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">NIB</a>}
                        {selectedReviewUser.npwpDoc && <a href={selectedReviewUser.npwpDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">NPWP</a>}
                        {selectedReviewUser.aktaPendirianDoc && <a href={selectedReviewUser.aktaPendirianDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Akta Pendirian</a>}
                        {selectedReviewUser.siupDoc && <a href={selectedReviewUser.siupDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">SIUP</a>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedReviewUser.role === 'SUPPLIER' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Nama PIC:</span>
                    <span>{selectedReviewUser.picName || '-'}</span>
                    <span className="text-muted-foreground">WhatsApp PIC:</span>
                    <span>{selectedReviewUser.picPhone || '-'}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">KTP PIC</p>
                    {selectedReviewUser.picKtpPhoto ? (
                      <a href={selectedReviewUser.picKtpPhoto} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Lihat dokumen</a>
                    ) : <span className="text-sm text-amber-600">Belum diupload</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedReviewUser.nibDoc && <a href={selectedReviewUser.nibDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">NIB</a>}
                    {selectedReviewUser.npwpDoc && <a href={selectedReviewUser.npwpDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">NPWP</a>}
                    {selectedReviewUser.aktaPendirianDoc && <a href={selectedReviewUser.aktaPendirianDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Akta</a>}
                    {selectedReviewUser.siupDoc && <a href={selectedReviewUser.siupDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">SIUP</a>}
                  </div>
                </div>
              )}

              {selectedReviewUser.role === 'TUKANG' && (
                <div className="space-y-3">
                  <div className="grid gap-2 text-sm">
                    <div><span className="text-muted-foreground">Pengalaman: </span>{selectedReviewUser.experience != null ? `${selectedReviewUser.experience} tahun` : '-'}</div>
                    {selectedReviewUser.ktpPhoto && <a href={selectedReviewUser.ktpPhoto} target="_blank" rel="noopener noreferrer" className="text-primary underline">Foto KTP</a>}
                    {selectedReviewUser.skckDoc && <a href={selectedReviewUser.skckDoc} target="_blank" rel="noopener noreferrer" className="text-primary underline">SKCK</a>}
                  </div>
                </div>
              )}

              {selectedReviewUser.role === 'CLIENT' && (
                <p className="text-sm text-muted-foreground">Verifikasi manual oleh admin (mis. via WhatsApp).</p>
              )}

              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => { setReviewUserOpen(false); setSelectedReviewUser(null); }}>Tutup</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => { if (selectedReviewUser) { handleVerifyUser(selectedReviewUser.id); setReviewUserOpen(false); setSelectedReviewUser(null); } }} disabled={isSubmitting}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verifikasi
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
