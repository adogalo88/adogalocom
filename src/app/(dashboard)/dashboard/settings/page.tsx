'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, MapPin, Building, CreditCard, Shield, Camera, Package, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().optional(),
  address: z.string().optional(),
  cityId: z.string().optional().nullable(),
  postalCode: z.string().optional(),
});

const bankSchema = z.object({
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type BankForm = z.infer<typeof bankSchema>;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');

  type MaterialCatItem = { id: string; name: string; description: string | null; parentId: string | null; children: { id: string; name: string }[] };
  const [materialCategories, setMaterialCategories] = useState<MaterialCatItem[]>([]);
  const [supplierCategoryIds, setSupplierCategoryIds] = useState<string[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);

  // Data verifikasi (Vendor/Supplier/Tukang)
  const u = user as Record<string, unknown> | null;
  const [verificationEntityType, setVerificationEntityType] = useState<'PERORANGAN' | 'BADAN_USAHA'>('BADAN_USAHA');
  const [verifPicName, setVerifPicName] = useState('');
  const [verifPicPhone, setVerifPicPhone] = useState('');
  const [verifPicKtpPhoto, setVerifPicKtpPhoto] = useState('');
  const [verifNibDoc, setVerifNibDoc] = useState('');
  const [verifNpwpDoc, setVerifNpwpDoc] = useState('');
  const [verifAktaDoc, setVerifAktaDoc] = useState('');
  const [verifSiupDoc, setVerifSiupDoc] = useState('');
  const [verifKtpPhoto, setVerifKtpPhoto] = useState('');
  const [verifSkckDoc, setVerifSkckDoc] = useState('');
  const [verifExperience, setVerifExperience] = useState<number | ''>('');
  const [verifAvatar, setVerifAvatar] = useState('');
  const [savingVerif, setSavingVerif] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/provinces?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setProvinces(d.data));
    fetch('/api/cities?activeOnly=true').then((r) => r.json()).then((d) => d.success && d.data && setCities(d.data));
    fetch('/api/material-categories')
      .then((r) => r.json())
      .then((d) => setMaterialCategories(Array.isArray(d?.categories) ? d.categories : []));
  }, []);

  const userMaterialCategories = (user as { materialCategories?: { id: string; name: string }[] } | null)?.materialCategories ?? [];
  useEffect(() => {
    setSupplierCategoryIds(userMaterialCategories.map((c) => c.id));
  }, [user?.id, userMaterialCategories.length]);

  useEffect(() => {
    if (!u) return;
    const vType = (u.verificationEntityType as string) === 'PERORANGAN' ? 'PERORANGAN' : 'BADAN_USAHA';
    setVerificationEntityType(vType);
    setVerifPicName((u.picName as string) ?? '');
    setVerifPicPhone((u.picPhone as string) ?? '');
    setVerifPicKtpPhoto((u.picKtpPhoto as string) ?? '');
    setVerifNibDoc((u.nibDoc as string) ?? '');
    setVerifNpwpDoc((u.npwpDoc as string) ?? '');
    setVerifAktaDoc((u.aktaPendirianDoc as string) ?? '');
    setVerifSiupDoc((u.siupDoc as string) ?? '');
    setVerifKtpPhoto((u.ktpPhoto as string) ?? '');
    setVerifSkckDoc((u.skckDoc as string) ?? '');
    setVerifExperience((u.experience as number) ?? '');
    setVerifAvatar((u.avatar as string) ?? '');
  }, [u?.id, u?.verificationEntityType, u?.picName, u?.picPhone, u?.picKtpPhoto, u?.nibDoc, u?.npwpDoc, u?.aktaPendirianDoc, u?.siupDoc, u?.ktpPhoto, u?.skckDoc, u?.experience, u?.avatar]);

  const userCityId = (user as { cityId?: string | null; city?: { id: string } | null })?.cityId ?? (user as { city?: { id: string } | null })?.city?.id ?? null;
  const citiesByProvince = selectedProvinceId ? cities.filter((c) => c.provinceId === selectedProvinceId) : cities;

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      cityId: userCityId || undefined,
      postalCode: user?.postalCode || '',
    },
  });

  const currentCityId = profileForm.watch('cityId');
  const provinceForCity = currentCityId ? cities.find((c) => c.id === currentCityId)?.provinceId : '';
  useEffect(() => {
    if (provinceForCity && !selectedProvinceId) setSelectedProvinceId(provinceForCity);
  }, [provinceForCity, selectedProvinceId]);

  // Sync form when user (with city) and cities list are loaded
  useEffect(() => {
    if (!user || cities.length === 0) return;
    const uid = (user as { cityId?: string | null; city?: { id: string } | null })?.cityId ?? (user as { city?: { id: string } | null })?.city?.id ?? null;
    if (uid) {
      profileForm.setValue('cityId', uid);
      const provId = cities.find((c) => c.id === uid)?.provinceId;
      if (provId) setSelectedProvinceId(provId);
    }
  }, [user?.id, cities.length]);

  const bankForm = useForm<BankForm>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankName: user?.bankName || '',
      bankAccountNumber: user?.bankAccountNumber || '',
      bankAccountName: user?.bankAccountName || '',
    },
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, cityId: data.cityId || null };
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal memperbarui profil');
      }
      
      await refreshUser();
      toast.success('Profil berhasil diperbarui!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui profil');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSupplierCategory = (id: string) => {
    setSupplierCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Hanya file gambar (JPG, PNG, GIF, WebP) yang diterima');
      return;
    }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('photos', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload gagal');
      const url = data?.data?.photos?.[0] ?? data?.data?.files?.[0] ?? data?.data?.urls?.[0];
      if (!url || typeof url !== 'string') throw new Error(data?.error || 'URL foto tidak diterima');
      const patchRes = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
        credentials: 'include',
      });
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        throw new Error(err?.error || 'Gagal menyimpan foto');
      }
      await refreshUser();
      toast.success('Foto profil berhasil diubah');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const uploadVerifFile = async (field: string, file: File) => {
    setUploadingField(field);
    try {
      const fd = new FormData();
      const isImageOnly = field === 'avatar' || field === 'ktpPhoto';
      if (isImageOnly) {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
          toast.error('Hanya file gambar (JPG, PNG, GIF, WebP) yang diterima');
          setUploadingField(null);
          return;
        }
        fd.append('photos', file);
      } else {
        fd.append('files', file);
      }
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload gagal');
      const url = data?.data?.photos?.[0] ?? data?.data?.files?.[0] ?? data?.data?.urls?.[0];
      if (!url || typeof url !== 'string') throw new Error(data?.error || 'URL file tidak diterima');
      if (field === 'picKtpPhoto') setVerifPicKtpPhoto(url);
      else if (field === 'nibDoc') setVerifNibDoc(url);
      else if (field === 'npwpDoc') setVerifNpwpDoc(url);
      else if (field === 'aktaDoc') setVerifAktaDoc(url);
      else if (field === 'siupDoc') setVerifSiupDoc(url);
      else if (field === 'ktpPhoto') setVerifKtpPhoto(url);
      else if (field === 'skckDoc') setVerifSkckDoc(url);
      else if (field === 'avatar') setVerifAvatar(url);
      toast.success('File berhasil diupload');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload gagal');
    } finally {
      setUploadingField(null);
    }
  };

  const onSaveVerification = async () => {
    // Validasi wajib sebelum simpan
    if (user?.role === 'VENDOR') {
      if (verificationEntityType === 'PERORANGAN') {
        if (!verifKtpPhoto?.trim()) {
          toast.error('Untuk verifikasi perorangan, upload KTP wajib diisi.');
          return;
        }
      } else {
        const hasBadanDoc = !!(verifNibDoc || verifNpwpDoc || verifAktaDoc || verifSiupDoc);
        if (!hasBadanDoc) {
          toast.error('Untuk badan usaha, upload minimal salah satu: NIB, NPWP, Akta Pendirian, atau SIUP.');
          return;
        }
      }
    }
    if (user?.role === 'SUPPLIER') {
      if (!verifPicName?.trim()) {
        toast.error('Nama PIC wajib diisi.');
        return;
      }
      if (!verifPicPhone?.trim()) {
        toast.error('Nomor WhatsApp PIC wajib diisi.');
        return;
      }
      if (!verifPicKtpPhoto?.trim()) {
        toast.error('KTP PIC wajib diupload.');
        return;
      }
    }
    if (user?.role === 'TUKANG') {
      if (!verifAvatar?.trim()) {
        toast.error('Foto selfie (foto profil) wajib diupload untuk Tukang.');
        return;
      }
    }
    setSavingVerif(true);
    try {
      const payload: Record<string, unknown> = {};
      if (user?.role === 'VENDOR') {
        payload.verificationEntityType = verificationEntityType;
        if (verificationEntityType === 'PERORANGAN') {
          payload.ktpPhoto = verifKtpPhoto || null;
          payload.nibDoc = verifNibDoc || null;
          payload.npwpDoc = verifNpwpDoc || null;
        } else {
          payload.picName = verifPicName || null;
          payload.picPhone = verifPicPhone || null;
          payload.picKtpPhoto = verifPicKtpPhoto || null;
          payload.nibDoc = verifNibDoc || null;
          payload.npwpDoc = verifNpwpDoc || null;
          payload.aktaPendirianDoc = verifAktaDoc || null;
          payload.siupDoc = verifSiupDoc || null;
        }
      } else if (user?.role === 'SUPPLIER') {
        payload.picName = verifPicName || null;
        payload.picPhone = verifPicPhone || null;
        payload.picKtpPhoto = verifPicKtpPhoto || null;
        payload.nibDoc = verifNibDoc || null;
        payload.npwpDoc = verifNpwpDoc || null;
        payload.aktaPendirianDoc = verifAktaDoc || null;
        payload.siupDoc = verifSiupDoc || null;
      } else if (user?.role === 'TUKANG') {
        payload.ktpPhoto = verifKtpPhoto || null;
        payload.skckDoc = verifSkckDoc || null;
        payload.experience = verifExperience === '' ? null : Number(verifExperience);
        payload.avatar = verifAvatar || null;
      }
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan');
      }
      await refreshUser();
      toast.success('Data verifikasi berhasil disimpan');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSavingVerif(false);
    }
  };

  const onSaveMaterialCategories = async () => {
    if (user?.role !== 'SUPPLIER') return;
    setSavingCategories(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialCategoryIds: supplierCategoryIds }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal menyimpan');
      }
      await refreshUser();
      toast.success('Kategori material berhasil disimpan');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan kategori material');
    } finally {
      setSavingCategories(false);
    }
  };

  const onBankSubmit = async (data: BankForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal memperbarui data bank');
      }
      
      await refreshUser();
      toast.success('Data bank berhasil diperbarui!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui data bank');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    CLIENT: 'Klien',
    VENDOR: 'Vendor',
    TUKANG: 'Tukang',
    SUPPLIER: 'Supplier',
    ADMIN: 'Administrator',
  };

  const roleColors: Record<string, string> = {
    CLIENT: 'bg-purple-100 text-purple-700',
    VENDOR: 'bg-blue-100 text-blue-700',
    TUKANG: 'bg-orange-100 text-orange-700',
    SUPPLIER: 'bg-teal-100 text-teal-700',
    ADMIN: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">Kelola profil dan preferensi akun Anda</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full md:w-auto ${user?.role === 'SUPPLIER' ? 'grid-cols-6' : (user?.role === 'VENDOR' || user?.role === 'TUKANG') ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Alamat</span>
          </TabsTrigger>
          {(user?.role === 'VENDOR' || user?.role === 'SUPPLIER' || user?.role === 'TUKANG') && (
            <TabsTrigger value="verification" className="gap-2">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Verifikasi</span>
            </TabsTrigger>
          )}
          {user?.role === 'SUPPLIER' && (
            <TabsTrigger value="material-categories" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Kategori Material</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="bank" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Bank</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Keamanan</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Informasi dasar akun Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                {/* Avatar - klik untuk upload (semua role). Tukang: wajib foto selfie. */}
                <div className="flex items-center gap-4">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#fd904c] focus:ring-offset-2"
                  >
                    <Avatar className="h-20 w-20 ring-2 ring-transparent hover:ring-[#fd904c]/50 transition-all">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-xl">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      ) : (
                        <Camera className="h-8 w-8 text-white" />
                      )}
                    </span>
                  </button>
                  <div>
                    <p className="font-medium text-lg">{user?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Klik foto untuk ganti foto profil</p>
                    {user?.role === 'TUKANG' && (
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Untuk Tukang: foto selfie wajib sebagai foto profil</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={roleColors[user?.role || 'CLIENT']}>
                        {roleLabels[user?.role || 'CLIENT']}
                      </Badge>
                      {user?.isVerified && (
                        <Badge className="bg-green-100 text-green-700">
                          Terverifikasi
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      {...profileForm.register('name')}
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-red-500">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor HP</Label>
                  <Input
                    id="phone"
                    placeholder="08xxxxxxxxxx"
                    {...profileForm.register('phone')}
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Perubahan
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verifikasi (Vendor / Supplier / Tukang) */}
        {(user?.role === 'VENDOR' || user?.role === 'SUPPLIER' || user?.role === 'TUKANG') && (
          <TabsContent value="verification">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Data Verifikasi</CardTitle>
                <CardDescription>
                  {user?.role === 'TUKANG'
                    ? 'Lengkapi data berikut agar admin dapat memverifikasi akun Anda. Foto KTP, selfie (foto profil), pengalaman kerja, dan SKCK wajib.'
                    : user?.role === 'VENDOR'
                    ? 'Pilih tipe: Perorangan (KTP wajib) atau Badan Usaha (minimal salah satu dokumen NIB/NPWP/Akta/SIUP).'
                    : 'Nama PIC, nomor WhatsApp PIC, dan KTP PIC wajib diisi.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {user?.role === 'VENDOR' && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipe verifikasi</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="vendorType"
                            checked={verificationEntityType === 'BADAN_USAHA'}
                            onChange={() => setVerificationEntityType('BADAN_USAHA')}
                            className="rounded-full"
                          />
                          <span>Badan Usaha</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="vendorType"
                            checked={verificationEntityType === 'PERORANGAN'}
                            onChange={() => setVerificationEntityType('PERORANGAN')}
                            className="rounded-full"
                          />
                          <span>Perorangan</span>
                        </label>
                      </div>
                    </div>
                    {verificationEntityType === 'BADAN_USAHA' && (
                      <>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nama PIC (opsional)</Label>
                            <Input value={verifPicName} onChange={(e) => setVerifPicName(e.target.value)} placeholder="Nama penanggung jawab" />
                          </div>
                          <div className="space-y-2">
                            <Label>WhatsApp PIC (opsional)</Label>
                            <Input value={verifPicPhone} onChange={(e) => setVerifPicPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>KTP PIC (opsional)</Label>
                          <div className="flex gap-2 items-center">
                            <Input type="file" accept="image/*,.pdf" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadVerifFile('picKtpPhoto', e.target.files[0])} />
                            {uploadingField === 'picKtpPhoto' && <Loader2 className="h-4 w-4 animate-spin" />}
                            {verifPicKtpPhoto && <span className="text-sm text-green-600">Terupload</span>}
                          </div>
                        </div>
                        <Separator />
                        <p className="text-sm font-medium">Dokumen badan usaha (wajib minimal salah satu)</p>
                        <div className="grid md:grid-cols-2 gap-4">
                          {(['nibDoc', 'npwpDoc', 'aktaDoc', 'siupDoc'] as const).map((f) => (
                            <div key={f} className="space-y-2">
                              <Label>{f === 'nibDoc' ? 'NIB' : f === 'npwpDoc' ? 'NPWP (file)' : f === 'aktaDoc' ? 'Akta Pendirian' : 'SIUP'}</Label>
                              <div className="flex gap-2 items-center">
                                <Input type="file" accept="image/*,.pdf" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadVerifFile(f, e.target.files[0])} />
                                {uploadingField === f && <Loader2 className="h-4 w-4 animate-spin" />}
                                {(f === 'nibDoc' ? verifNibDoc : f === 'npwpDoc' ? verifNpwpDoc : f === 'aktaDoc' ? verifAktaDoc : verifSiupDoc) && <span className="text-sm text-green-600">Terupload</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {verificationEntityType === 'PERORANGAN' && (
                      <>
                        <p className="text-sm text-muted-foreground">Perorangan: KTP wajib; NPWP dan NIB opsional.</p>
                        <div className="space-y-2">
                          <Label>Foto KTP * (wajib)</Label>
                          <div className="flex gap-2 items-center">
                            <Input type="file" accept="image/*,.pdf" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadVerifFile('ktpPhoto', e.target.files[0])} />
                            {uploadingField === 'ktpPhoto' && <Loader2 className="h-4 w-4 animate-spin" />}
                            {verifKtpPhoto && <span className="text-sm text-green-600">Terupload</span>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>NPWP (opsional)</Label>
                          <div className="flex gap-2 items-center">
                            <Input type="file" accept="image/*,.pdf" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadVerifFile('npwpDoc', e.target.files[0])} />
                            {uploadingField === 'npwpDoc' && <Loader2 className="h-4 w-4 animate-spin" />}
                            {verifNpwpDoc && <span className="text-sm text-green-600">Terupload</span>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>NIB (opsional)</Label>
                          <div className="flex gap-2 items-center">
                            <Input type="file" accept="image/*,.pdf" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadVerifFile('nibDoc', e.target.files[0])} />
                            {uploadingField === 'nibDoc' && <Loader2 className="h-4 w-4 animate-spin" />}
                            {verifNibDoc && <span className="text-sm text-green-600">Terupload</span>}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
                {user?.role === 'SUPPLIER' && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nama PIC * (wajib)</Label>
                        <Input value={verifPicName} onChange={(e) => setVerifPicName(e.target.value)} placeholder="Nama penanggung jawab" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nomor WhatsApp PIC * (wajib)</Label>
                        <Input value={verifPicPhone} onChange={(e) => setVerifPicPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>KTP PIC * (wajib)</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*,.pdf" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadVerifFile('picKtpPhoto', e.target.files[0])} />
                        {uploadingField === 'picKtpPhoto' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {verifPicKtpPhoto && <span className="text-sm text-green-600">Terupload</span>}
                      </div>
                    </div>
                    <Separator />
                    <p className="text-sm font-medium">Dokumen tambahan (opsional)</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {(['nibDoc', 'npwpDoc', 'aktaDoc', 'siupDoc'] as const).map((f) => (
                        <div key={f} className="space-y-2">
                          <Label>{f === 'nibDoc' ? 'NIB' : f === 'npwpDoc' ? 'NPWP (file)' : f === 'aktaDoc' ? 'Akta Pendirian' : 'SIUP'}</Label>
                          <div className="flex gap-2 items-center">
                            <Input type="file" accept="image/*,.pdf" className="max-w-xs" onChange={(e) => e.target.files?.[0] && uploadVerifFile(f, e.target.files[0])} />
                            {uploadingField === f && <Loader2 className="h-4 w-4 animate-spin" />}
                            {(f === 'nibDoc' ? verifNibDoc : f === 'npwpDoc' ? verifNpwpDoc : f === 'aktaDoc' ? verifAktaDoc : verifSiupDoc) && <span className="text-sm text-green-600">Terupload</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {user?.role === 'TUKANG' && (
                  <>
                    <div className="space-y-2">
                      <Label>Foto KTP *</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadVerifFile('ktpPhoto', e.target.files[0])} className="max-w-xs" />
                        {uploadingField === 'ktpPhoto' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {verifKtpPhoto && <span className="text-sm text-green-600">Terupload</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Selfie (untuk foto profil) *</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadVerifFile('avatar', e.target.files[0])} className="max-w-xs" />
                        {uploadingField === 'avatar' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {verifAvatar && <span className="text-sm text-green-600">Terupload</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Pengalaman kerja (tahun)</Label>
                      <Input type="number" min={0} value={verifExperience} onChange={(e) => setVerifExperience(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Contoh: 5" />
                    </div>
                    <div className="space-y-2">
                      <Label>SKCK *</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && uploadVerifFile('skckDoc', e.target.files[0])} className="max-w-xs" />
                        {uploadingField === 'skckDoc' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {verifSkckDoc && <span className="text-sm text-green-600">Terupload</span>}
                      </div>
                    </div>
                  </>
                )}
                <Button type="button" className="bg-gradient-to-r from-[#fd904c] to-[#e57835]" disabled={savingVerif} onClick={onSaveVerification}>
                  {savingVerif && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Data Verifikasi
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Kategori Material (Supplier only) */}
        {user?.role === 'SUPPLIER' && (
          <TabsContent value="material-categories">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Kategori Material</CardTitle>
                <CardDescription>Pilih kategori material yang Anda sediakan (bisa lebih dari satu)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {materialCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada kategori. Admin dapat menambahkannya di Dashboard → Kategori Material.</p>
                ) : (
                  <>
                    <div className="rounded-lg border p-4 space-y-3 max-h-64 overflow-y-auto">
                      {materialCategories.map((parent) => (
                        <div key={parent.id} className="space-y-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={supplierCategoryIds.includes(parent.id)}
                              onChange={() => toggleSupplierCategory(parent.id)}
                              className="rounded border-gray-300"
                            />
                            <span className="font-medium">{parent.name}</span>
                          </label>
                          {parent.children?.length > 0 && (
                            <div className="pl-6 space-y-1">
                              {parent.children.map((child: { id: string; name: string }) => (
                                <label key={child.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={supplierCategoryIds.includes(child.id)}
                                    onChange={() => toggleSupplierCategory(child.id)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-muted-foreground">{child.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                      disabled={savingCategories}
                      onClick={onSaveMaterialCategories}
                    >
                      {savingCategories && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Simpan Kategori
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Address Tab */}
        <TabsContent value="address">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Alamat</CardTitle>
              <CardDescription>Informasi alamat untuk pengiriman dan proyek</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat Lengkap</Label>
                  <Textarea
                    id="address"
                    placeholder="Jl. Contoh No. 123, RT/RW..."
                    {...profileForm.register('address')}
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provinsi</Label>
                    <Select
                      value={selectedProvinceId}
                      onValueChange={(v) => { setSelectedProvinceId(v); profileForm.setValue('cityId', ''); }}
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
                      value={profileForm.watch('cityId') || ''}
                      onValueChange={(v) => profileForm.setValue('cityId', v)}
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
                  <Label htmlFor="postalCode">Kode Pos</Label>
                  <Input
                    id="postalCode"
                    placeholder="12345"
                    {...profileForm.register('postalCode')}
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Alamat
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Tab */}
        <TabsContent value="bank">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Rekening Bank</CardTitle>
              <CardDescription>Rekening untuk menerima pembayaran</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Nama Bank</Label>
                  <Input
                    id="bankName"
                    placeholder="BCA, Mandiri, BNI, dll"
                    {...bankForm.register('bankName')}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Nomor Rekening</Label>
                    <Input
                      id="bankAccountNumber"
                      placeholder="1234567890"
                      {...bankForm.register('bankAccountNumber')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountName">Nama Pemilik Rekening</Label>
                    <Input
                      id="bankAccountName"
                      placeholder="Nama sesuai buku rekening"
                      {...bankForm.register('bankAccountName')}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Rekening
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Keamanan</CardTitle>
              <CardDescription>Kelola password dan keamanan akun</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">
                      Terakhir diubah: -
                    </p>
                  </div>
                  <Button variant="outline">Ubah Password</Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Verifikasi Akun</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.isVerified 
                        ? 'Akun Anda sudah terverifikasi'
                        : 'Verifikasi identitas untuk mengakses semua fitur'}
                    </p>
                  </div>
                  {!user?.isVerified && (
                    <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835]">
                      Verifikasi Sekarang
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
