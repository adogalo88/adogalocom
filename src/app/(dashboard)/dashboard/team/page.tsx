'use client';

import { useState, useEffect } from 'react';
import {
  useTeamMembers,
  useProjects,
  useUsers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  formatCurrency,
  formatDate,
  getTukangRoleConfig,
  getSalaryTypeConfig,
  getProjectStatusConfig,
  type TeamMember,
  type Project,
  type User,
} from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Search,
  Users,
  UserCheck,
  UserX,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserMinus,
  FolderKanban,
  Calendar,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

// Tukang Role Options
const TUKANG_ROLES = [
  { value: 'TUKANG_BATU', label: 'Tukang Batu' },
  { value: 'TUKANG_KAYU', label: 'Tukang Kayu' },
  { value: 'TUKANG_BESI', label: 'Tukang Besi' },
  { value: 'TUKANG_LISTRIK', label: 'Tukang Listrik' },
  { value: 'TUKANG_PLOMBON', label: 'Tukang Plambon' },
  { value: 'TUKANG_CAT', label: 'Tukang Cat' },
  { value: 'MANDOR', label: 'Mandor' },
  { value: 'PEKERJA_LEPAS', label: 'Pekerja Lepas' },
];

// Salary Type Options
const SALARY_TYPES = [
  { value: 'HOURLY', label: 'Per Jam' },
  { value: 'DAILY', label: 'Per Hari' },
  { value: 'WEEKLY', label: 'Per Minggu' },
  { value: 'MONTHLY', label: 'Per Bulan' },
  { value: 'FIXED', label: 'Fix' },
];

