'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, MapPin, Building, CreditCard, Shield, Camera } from 'lucide-react';
import { toast } from 'sonner';

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
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

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      province: user?.province || '',
      postalCode: user?.postalCode || '',
    },
  });

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
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Alamat</span>
          </TabsTrigger>
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
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-xl">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[#fd904c] text-white flex items-center justify-center hover:bg-[#fd904c]/90"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium text-lg">{user?.name}</p>
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

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Kota</Label>
                    <Input
                      id="city"
                      placeholder="Jakarta Selatan"
                      {...profileForm.register('city')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provinsi</Label>
                    <Input
                      id="province"
                      placeholder="DKI Jakarta"
                      {...profileForm.register('province')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Kode Pos</Label>
                    <Input
                      id="postalCode"
                      placeholder="12345"
                      {...profileForm.register('postalCode')}
                    />
                  </div>
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
