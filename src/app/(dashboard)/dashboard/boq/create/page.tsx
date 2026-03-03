'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProjects, useCreateBOQ, formatCurrency, BOQItem } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';

const boqSchema = z.object({
  projectId: z.string().min(1, 'Proyek wajib dipilih'),
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200, 'Judul maksimal 200 karakter'),
  description: z.string().max(2000, 'Deskripsi maksimal 2000 karakter').optional(),
  items: z.array(z.object({
    name: z.string().min(1, 'Nama item wajib diisi'),
    description: z.string().optional(),
    quantity: z.number().positive('Jumlah harus positif'),
    unit: z.string().min(1, 'Satuan wajib diisi'),
    unitPrice: z.number().nonnegative('Harga satuan tidak boleh negatif'),
  })).min(1, 'Minimal 1 item BOQ diperlukan'),
  notes: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional(),
});

type BOQForm = z.infer<typeof boqSchema>;

// Default item template
const defaultItem = {
  name: '',
  description: '',
  quantity: 1,
  unit: 'buah',
  unitPrice: 0,
};

export default function CreateBOQPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get preselected project from URL
  const preselectedProjectId = searchParams.get('projectId');

  const createBOQ = useCreateBOQ();
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    status: 'PUBLISHED',
  });

  // Get projects the vendor can create BOQ for (PUBLISHED or assigned)
  const { data: assignedProjectsData } = useProjects({});

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BOQForm>({
    resolver: zodResolver(boqSchema),
    defaultValues: {
      projectId: preselectedProjectId || '',
      title: '',
      description: '',
      items: [{ ...defaultItem }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');

  // Calculate total price
  const totalPrice = watchItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  // Calculate item total
  const calculateItemTotal = (item: BOQItem) => {
    return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  };

  // Get available projects
  const availableProjects = [
    ...(projectsData?.data || []),
    ...(assignedProjectsData?.data || []),
  ].filter((project, index, self) =>
    index === self.findIndex((p) => p.id === project.id) &&
    (project.status === 'PUBLISHED' || project.status === 'IN_PROGRESS')
  );

  const onSubmit = async (data: BOQForm, status: 'DRAFT' | 'SUBMITTED' = 'DRAFT') => {
    setIsSubmitting(true);
    try {
      const items = data.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.quantity) * Number(item.unitPrice),
      }));

      const result = await createBOQ.mutateAsync({
        ...data,
        items,
        status,
      });

      toast.success(status === 'DRAFT' ? 'RAB berhasil disimpan sebagai draft!' : 'RAB berhasil diajukan!');
      router.push(`/dashboard/boq/${result.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat RAB');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    append({ ...defaultItem });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.error('Minimal harus ada 1 item');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat RAB Baru</h1>
          <p className="text-muted-foreground">
            Buat Rencana Anggaran Biaya untuk proyek
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmit(data, 'DRAFT'))}>
        {/* Project Selection */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
            <CardDescription>
              Pilih proyek dan isi informasi dasar RAB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project */}
            <div className="space-y-2">
              <Label htmlFor="projectId">Proyek *</Label>
              {projectsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={watch('projectId')}
                  onValueChange={(value) => setValue('projectId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div>
                          <p className="font-medium">{project.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.client?.name} • {project.location || 'Lokasi tidak ditentukan'}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.projectId && (
                <p className="text-sm text-red-500">{errors.projectId.message}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Judul RAB *</Label>
              <Input
                id="title"
                placeholder="Contoh: RAB Renovasi Dapur"
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
                placeholder="Deskripsi singkat tentang RAB ini..."
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Item RAB</CardTitle>
                <CardDescription>
                  Tambahkan item-item pekerjaan atau material
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Tambah Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="min-w-48">Nama Item *</TableHead>
                    <TableHead className="w-24">Jumlah *</TableHead>
                    <TableHead className="w-28">Satuan *</TableHead>
                    <TableHead className="w-36">Harga Satuan *</TableHead>
                    <TableHead className="w-36">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          placeholder="Nama item"
                          {...register(`items.${index}.name`)}
                          className="min-w-40"
                        />
                        {errors.items?.[index]?.name && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.name?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          placeholder="0"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.quantity?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={watch(`items.${index}.unit`)}
                          onValueChange={(value) => setValue(`items.${index}.unit`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="buah">Buah</SelectItem>
                            <SelectItem value="meter">Meter</SelectItem>
                            <SelectItem value="m2">M²</SelectItem>
                            <SelectItem value="m3">M³</SelectItem>
                            <SelectItem value="kg">Kg</SelectItem>
                            <SelectItem value="set">Set</SelectItem>
                            <SelectItem value="unit">Unit</SelectItem>
                            <SelectItem value="ls">LS</SelectItem>
                            <SelectItem value="hari">Hari</SelectItem>
                            <SelectItem value="minggu">Minggu</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                        />
                        {errors.items?.[index]?.unitPrice && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.unitPrice?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-[#fd904c]">
                        {formatCurrency(calculateItemTotal(watchItems[index]))}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-sm text-red-500 mt-2">{errors.items.message}</p>
            )}

            {/* Total */}
            <Separator className="my-4" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Total RAB:</span>
              </div>
              <span className="text-2xl font-bold text-[#fd904c]">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Catatan</CardTitle>
            <CardDescription>
              Tambahkan catatan atau keterangan tambahan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Catatan tambahan untuk klien..."
              rows={3}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-red-500 mt-1">{errors.notes.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <div className="flex-1 flex gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  className="flex-1 gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Draft
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2"
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => onSubmit(data, 'SUBMITTED'))}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Ajukan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