export default function TeamPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    projectId: '',
    userId: '',
    role: '',
    salaryType: '',
    salaryAmount: '',
    startDate: '',
    endDate: '',
  });
  const [tukangSearch, setTukangSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch team members
  const { data, isLoading, error, refetch } = useTeamMembers();

  // Fetch projects (only IN_PROGRESS for add dialog)
  const { data: projectsData } = useProjects({ status: 'IN_PROGRESS' });

  // Fetch tukang users for add dialog
  const { data: tukangData, refetch: refetchTukang } = useUsers({
    role: 'TUKANG',
    search: tukangSearch || undefined,
    status: 'ACTIVE',
  });

  // Mutations
  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember(selectedMember?.id || '');
  const deleteMutation = useDeleteTeamMember(selectedMember?.id || '');

  const teamMembers = data?.data || [];
  const projects = projectsData?.data || [];
  const tukangs = tukangData?.data || [];

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      !search ||
      member.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      member.project?.title.toLowerCase().includes(search.toLowerCase());

    const matchesProject = !projectFilter || projectFilter === 'all' || member.projectId === projectFilter;
    const matchesStatus = !statusFilter || statusFilter === 'all' ||
      (statusFilter === 'active' && member.isActive) ||
      (statusFilter === 'inactive' && !member.isActive);

    return matchesSearch && matchesProject && matchesStatus;
  });

  // Stats
  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter((m) => m.isActive).length,
    inactive: teamMembers.filter((m) => !m.isActive).length,
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      projectId: '',
      userId: '',
      role: '',
      salaryType: '',
      salaryAmount: '',
      startDate: '',
      endDate: '',
    });
    setTukangSearch('');
  };

  // Open add dialog
  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEditDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setFormData({
      projectId: member.projectId,
      userId: member.userId,
      role: member.role,
      salaryType: member.salaryType,
      salaryAmount: member.salaryAmount.toString(),
      startDate: member.startDate ? new Date(member.startDate).toISOString().split('T')[0] : '',
      endDate: member.endDate ? new Date(member.endDate).toISOString().split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const handleOpenDeleteDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  // Handle add team member
  const handleAddMember = async () => {
    if (!formData.projectId || !formData.userId || !formData.role || !formData.salaryType || !formData.salaryAmount) {
      toast.error('Mohon lengkapi semua field wajib');
      return;
    }

    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        projectId: formData.projectId,
        userId: formData.userId,
        role: formData.role,
        salaryType: formData.salaryType,
        salaryAmount: parseFloat(formData.salaryAmount),
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      });
      toast.success('Anggota tim berhasil ditambahkan');
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menambahkan anggota tim');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit team member
  const handleEditMember = async () => {
    if (!selectedMember) return;

    if (!formData.role || !formData.salaryType || !formData.salaryAmount) {
      toast.error('Mohon lengkapi semua field wajib');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({
        role: formData.role,
        salaryType: formData.salaryType,
        salaryAmount: parseFloat(formData.salaryAmount),
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      });
      toast.success('Data anggota tim berhasil diperbarui');
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      resetForm();
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui data anggota tim');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deactivate team member
  const handleDeactivateMember = async (member: TeamMember) => {
    try {
      await fetch(`/api/team-members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      toast.success('Anggota tim berhasil dinonaktifkan');
      refetch();
    } catch (error) {
      toast.error('Gagal menonaktifkan anggota tim');
    }
  };

  // Handle reactivate team member
  const handleReactivateMember = async (member: TeamMember) => {
    try {
      await fetch(`/api/team-members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      toast.success('Anggota tim berhasil diaktifkan kembali');
      refetch();
    } catch (error) {
      toast.error('Gagal mengaktifkan anggota tim');
    }
  };

  // Handle delete team member
  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    try {
      await deleteMutation.mutateAsync();
      toast.success('Anggota tim berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus anggota tim');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user can manage team
  const canManageTeam = user?.role === 'CLIENT' || user?.role === 'VENDOR' || user?.role === 'ADMIN';

  // Get page description based on role
  const getPageDescription = () => {
    switch (user?.role) {
      case 'CLIENT':
        return 'Kelola anggota tim proyek Anda';
      case 'VENDOR':
        return 'Kelola anggota tim proyek yang Anda kelola';
      case 'TUKANG':
        return 'Lihat keanggotaan tim Anda';
      default:
        return 'Kelola semua anggota tim';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Anggota Tim</h1>
          <p className="text-muted-foreground">{getPageDescription()}</p>
        </div>
        {canManageTeam && (
          <Button
            onClick={handleOpenAddDialog}
            className="bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Anggota
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#fd904c]/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#fd904c]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Anggota</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <UserX className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Tidak Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau proyek..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Proyek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Proyek</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Gagal memuat data anggota tim</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tidak ada anggota tim ditemukan</p>
              {canManageTeam && teamMembers.length === 0 && (
                <Button onClick={handleOpenAddDialog} className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Anggota Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Proyek</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Tipe Gaji</TableHead>
                    <TableHead>Jumlah Gaji</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageTeam && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.user?.avatar || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                              {member.user?.name?.charAt(0).toUpperCase() || 'T'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.user?.name || 'Unknown'}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{member.user?.rating?.toFixed(1) || '0.0'}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium truncate max-w-32">{member.project?.title || 'Unknown'}</p>
                            <Badge className={getProjectStatusConfig(member.project?.status || 'DRAFT').className + ' text-xs'}>
                              {getProjectStatusConfig(member.project?.status || 'DRAFT').label}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#fd904c] text-[#fd904c]">
                          {getTukangRoleConfig(member.role).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getSalaryTypeConfig(member.salaryType).label}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-[#fd904c]">
                          {formatCurrency(member.salaryAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            member.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }
                        >
                          {member.isActive ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </TableCell>
                      {canManageTeam && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(member)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {member.isActive ? (
                                <DropdownMenuItem onClick={() => handleDeactivateMember(member)}>
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Nonaktifkan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleReactivateMember(member)}>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Aktifkan
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleOpenDeleteDialog(member)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Team Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg glass-card">
          <DialogHeader>
            <DialogTitle>Tambah Anggota Tim</DialogTitle>
            <DialogDescription>
              Tambahkan tukang ke proyek yang sedang berjalan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project">Proyek *</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Pilih proyek" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span>{project.title}</span>
                        <Badge className={getProjectStatusConfig(project.status).className + ' text-xs'}>
                          {getProjectStatusConfig(project.status).label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Tidak ada proyek yang sedang berjalan
                </p>
              )}
            </div>

            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="tukang">Pekerja (Tukang) *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama tukang..."
                  value={tukangSearch}
                  onChange={(e) => setTukangSearch(e.target.value)}
                  className="pl-10 mb-2"
                />
              </div>
              <Select
                value={formData.userId}
                onValueChange={(value) => setFormData({ ...formData, userId: value })}
              >
                <SelectTrigger id="tukang">
                  <SelectValue placeholder="Pilih tukang" />
                </SelectTrigger>
                <SelectContent>
                  {tukangs
                    .filter((t) => t.isVerified && t.status === 'ACTIVE')
                    .map((tukang) => (
                      <SelectItem key={tukang.id} value={tukang.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={tukang.avatar || undefined} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                              {tukang.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p>{tukang.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{tukang.rating.toFixed(1)}</span>
                              {tukang.specialty && (
                                <>
                                  <span>•</span>
                                  <span>{tukang.specialty}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Peran *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  {TUKANG_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Type */}
            <div className="space-y-2">
              <Label htmlFor="salaryType">Tipe Gaji *</Label>
              <Select
                value={formData.salaryType}
                onValueChange={(value) => setFormData({ ...formData, salaryType: value })}
              >
                <SelectTrigger id="salaryType">
                  <SelectValue placeholder="Pilih tipe gaji" />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Amount */}
            <div className="space-y-2">
              <Label htmlFor="salaryAmount">Jumlah Gaji (Rp) *</Label>
              <Input
                id="salaryAmount"
                type="number"
                placeholder="Contoh: 150000"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Tanggal Selesai</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tambah Anggota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg glass-card">
          <DialogHeader>
            <DialogTitle>Edit Anggota Tim</DialogTitle>
            <DialogDescription>
              Perbarui data anggota tim untuk {selectedMember?.user?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Project (Read Only) */}
            <div className="space-y-2">
              <Label>Proyek</Label>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span>{selectedMember?.project?.title}</span>
              </div>
            </div>

            {/* User (Read Only) */}
            <div className="space-y-2">
              <Label>Pekerja</Label>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedMember?.user?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                    {selectedMember?.user?.name?.charAt(0) || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedMember?.user?.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{selectedMember?.user?.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="edit-role">Peran *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  {TUKANG_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Type */}
            <div className="space-y-2">
              <Label htmlFor="edit-salaryType">Tipe Gaji *</Label>
              <Select
                value={formData.salaryType}
                onValueChange={(value) => setFormData({ ...formData, salaryType: value })}
              >
                <SelectTrigger id="edit-salaryType">
                  <SelectValue placeholder="Pilih tipe gaji" />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Amount */}
            <div className="space-y-2">
              <Label htmlFor="edit-salaryAmount">Jumlah Gaji (Rp) *</Label>
              <Input
                id="edit-salaryAmount"
                type="number"
                placeholder="Contoh: 150000"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Tanggal Mulai</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">Tanggal Selesai</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleEditMember}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Anggota Tim</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus{' '}
              <strong>{selectedMember?.user?.name}</strong> dari tim proyek{' '}
              <strong>{selectedMember?.project?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
