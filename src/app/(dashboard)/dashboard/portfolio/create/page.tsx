'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreatePortfolio, useProjects } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Plus, 
  X, 
  Image as ImageIcon, 
  Upload,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { getProjectStatusConfig } from '@/hooks/api';

// Accept full URLs or paths (e.g. /uploads/...)
const imageUrlSchema = z.string().min(1, 'URL/path gambar tidak valid').refine(
  (s) => s.startsWith('/') || s.startsWith('http://') || s.startsWith('https://'),
  { message: 'URL atau path gambar tidak valid' }
);
const portfolioSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200, 'Judul maksimal 200 karakter'),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter').max(2000, 'Deskripsi maksimal 2000 karakter'),
  images: z.array(imageUrlSchema).min(1, 'Minimal 1 gambar diperlukan'),
  projectId: z.string().optional(),
  completedYear: z.number().int().min(1990).max(new Date().getFullYear() + 1).optional().nullable(),
  cityId: z.string().optional().nullable(),
});

type PortfolioForm = z.infer<typeof portfolioSchema>;

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGES = 10;

export default function CreatePortfolioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createPortfolio = useCreatePortfolio();
  
  // Get completed projects where user was involved
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ 
    status: 'COMPLETED' 
  });
  
  const projects = projectsData?.data || [];

  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetch('/api/cities?activeOnly=true')
      .then((r) => r.json())
      .then((d) => setCities(Array.isArray(d?.data) ? d.data : []))
      .catch(() => setCities([]));
  }, []);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 35 }, (_, i) => currentYear - i);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<PortfolioForm>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      title: '',
      description: '',
      images: [],
      completedYear: null,
      cityId: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'images',
  });

  const images = watch('images');

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Maksimal ${MAX_IMAGES} gambar`);
      return;
    }
    setUploadingImages(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      if (ACCEPTED_IMAGE_TYPES.includes(file.type)) formData.append('photos', file);
    });
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' });
      const result = await res.json();
      const urls = result?.data?.urls ?? [...(result?.data?.photos ?? []), ...(result?.data?.files ?? [])];
      if (result.success && urls.length > 0) {
        urls.forEach((url: string) => append(url));
        toast.success(`${urls.length} gambar berhasil diunggah`);
      } else {
        toast.error(result?.error || 'Gagal mengunggah gambar');
      }
    } catch {
      toast.error('Gagal mengunggah gambar');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
      fileInputRef.current?.value && (fileInputRef.current.value = '');
    }
  };

  const removeImage = (index: number) => {
    remove(index);
  };

  const onSubmit = async (data: PortfolioForm) => {
    setIsSubmitting(true);
    try {
      const result = await createPortfolio.mutateAsync({
        title: data.title,
        description: data.description,
        images: data.images,
        projectId: data.projectId || undefined,
        completedYear: data.completedYear ?? undefined,
        cityId: data.cityId || undefined,
      });
      
      toast.success('Portofolio berhasil dibuat!');
      router.push('/dashboard/portfolio');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat portofolio');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check user role
  if (user?.role !== 'TUKANG' && user?.role !== 'VENDOR') {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Hanya tukang atau vendor yang dapat membuat portofolio
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Portofolio Baru</h1>
        <p className="text-muted-foreground">
          Tunjukkan karya terbaik Anda kepada calon klien
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Detail Portofolio</CardTitle>
          <CardDescription>
            Isi informasi lengkap tentang karya atau proyek yang telah Anda selesaikan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Judul Karya *</Label>
              <Input
                id="title"
                placeholder="Contoh: Renovasi Dapur Minimalis"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi *</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan detail karya Anda, seperti ruang lingkup pekerjaan, material yang digunakan, tantangan yang dihadapi, dll."
                rows={5}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Images - Upload */}
            <div className="space-y-2">
              <Label>Foto Karya *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Unggah foto karya Anda (JPG, PNG, GIF, WebP). Minimal 1 gambar, maksimal 10 gambar.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={handleUploadImages}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages || images.length >= MAX_IMAGES}
              >
                {uploadingImages ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Unggah Foto
                  </>
                )}
              </Button>
              {images.length > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {images.length} / {MAX_IMAGES} gambar
                </span>
              )}
              
              {errors.images && (
                <p className="text-sm text-red-500">{errors.images.message}</p>
              )}

              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {images.map((url, index) => (
                    <div
                      key={index}
                      className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewImage(url)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {images.length === 0 && !uploadingImages && (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Belum ada gambar. Klik atau unggah foto
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF, WebP — maks. 10 gambar
                  </p>
                </div>
              )}
            </div>

            {/* Tahun Selesai & Kota */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tahun Selesai (Opsional)</Label>
                <Select
                  value={watch('completedYear') != null && watch('completedYear') !== undefined ? String(watch('completedYear')) : '__none__'}
                  onValueChange={(v) => setValue('completedYear', v === '__none__' ? null : parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kota (Opsional)</Label>
                <Select
                  value={watch('cityId') && watch('cityId') !== '' ? watch('cityId')! : '__none__'}
                  onValueChange={(v) => setValue('cityId', v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {(cities || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Link to Project (Optional) */}
            <div className="space-y-2">
              <Label>Tautkan ke Proyek (Opsional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Tautkan portofolio ini ke proyek yang telah Anda selesaikan di platform
              </p>
              
              {projectsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : projects.length === 0 ? (
                <div className="border rounded-lg p-4 text-center text-muted-foreground text-sm">
                  Tidak ada proyek selesai yang dapat ditautkan
                </div>
              ) : (
                <Select
                  value={watch('projectId')}
                  onValueChange={(value) => setValue('projectId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih proyek (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => {
                      const statusConfig = getProjectStatusConfig(project.status);
                      return (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <span>{project.title}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#fd904c] to-[#e57835] flex-1"
                disabled={isSubmitting || images.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Portofolio'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Gambar</DialogTitle>
            <DialogDescription>Pratinjau gambar portofolio</DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full">
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto max-h-[70vh] object-contain bg-muted"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => window.open(previewImage, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Buka
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
