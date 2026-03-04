'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MaterialCategoryItem {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  children: { id: string; name: string; description: string | null; sortOrder: number }[];
}

export default function MaterialCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<MaterialCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [parentId, setParentId] = useState<string>('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (e) {
      toast.error('Gagal memuat kategori material');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'ADMIN') return;
    fetchCategories();
  }, [user]);

  const openCreateParent = () => {
    setIsSubcategory(false);
    setParentId('');
    setFormName('');
    setFormDescription('');
    setDialogOpen(true);
  };

  const openCreateSub = (parentIdVal: string) => {
    setIsSubcategory(true);
    setParentId(parentIdVal);
    setFormName('');
    setFormDescription('');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/material-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          parentId: isSubcategory ? parentId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Gagal menyimpan');
        return;
      }
      toast.success('Kategori berhasil disimpan');
      setDialogOpen(false);
      fetchCategories();
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Akses Ditolak</h2>
            <p className="text-muted-foreground mt-2">Hanya admin yang dapat mengelola kategori material.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Kategori Material</h1>
          <p className="text-muted-foreground mt-1">Kelola kategori dan subkategori untuk form permintaan material</p>
        </div>
        <Button onClick={openCreateParent} className="gap-2 bg-gradient-to-r from-[#fd904c] to-[#e57835]">
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {loading ? (
        <Card className="glass-card">
          <CardContent className="pt-6">Memuat...</CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-6 text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Belum ada kategori. Tambah kategori agar muncul di form permintaan material.</p>
            <Button onClick={openCreateParent} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Tambah Kategori
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((parent) => (
            <Card key={parent.id} className="glass-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{parent.name}</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => openCreateSub(parent.id)} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Subkategori
                  </Button>
                </div>
                {parent.description && (
                  <CardDescription>{parent.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {parent.children?.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {parent.children.map((child) => (
                      <li key={child.id}>{child.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada subkategori</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isSubcategory ? 'Tambah Subkategori' : 'Tambah Kategori'}</DialogTitle>
            <DialogDescription>
              {isSubcategory ? 'Subkategori akan muncul di bawah kategori induk di form permintaan material.' : 'Kategori induk dapat memiliki subkategori.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSubcategory && (
              <div className="space-y-2">
                <Label>Kategori induk</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nama *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={isSubcategory ? 'Nama subkategori' : 'Nama kategori'}
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi (opsional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi singkat"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
