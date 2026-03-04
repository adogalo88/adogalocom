'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, X, Image as ImageIcon, FileText, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import NextImage from 'next/image';

// Form schema
const rfqItemSchema = z.object({
  itemName: z.string().min(1, 'Nama item harus diisi'),
  description: z.string().optional(),
  quantity: z.number().min(0.1, 'Jumlah minimal 0.1'),
  unit: z.string().min(1, 'Satuan harus diisi'),
  photo: z.string().optional(), // URL foto
});

const materialSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  description: z.string().optional(),
  quotationType: z.enum(['SIMPLE', 'RFQ', 'PDF']),
  quantity: z.number().min(1, 'Jumlah minimal 1').optional(),
  unit: z.string().optional(),
  budget: z.number().min(0).optional(),
  location: z.string().optional(),
  cityId: z.string().optional(),
  address: z.string().max(500).optional(),
  deadline: z.string().optional(),
  projectId: z.string().optional(),
  rfqItems: z.array(rfqItemSchema).optional(),
  pdfFile: z.string().optional(),
});

type MaterialForm = z.infer<typeof materialSchema>;

interface UploadedFile {
  url: string;
  name: string;
}

const unitOptions = [
  'buah', 'sak', 'kg', 'ton', 'meter', 'm²', 'm³', 'liter', 'set', 'unit', 'ls', 'roll', 'lembar', 'batang'
];

