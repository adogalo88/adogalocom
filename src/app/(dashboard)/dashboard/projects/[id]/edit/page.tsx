'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { useProject, useUpdateProject, useCategories } from '@/hooks/api';
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
  type: z.enum(['TENDER', 'HARIAN']),
  tenderSubtype: z.enum(['WITH_RFQ', 'WITHOUT_RFQ']).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  workerNeeded: z.number().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  offerDeadline: z.string().optional().nullable(),
  applicationDeadline: z.string().optional().nullable(),
  minSalary: z.number().min(0).optional().nullable(),
  maxSalary: z.number().min(0).optional().nullable(),
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
  const { data: categoriesData } = useCategories();
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');

  const project = data?.project;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      status: 'DRAFT',
      budget: null,
      type: 'TENDER',
      tenderSubtype: null,
      categoryId: null,
      cityId: null,
      location: null,
      address: null,
      requirements: null,
      workerNeeded: null,
      startDate: null,
      endDate: null,
      offerDeadline: null,
      applicationDeadline: null,
      minSalary: null,
      maxSalary: null,
    },
  });

  const projectType = watch('type');

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setProvinces(d.data));
    fetch('/api/cities?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setCities(d.data));
  }, []);

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
      setValue('type', (project.type as 'TENDER' | 'HARIAN') ?? 'TENDER');
      setValue('tenderSubtype', (project as { tenderSubtype?: string }).tenderSubtype ?? null);
      setValue('categoryId', project.categoryId ?? project.category?.id ?? null);
      const cityId = (project as { cityId?: string }).cityId ?? (project as { city?: { id: string } }).city?.id ?? null;
      setValue('cityId', cityId);
      setValue('location', project.location ?? null);
      setValue('address', (project as { address?: string }).address ?? null);
      setValue('requirements', project.requirements ?? null);
      setValue('workerNeeded', project.workerNeeded ?? null);
      const city = (project as { city?: { provinceId?: string; province?: { id: string } } }).city;
      if (city?.provinceId || city?.province?.id) setSelectedProvinceId(city.provinceId ?? city.province?.id ?? '');
      if (project.startDate) setValue('startDate', new Date(project.startDate).toISOString().slice(0, 16));
      if (project.endDate) setValue('endDate', new Date(project.endDate).toISOString().slice(0, 10));
      if ((project as { offerDeadline?: string }).offerDeadline) setValue('offerDeadline', new Date((project as { offerDeadline: string }).offerDeadline).toISOString().slice(0, 16));
      if ((project as { applicationDeadline?: string }).applicationDeadline) setValue('applicationDeadline', new Date((project as { applicationDeadline: string }).applicationDeadline).toISOString().slice(0, 16));
      setValue('minSalary', (project as { minSalary?: number }).minSalary ?? null);
      setValue('maxSalary', (project as { maxSalary?: number }).maxSalary ?? null);
    }
  }, [project, setValue]);

  const citiesByProvince = selectedProvinceId ? cities.filter((c) => c.provinceId === selectedProvinceId) : cities;

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProject.mutateAsync({
        title: values.title,
        description: values.description,
        status: values.status,
        budget: values.budget ?? undefined,
        type: values.type,
        tenderSubtype: values.tenderSubtype ?? undefined,
        categoryId: values.categoryId ?? undefined,
        cityId: values.cityId ?? undefined,
        location: values.location ?? undefined,
        address: values.address ?? undefined,
        requirements: values.requirements ?? undefined,
        workerNeeded: values.workerNeeded ?? undefined,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        offerDeadline: values.offerDeadline ? new Date(values.offerDeadline).toISOString() : undefined,
        applicationDeadline: values.applicationDeadline ? new Date(values.applicationDeadline).toISOString() : undefined,
        minSalary: values.minSalary ?? undefined,
        maxSalary: values.maxSalary ?? undefined,
      });
      toast.success('Proyek berhasil diperbarui. Client akan mendapat notifikasi.');
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
            <CardDescription>Edit semua field sesuai form posting proyek. Client akan dapat notifikasi setelah disimpan.</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe Proyek</Label>
                <Select value={watch('type')} onValueChange={(v) => setValue('type', v as 'TENDER' | 'HARIAN')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TENDER">Tender (Kontrak)</SelectItem>
                    <SelectItem value="HARIAN">Harian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {projectType === 'TENDER' && (
                <div className="space-y-2">
                  <Label>Subtipe Tender</Label>
                  <Select value={watch('tenderSubtype') ?? ''} onValueChange={(v) => setValue('tenderSubtype', v as 'WITH_RFQ' | 'WITHOUT_RFQ')}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WITHOUT_RFQ">Tanpa RFQ</SelectItem>
                      <SelectItem value="WITH_RFQ">Dengan RFQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={watch('categoryId') ?? ''} onValueChange={(v) => setValue('categoryId', v || null)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {categoriesData?.categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provinsi</Label>
                <Select value={selectedProvinceId} onValueChange={(v) => { setSelectedProvinceId(v); setValue('cityId', null); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kota / Kabupaten</Label>
                <Select value={watch('cityId') ?? ''} onValueChange={(v) => setValue('cityId', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Pilih kota" /></SelectTrigger>
                  <SelectContent>
                    {citiesByProvince.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lokasi (teks)</Label>
              <Input {...register('location')} placeholder="Contoh: Jakarta Selatan" />
            </div>
            <div className="space-y-2">
              <Label>Alamat lengkap</Label>
              <Input {...register('address')} placeholder="Jalan, RT/RW, kelurahan" />
            </div>
            <div className="space-y-2">
              <Label>Persyaratan / Requirements</Label>
              <Textarea {...register('requirements')} rows={3} placeholder="Persyaratan tambahan" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as FormValues['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget (Rp)</Label>
              <Input type="number" {...register('budget', { valueAsNumber: true })} />
            </div>
            {projectType === 'TENDER' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batas akhir penawaran</Label>
                  <Input type="datetime-local" {...register('offerDeadline')} />
                </div>
              </div>
            )}
            {projectType === 'HARIAN' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jumlah pekerja dibutuhkan</Label>
                    <Input type="number" {...register('workerNeeded', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Batas akhir lamaran</Label>
                    <Input type="datetime-local" {...register('applicationDeadline')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gaji minimum (Rp)</Label>
                    <Input type="number" {...register('minSalary', { valueAsNumber: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gaji maksimum (Rp)</Label>
                    <Input type="number" {...register('maxSalary', { valueAsNumber: true })} />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal mulai</Label>
                <Input type="date" {...register('startDate')} />
              </div>
              <div className="space-y-2">
                <Label>Target selesai</Label>
                <Input type="date" {...register('endDate')} />
              </div>
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
