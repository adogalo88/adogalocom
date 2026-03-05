'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Wrench, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Skill {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  _count?: { users: number; projects: number };
}

export default function SkillsPage() {
  const { user: currentUser } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', sortOrder: 0 });

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      if (data.success && Array.isArray(data.skills)) setSkills(data.skills);
      else setSkills([]);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleOpenCreate = () => {
    setFormData({ name: '', description: '', sortOrder: skills.length });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (skill: Skill) => {
    setFormData({
      name: skill.name,
      description: skill.description || '',
      sortOrder: skill.sortOrder,
    });
    setEditingId(skill.id);
    setDialogOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nama keahlian wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/skills/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            sortOrder: formData.sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui');
        toast.success('Keahlian berhasil diperbarui');
      } else {
        const res = await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            sortOrder: formData.sortOrder,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal membuat');
        toast.success('Keahlian berhasil dibuat');
      }
      setDialogOpen(false);
      fetchSkills();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/skills/${deletingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');
      toast.success('Keahlian berhasil dihapus');
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchSkills();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus');
    }
  };

  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Akses Ditolak</h2>
            <p className="text-muted-foreground mt-2">
              Hanya admin yang dapat mengelola keahlian tukang.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Keahlian Tukang</h1>
          <p className="text-muted-foreground mt-1">Kelola skill/keahlian untuk proyek harian dan direktori tukang</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600">
          <Plus className="h-4 w-4" />
          Tambah Keahlian
        </Button>
      </div>

      {loading ? (
        <Card className="glass-card">
          <CardContent className="pt-6">Memuat...</CardContent>
        </Card>
      ) : skills.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-6 text-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Belum ada keahlian. Tambah keahlian untuk dipilih tukang dan proyek harian.</p>
            <Button onClick={handleOpenCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Tambah Keahlian Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="divide-y">
              {skills.map((skill) => {
                const userCount = skill._count?.users ?? 0;
                const projectCount = skill._count?.projects ?? 0;
                return (
                  <div
                    key={skill.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Wrench className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{skill.name}</p>
                        {skill.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-md">{skill.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {userCount} tukang · {projectCount} proyek
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(skill)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDelete(skill.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Keahlian' : 'Tambah Keahlian Baru'}</DialogTitle>
            <DialogDescription>
              Keahlian ini akan muncul di pengaturan tukang, form proyek harian, dan direktori tukang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Nama Keahlian *</Label>
              <Input
                id="skill-name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Contoh: Tukang Batu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-desc">Deskripsi (opsional)</Label>
              <Textarea
                id="skill-desc"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Deskripsi singkat"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-order">Urutan</Label>
              <Input
                id="skill-order"
                type="number"
                min={0}
                value={formData.sortOrder}
                onChange={(e) => setFormData((p) => ({ ...p, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus keahlian?</AlertDialogTitle>
            <AlertDialogDescription>
              Keahlian akan dihapus dari daftar. Tukang dan proyek yang memakai keahlian ini tidak akan terpengaruh (hanya relasi yang dihapus).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