export default function CreateMaterialPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const [pdfFile, setPdfFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const itemPhotoInputRef = useRef<HTMLInputElement>(null);

  const isVendor = user?.role === 'VENDOR';
  const isClient = user?.role === 'CLIENT';

  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setProvinces(d.data));
    fetch('/api/cities?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setCities(d.data));
  }, []);
  const citiesByProvince = selectedProvinceId ? cities.filter((c) => c.provinceId === selectedProvinceId) : cities;

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<MaterialForm>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      quotationType: 'SIMPLE',
      rfqItems: [{ itemName: '', description: '', quantity: 1, unit: 'buah' }],
    },
  });

  const quotationType = watch('quotationType');

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rfqItems' as never,
  });

  // Handle file upload
  const handleUpload = async (filesToUpload: FileList, type: 'photos' | 'files') => {
    if (!filesToUpload || filesToUpload.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();

    Array.from(filesToUpload).forEach((file) => {
      formData.append(type, file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        if (type === 'photos') {
          const newPhotos = result.data.photos.map((url: string) => ({
            url,
            name: url.split('/').pop() || 'photo',
          }));
          setPhotos((prev) => [...prev, ...newPhotos]);
        } else {
          // For PDF, only take the first file
          const newFile = result.data.files[0];
          if (newFile) {
            setPdfFile({
              url: newFile,
              name: newFile.split('/').pop() || 'file',
            });
            setValue('pdfFile', newFile);
          }
        }

        if (result.data.errors.length > 0) {
          toast.warning(result.data.errors.join(', '));
        }
      } else {
        toast.error(result.error || 'Gagal mengupload file');
      }
    } catch (error) {
      toast.error('Gagal mengupload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle item photo upload
  const handleItemPhotoUpload = async (filesToUpload: FileList, index: number) => {
    if (!filesToUpload || filesToUpload.length === 0) return;

    setUploadingItemIndex(index);
    const formData = new FormData();
    formData.append('photos', filesToUpload[0]);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data.photos[0]) {
        const rfqItems = watch('rfqItems') || [];
        const updatedItems = [...rfqItems];
        updatedItems[index] = { ...updatedItems[index], photo: result.data.photos[0] };
        setValue('rfqItems', updatedItems);
        toast.success('Foto berhasil diupload');
      } else {
        toast.error(result.error || 'Gagal mengupload foto');
      }
    } catch (error) {
      toast.error('Gagal mengupload foto');
    } finally {
      setUploadingItemIndex(null);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removePdfFile = () => {
    setPdfFile(null);
    setValue('pdfFile', undefined);
  };

  const removeItemPhoto = (index: number) => {
    const rfqItems = watch('rfqItems') || [];
    const updatedItems = [...rfqItems];
    updatedItems[index] = { ...updatedItems[index], photo: undefined };
    setValue('rfqItems', updatedItems);
  };

  const addRfqItem = () => {
    append({ itemName: '', description: '', quantity: 1, unit: 'buah' });
  };

  const onSubmit = async (data: MaterialForm) => {
    // Validation
    if (data.quotationType === 'SIMPLE') {
      if (!data.quantity || !data.unit) {
        toast.error('Jumlah dan satuan harus diisi untuk tipe sederhana');
        return;
      }
    }

    if (data.quotationType === 'RFQ') {
      if (!data.rfqItems || data.rfqItems.length === 0) {
        toast.error('Minimal 1 item RFQ harus diisi');
        return;
      }
      if (data.rfqItems.some(item => !item.itemName || !item.quantity || !item.unit)) {
        toast.error('Semua item RFQ harus diisi lengkap');
        return;
      }
    }

    if (data.quotationType === 'PDF' && !data.pdfFile) {
      toast.error('File PDF penawaran harus diupload');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        quotationType: data.quotationType,
        location: data.location,
        cityId: data.cityId || undefined,
        address: data.address || undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        projectId: data.projectId || undefined,
        status: 'PENDING_VERIFICATION',
        photos: photos.length > 0 ? JSON.stringify(photos.map(p => p.url)) : undefined,
      };

      if (data.quotationType === 'SIMPLE') {
        payload.quantity = data.quantity;
        payload.unit = data.unit;
        payload.budget = data.budget;
      } else if (data.quotationType === 'RFQ') {
        payload.quantity = data.rfqItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        payload.unit = 'item';
        payload.rfqItems = data.rfqItems;
      } else if (data.quotationType === 'PDF') {
        payload.quantity = 1;
        payload.unit = 'file';
        payload.files = JSON.stringify([data.pdfFile]);
      }

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success || result.material) {
        toast.success('Permintaan material berhasil dibuat! Menunggu verifikasi admin.');
        router.push(`/dashboard/materials/${result.material?.id}`);
      } else {
        toast.error(result.error || 'Gagal membuat permintaan material');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat permintaan material');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isVendor ? 'Minta Material untuk Proyek' : 'Minta Material'}
        </h1>
        <p className="text-muted-foreground">
          {isVendor
            ? 'Buat permintaan material untuk proyek Anda dan terima penawaran dari supplier'
            : 'Buat permintaan material dan terima penawaran dari supplier'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Quotation Type Selection */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Tipe Permintaan</CardTitle>
            <CardDescription>
              Pilih tipe permintaan material sesuai kebutuhan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'SIMPLE', label: 'Sederhana', desc: 'Form cepat untuk 1 jenis material', icon: '📝' },
                { value: 'RFQ', label: 'RFQ (Multiple Items)', desc: 'Daftar beberapa item dengan foto', icon: '📋' },
                { value: 'PDF', label: 'Upload PDF', desc: 'Upload penawaran format sendiri', icon: '📄' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue('quotationType', type.value as 'SIMPLE' | 'RFQ' | 'PDF')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    quotationType === type.value
                      ? 'border-[#fd904c] bg-[#fd904c]/10'
                      : 'border-border hover:border-[#fd904c]/50'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <p className="font-medium mt-2">{type.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Detail Permintaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Judul Permintaan *</Label>
              <Input
                id="title"
                placeholder="Contoh: Material Renovasi Dapur"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan detail permintaan material..."
                rows={3}
                {...register('description')}
              />
            </div>

            {/* SIMPLE Type Fields */}
            {quotationType === 'SIMPLE' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Jumlah *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      placeholder="Contoh: 100"
                      {...register('quantity', { valueAsNumber: true })}
                    />
                    {errors.quantity && (
                      <p className="text-sm text-red-500">{errors.quantity.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Satuan *</Label>
                    <Select onValueChange={(value) => setValue('unit', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih satuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Estimasi Budget (Rp)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="Contoh: 8500000"
                    {...register('budget', { valueAsNumber: true })}
                  />
                </div>
              </>
            )}

            {/* RFQ Type Fields */}
            {quotationType === 'RFQ' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Item Material</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRfqItem}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Item
                  </Button>
                </div>

                <input
                  ref={itemPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && uploadingItemIndex !== null) {
                      handleItemPhotoUpload(e.target.files, uploadingItemIndex);
                    }
                  }}
                />

                {fields.map((field, index) => {
                  const rfqItems = watch('rfqItems') || [];
                  const currentItem = rfqItems[index];

                  return (
                    <Card key={field.id} className="border border-dashed">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Item {index + 1}</Badge>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nama Item *</Label>
                            <Input
                              placeholder="Contoh: Semen Portland 50kg"
                              {...register(`rfqItems.${index}.itemName` as const)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Deskripsi</Label>
                            <Input
                              placeholder="Spesifikasi tambahan..."
                              {...register(`rfqItems.${index}.description` as const)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Jumlah *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="100"
                              {...register(`rfqItems.${index}.quantity` as const, { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Satuan *</Label>
                            <Select
                              onValueChange={(value) => {
                                const items = [...(watch('rfqItems') || [])];
                                items[index] = { ...items[index], unit: value };
                                setValue('rfqItems', items);
                              }}
                              defaultValue={currentItem?.unit || 'buah'}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih satuan" />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Photo per item */}
                        <div className="space-y-2">
                          <Label>Foto Item (Opsional)</Label>
                          <div className="flex items-center gap-4">
                            {currentItem?.photo ? (
                              <div className="relative group">
                                <NextImage
                                  src={currentItem.photo}
                                  alt={`Item ${index + 1}`}
                                  width={80}
                                  height={80}
                                  className="rounded-lg object-cover w-20 h-20"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeItemPhoto(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setUploadingItemIndex(index);
                                  itemPhotoInputRef.current?.click();
                                }}
                                disabled={uploadingItemIndex === index}
                              >
                                {uploadingItemIndex === index ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                                <span className="ml-2">Upload Foto</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* PDF Type Fields */}
            {quotationType === 'PDF' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>File PDF Penawaran *</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload file PDF dengan format penawaran Anda sendiri
                  </p>

                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => e.target.files && handleUpload(e.target.files, 'files')}
                  />

                  {pdfFile ? (
                    <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-500" />
                        <span className="text-sm">{pdfFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={removePdfFile}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload PDF
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Provinsi & Kota */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provinsi</Label>
                <Select
                  value={selectedProvinceId}
                  onValueChange={(v) => { setSelectedProvinceId(v); setValue('cityId', ''); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih provinsi" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kota / Kabupaten</Label>
                <Select
                  value={watch('cityId') || ''}
                  onValueChange={(v) => setValue('cityId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kota" />
                  </SelectTrigger>
                  <SelectContent>
                    {citiesByProvince.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat lengkap</Label>
              <Input
                id="address"
                placeholder="Jalan, RT/RW, kelurahan, kecamatan"
                {...register('address')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Lokasi (teks bebas, opsional)</Label>
                <Input
                  id="location"
                  placeholder="Contoh: Jakarta Selatan"
                  {...register('location')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  {...register('deadline')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload Card (for SIMPLE type) */}
        {quotationType === 'SIMPLE' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Foto Material
              </CardTitle>
              <CardDescription>
                Upload foto material (format: JPG, PNG, GIF, WebP. Maks 5MB per file)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files, 'photos')}
              />

              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <NextImage
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        width={150}
                        height={150}
                        className="rounded-lg object-cover w-full h-32"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Foto
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info about verification */}
        <Card className="glass-card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Menunggu Verifikasi
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Permintaan material Anda akan ditinjau oleh admin sebelum dipublikasikan ke supplier.
                  Anda akan menerima notifikasi setelah permintaan disetujui.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
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
            className="bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90 flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim Permintaan'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
