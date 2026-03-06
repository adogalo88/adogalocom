'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { useProject, useUpdateProject } from '@/hooks/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const schema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter'),
  description: z.string().min(20, 'Deskripsi minimal 20 karakter'),
  status: z.enum(['DRAFT', 'PENDING_VERIFICATION', 'PUBLISHED', 'EXPIRED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED']),
  budget: z.number().min(0).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_VERIFICATION: 'Menunggu peninjauan',
  PUBLISHED: 'Dipublikasi',
  EXPIRED: 'Kadaluarsa',
  IN_PROGRESS: 'Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  REJECTED: 'Ditolak',
};

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const id = params?.id as string;
  const { data, isLoading, isError } = useProject(id);
  const updateProject = useUpdateProject(id);

  const project = data?.project;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      status: 'DRAFT',
      budget: null,
    },
  });

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (project) {
      setValue('title', project.title);
      setValue('description', project.description);
      setValue('status', project.status as FormValues['status']);
      setValue('budget', project.budget ?? null);
    }
  }, [project, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProject.mutateAsync({
        title: values.title,
        description: values.description,
        status: values.status,
        budget: values.budget ?? undefined,
      });
      toast.success('Proyek berhasil diperbarui');
      router.push(`/dashboard/projects/${id}`);
    } catch {
      toast.error('Gagal memperbarui proyek');
    }
  };

  if (authLoading || !user || user.role !== 'ADMIN') return null;
  if (isError || (!isLoading && !project)) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-12">
        <p className="text-muted-foreground">Proyek tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Button asChild>
          <Link href="/dashboard/projects">Kembali ke Daftar Proyek</Link>
        </Button>
      </div>
    );
  }
  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Proyek (Admin)</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Proyek</CardTitle>
            <CardDescription>Ubah judul, deskripsi, status, atau budget.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Judul *</Label>
              <Input {...register('title')} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Deskripsi *</Label>
              <Textarea {...register('description')} rows={5} />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as FormValues['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget (Rp)</Label>
              <Input
                type="number"
                {...register('budget', { valueAsNumber: true })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/projects/${id}`}>Batal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
