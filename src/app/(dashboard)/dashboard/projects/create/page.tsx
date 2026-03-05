'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProject, useCategories } from '@/hooks/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, X, Plus, Trash2, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const rfqItemSchema = z.object({
  itemName: z.string().min(1, 'Nama item harus diisi'),
  description: z.string().optional(),
  quantity: z.number().min(0.01, 'Jumlah harus lebih dari 0'),
  unit: z.string().min(1, 'Satuan harus diisi'),
});

const projectSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter'),
  description: z.string().min(20, 'Deskripsi minimal 20 karakter'),
  type: z.enum(['TENDER', 'HARIAN']),
  tenderSubtype: z.enum(['WITH_RFQ', 'WITHOUT_RFQ']).optional(),
  budget: z.number().min(0).optional(),
  location: z.string().optional(),
  cityId: z.string().optional(),
  address: z.string().max(500).optional(),
  workerNeeded: z.number().min(1).optional(),
  categoryId: z.string().optional(),
  skillIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  rfqItems: z.array(rfqItemSchema).optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

interface UploadedFile {
  url: string;
  name: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createProject = useCreateProject();
  const { data: categoriesData } = useCategories();
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setProvinces(d.data));
    fetch('/api/cities?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setCities(d.data));
    fetch('/api/skills').then((r) => r.json()).then((d) => (d.success && Array.isArray(d.skills)) && setSkills(d.skills));
  }, []);
  const citiesByProvince = selectedProvinceId ? cities.filter((c) => c.provinceId === selectedProvinceId) : cities;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      type: 'TENDER',
      tenderSubtype: 'WITHOUT_RFQ',
      rfqItems: [{ itemName: '', description: '', quantity: 1, unit: 'm' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rfqItems',
  });

  const projectType = watch('type');
  const tenderSubtype = watch('tenderSubtype');

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
        credentials: 'include',
      });

      const result = await response.json();
      const data = result?.data ?? {};

      if (result.success && (data.photos?.length > 0 || data.files?.length > 0)) {
        if (type === 'photos') {
          const photoUrls = data.photos ?? [];
          const newPhotos = photoUrls.map((url: string) => ({
            url,
            name: url.split('/').pop() || 'photo',
          }));
          setPhotos((prev) => [...prev, ...newPhotos]);
        } else {
          const fileUrls = data.files ?? [];
          const newFiles = fileUrls.map((url: string) => ({
            url,
            name: url.split('/').pop() || 'file',
          }));
          setFiles((prev) => [...prev, ...newFiles]);
        }
        if (data.errors?.length > 0) {
          toast.warning(data.errors.join(', '));
        }
      } else {
        toast.error(result?.error || 'Gagal mengupload file');
      }
    } catch (error) {
      toast.error('Gagal mengupload file');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addRFQItem = () => {
    append({ itemName: '', description: '', quantity: 1, unit: 'm' });
  };

  const onSubmit = async (data: ProjectForm) => {
    // Validate RFQ items if WITH_RFQ
    if (data.type === 'TENDER' && data.tenderSubtype === 'WITH_RFQ') {
      if (!data.rfqItems || data.rfqItems.length === 0 || data.rfqItems.every(item => !item.itemName)) {
        toast.error('Harap isi minimal satu item RFQ');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await createProject.mutateAsync({
        ...data,
        budget: data.budget || undefined,
        workerNeeded: data.workerNeeded || undefined,
        categoryId: data.categoryId || undefined,
        skillIds: projectType === 'HARIAN' && selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        cityId: data.cityId || undefined,
        address: data.address || undefined,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        tenderSubtype: data.type === 'TENDER' ? data.tenderSubtype : undefined,
        rfqItems: data.type === 'TENDER' && data.tenderSubtype === 'WITH_RFQ' ? data.rfqItems : undefined,
        photos: photos.length > 0 ? JSON.stringify(photos.map(p => p.url)) : undefined,
        files: files.length > 0 ? JSON.stringify(files.map(f => f.url)) : undefined,
      });
      
      toast.success('Proyek berhasil dibuat!');
      router.push(`/dashboard/projects/${result.project.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat proyek');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pasang Proyek Baru</h1>
        <p className="text-muted-foreground">
          Buat proyek baru dan temukan vendor atau tukang terbaik
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Detail Proyek</CardTitle>
            <CardDescription>
              Isi informasi lengkap tentang proyek Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Judul Proyek *</Label>
              <Input
                id="title"
                placeholder="Contoh: Renovasi Dapur 3x4 meter"
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
                placeholder="Jelaskan detail proyek Anda, seperti ruang lingkup pekerjaan, material yang dibutuhkan, dll."
                rows={5}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipe Proyek *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => {
                  setValue('type', value as 'TENDER' | 'HARIAN');
                  if (value === 'HARIAN') {
                    setValue('tenderSubtype', undefined);
                  } else {
                    setValue('tenderSubtype', 'WITHOUT_RFQ');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TENDER">
                    <div>
                      <p className="font-medium">Tender (Kontrak)</p>
                      <p className="text-xs text-muted-foreground">Proyek berbasis kontrak dengan harga tetap</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="HARIAN">
                    <div>
                      <p className="font-medium">Harian</p>
                      <p className="text-xs text-muted-foreground">Pekerja harian dengan pembayaran per hari</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tender Subtype - Only show if TENDER */}
            {projectType === 'TENDER' && (
              <div className="space-y-2">
                <Label>Subtipe Tender *</Label>
                <Select
                  value={watch('tenderSubtype')}
                  onValueChange={(value) => setValue('tenderSubtype', value as 'WITH_RFQ' | 'WITHOUT_RFQ')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WITHOUT_RFQ">
                      <div>
                        <p className="font-medium">Tanpa RFQ</p>
                        <p className="text-xs text-muted-foreground">Vendor mengajukan penawaran langsung</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="WITH_RFQ">
                      <div>
                        <p className="font-medium">Dengan RFQ (Request for Quotation)</p>
                        <p className="text-xs text-muted-foreground">Anda membuat daftar item pekerjaan, Vendor mengisi harga</p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                value={watch('categoryId')}
                onValueChange={(value) => setValue('categoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesData?.categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget (dan Jumlah Pekerja hanya untuk Harian) */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Estimasi Budget (Rp)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="Contoh: 50000000"
                  {...register('budget', { valueAsNumber: true })}
                />
              </div>
              {projectType === 'HARIAN' && (
                <div className="space-y-2">
                  <Label htmlFor="workerNeeded">Jumlah Pekerja Dibutuhkan</Label>
                  <Input
                    id="workerNeeded"
                    type="number"
                    placeholder="Contoh: 3"
                    {...register('workerNeeded', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>

            {projectType === 'HARIAN' && (
              <div className="space-y-2">
                <Label>Keahlian yang Dibutuhkan</Label>
                <p className="text-sm text-muted-foreground">Pilih keahlian tukang yang Anda cari (bisa lebih dari satu)</p>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-lg border p-4">Belum ada keahlian. Admin dapat menambahkannya di Dashboard → Keahlian Tukang.</p>
                ) : (
                  <div className="rounded-lg border p-4 space-y-2 max-h-48 overflow-y-auto">
                    {skills.map((skill) => (
                      <label key={skill.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSkillIds.includes(skill.id)}
                          onChange={() => setSelectedSkillIds((prev) => prev.includes(skill.id) ? prev.filter((id) => id !== skill.id) : [...prev, skill.id])}
                          className="rounded border-gray-300"
                        />
                        <span>{skill.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Provinsi & Kota */}
            <div className="grid md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi (teks bebas, opsional)</Label>
              <Input
                id="location"
                placeholder="Contoh: Jakarta Selatan"
                {...register('location')}
              />
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Target Selesai</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RFQ Items Card - Only show if TENDER and WITH_RFQ */}
        {projectType === 'TENDER' && tenderSubtype === 'WITH_RFQ' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Item Pekerjaan (RFQ)</CardTitle>
              <CardDescription>
                Tambahkan item pekerjaan yang akan diisi harga oleh Vendor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Nama Item *</TableHead>
                      <TableHead className="w-[25%]">Deskripsi</TableHead>
                      <TableHead className="w-[15%]">Jumlah *</TableHead>
                      <TableHead className="w-[15%]">Satuan *</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Input
                            placeholder="Contoh: Pemasangan Lantai"
                            {...register(`rfqItems.${index}.itemName`)}
                            className="border-0 bg-transparent p-1"
                          />
                          {errors.rfqItems?.[index]?.itemName && (
                            <p className="text-xs text-red-500">{errors.rfqItems[index]?.itemName?.message}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Deskripsi singkat"
                            {...register(`rfqItems.${index}.description`)}
                            className="border-0 bg-transparent p-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            {...register(`rfqItems.${index}.quantity`, { valueAsNumber: true })}
                            className="border-0 bg-transparent p-1 w-20"
                          />
                          {errors.rfqItems?.[index]?.quantity && (
                            <p className="text-xs text-red-500">{errors.rfqItems[index]?.quantity?.message}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={field.unit}
                            onValueChange={(value) => setValue(`rfqItems.${index}.unit`, value)}
                          >
                            <SelectTrigger className="border-0 bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="m">m (meter)</SelectItem>
                              <SelectItem value="m2">m² (meter persegi)</SelectItem>
                              <SelectItem value="m3">m³ (meter kubik)</SelectItem>
                              <SelectItem value="kg">kg (kilogram)</SelectItem>
                              <SelectItem value="pcs">pcs (pieces)</SelectItem>
                              <SelectItem value="unit">unit</SelectItem>
                              <SelectItem value="ls">ls (luasan)</SelectItem>
                              <SelectItem value="set">set</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRFQItem}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Item
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Photo Upload Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Foto Proyek
            </CardTitle>
            <CardDescription>
              Upload foto proyek (format: JPG, PNG, GIF, WebP. Maks 5MB per file)
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
                    <Image
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

        {/* File Upload Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dokumen Pendukung
            </CardTitle>
            <CardDescription>
              Upload dokumen pendukung seperti gambar teknis, RAB, dll (format: PDF, DOC, XLS, TXT. Maks 10MB per file)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files, 'files')}
            />

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-500" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Dokumen
            </Button>
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
            className="bg-[#fd904c] hover:bg-[#fd904c]/90 flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Pasang Proyek'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
