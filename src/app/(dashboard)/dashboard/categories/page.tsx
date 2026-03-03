'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  formatDate,
} from '@/hooks/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  description: '',
  icon: '',
};

export default function CategoriesPage() {
  const { user: currentUser } = useAuth();
  
  // State
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);

  // Queries and mutations
  const { data, isLoading, error, refetch } = useCategories({ search, limit: 100 });
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory(editingCategory || '');
  const deleteMutation = useDeleteCategory(deletingCategory || '');

  const categories = data?.data || [];

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (category: { id: string; name: string; description: string | null; icon: string | null }) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
    });
    setEditingCategory(category.id);
    setDialogOpen(true);
  };

  const handleOpenDelete = (categoryId: string) => {
    setDeletingCategory(categoryId);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon || null,
        });
        toast.success('Kategori berhasil diperbarui');
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon || undefined,
        });
        toast.success('Kategori berhasil dibuat');
      }
      setDialogOpen(false);
      setFormData(initialFormData);
      setEditingCategory(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan kategori');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success('Kategori berhasil dihapus');
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus kategori');
    }
  };

  // Redirect if not admin
  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Akses Ditolak</h2>
            <p className="text-muted-foreground mt-2">
              Anda tidak memiliki akses ke halaman ini. Hanya admin yang dapat mengelola kategori.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Manajemen Kategori</h1>
          <p className="text-muted-foreground mt-1">Kelola kategori proyek untuk platform</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 bg-gradient-to-r from-[#fd904c] to-[#e57835]">
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kategori..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} variant="outline">
              Cari
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-16" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Gagal memuat data kategori</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-6 text-center">
            <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {search ? 'Tidak ada kategori yang cocok dengan pencarian' : 'Belum ada kategori'}
            </p>
            {!search && (
              <Button onClick={handleOpenCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Tambah Kategori Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="glass-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#fd904c]/20 to-[#e57835]/20 flex items-center justify-center">
                      <FolderTree className="h-5 w-5 text-[#fd904c]" />
                    </div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                </div>
                {category.description && (
                  <CardDescription className="mt-2 line-clamp-2">
                    {category.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {category.projectCount} proyek
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(category.id)}
                      disabled={category.projectCount > 0}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Dibuat: {formatDate(category.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Perbarui informasi kategori proyek'
                : 'Buat kategori baru untuk mengkategorikan proyek'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Kategori *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Renovasi Rumah"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat tentang kategori ini..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Ikon (Opsional)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Contoh: home, building, tool"
              />
              <p className="text-xs text-muted-foreground">
                Nama ikon dari Lucide icons (misal: home, building, wrench)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Menyimpan...'
                : editingCategory
                  ? 'Simpan Perubahan'
                  : 'Tambah Kategori'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Kategori akan dihapus secara permanen dari sistem.
              <br /><br />
              <span className="text-yellow-600 font-medium">
                Catatan: Kategori yang memiliki proyek terkait tidak dapat dihapus.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus Kategori'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Card */}
      <Card className="glass-card bg-gradient-to-r from-[#fd904c]/5 to-[#e57835]/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-[#fd904c]/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-[#fd904c]" />
            </div>
            <div>
              <h3 className="font-semibold">Tips Pengelolaan Kategori</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Gunakan nama kategori yang jelas dan mudah dipahami pengguna</li>
                <li>• Deskripsi membantu pengguna memilih kategori yang tepat</li>
                <li>• Kategori dengan proyek tidak dapat dihapus untuk menjaga integritas data</li>
                <li>• Anda dapat mengubah nama kategori kapan saja tanpa mempengaruhi proyek yang ada</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
