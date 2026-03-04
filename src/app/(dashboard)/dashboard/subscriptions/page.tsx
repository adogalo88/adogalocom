'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Settings,
  Users,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'TUKANG' | 'SUPPLIER';
  price: number;
  features: string[];
  maxApplications: number;
  priority: number;
  isActive: boolean;
  sortOrder: number;
}

interface PlatformSettings {
  subscriptionEnabled: boolean;
  tukangSubscriptionPrice: number;
  supplierSubscriptionPrice: number;
}

interface SubscriptionStats {
  totalSubscribers: number;
  tukangSubscribers: number;
  supplierSubscribers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
}

export default function AdminSubscriptionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    type: 'TUKANG' as 'TUKANG' | 'SUPPLIER',
    price: 0,
    features: '',
    maxApplications: 0,
    priority: 0,
  });

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, plansRes, statsRes] = await Promise.all([
        fetch('/api/platform-settings'),
        fetch('/api/subscriptions/plans'),
        fetch('/api/subscriptions/stats'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<PlatformSettings>) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (response.ok && result.settings) {
        setSettings(result.settings);
        toast.success('Pengaturan berhasil disimpan');
      } else {
        toast.error(result.error || 'Gagal menyimpan pengaturan');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.name || planForm.price <= 0) {
      toast.error('Nama dan harga harus diisi');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/subscriptions/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planForm,
          features: planForm.features.split(',').map(f => f.trim()).filter(Boolean),
        }),
      });

      const result = await response.json();

      if (response.ok && result.plan) {
        toast.success('Paket berhasil dibuat');
        setEditDialogOpen(false);
        resetPlanForm();
        fetchData();
      } else {
        toast.error(result.error || 'Gagal membuat paket');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Hapus paket ini?')) return;

    try {
      const response = await fetch(`/api/subscriptions/plans/${planId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Paket berhasil dihapus');
        fetchData();
      } else {
        toast.error(result.error || 'Gagal menghapus paket');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      type: 'TUKANG',
      price: 0,
      features: '',
      maxApplications: 0,
      priority: 0,
    });
    setEditingPlan(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const tukangPlans = plans.filter(p => p.type === 'TUKANG');
  const supplierPlans = plans.filter(p => p.type === 'SUPPLIER');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-[#fd904c]" />
          Manajemen Langganan
        </h1>
        <p className="text-muted-foreground">
          Kelola paket langganan dan pengaturan platform
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#fd904c]/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#fd904c]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSubscribers}</p>
                  <p className="text-xs text-muted-foreground">Total Subscriber</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.tukangSubscribers}</p>
                  <p className="text-xs text-muted-foreground">Tukang</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.supplierSubscribers}</p>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                  <p className="text-xs text-muted-foreground">Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Pendapatan Bulan Ini</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Pengaturan
          </TabsTrigger>
          <TabsTrigger value="tukang" className="gap-2">
            Paket Tukang
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2">
            Paket Supplier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Pengaturan Langganan</CardTitle>
              <CardDescription>
                Aktifkan/nonaktifkan sistem langganan dan atur harga default
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subscription Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Aktifkan Langganan</Label>
                  <p className="text-sm text-muted-foreground">
                    Izinkan pengguna untuk berlangganan
                  </p>
                </div>
                <Switch
                  checked={settings?.subscriptionEnabled || false}
                  onCheckedChange={(checked) => handleUpdateSettings({ subscriptionEnabled: checked })}
                  disabled={isSaving}
                />
              </div>

              {/* Default Prices */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tukangPrice">Harga Default Tukang (Rp/bulan)</Label>
                  <Input
                    id="tukangPrice"
                    type="number"
                    value={settings?.tukangSubscriptionPrice || 25000}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setSettings(prev => prev ? { ...prev, tukangSubscriptionPrice: value } : null);
                    }}
                    onBlur={() => handleUpdateSettings({ tukangSubscriptionPrice: settings?.tukangSubscriptionPrice || 25000 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierPrice">Harga Default Supplier (Rp/bulan)</Label>
                  <Input
                    id="supplierPrice"
                    type="number"
                    value={settings?.supplierSubscriptionPrice || 49000}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setSettings(prev => prev ? { ...prev, supplierSubscriptionPrice: value } : null);
                    }}
                    onBlur={() => handleUpdateSettings({ supplierSubscriptionPrice: settings?.supplierSubscriptionPrice || 49000 })}
                  />
                </div>
              </div>

              {!settings?.subscriptionEnabled && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Sistem langganan saat ini tidak aktif. Pengguna tidak dapat berlangganan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tukang" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Paket Langganan Tukang</h3>
            {tukangPlans.length < 3 && (
              <Button
                onClick={() => {
                  resetPlanForm();
                  setPlanForm(prev => ({ ...prev, type: 'TUKANG' }));
                  setEditDialogOpen(true);
                }}
                className="gap-2 bg-gradient-to-r from-[#fd904c] to-[#e57835]"
              >
                <Plus className="h-4 w-4" />
                Tambah Paket
              </Button>
            )}
          </div>

          {tukangPlans.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada paket khusus. Harga default akan digunakan.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Harga default: {formatCurrency(settings?.tukangSubscriptionPrice || 25000)}/bulan
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {tukangPlans.map((plan) => (
                <Card key={plan.id} className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                        {plan.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-[#fd904c]">
                      {formatCurrency(plan.price)}
                      <span className="text-sm text-muted-foreground font-normal">/bulan</span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1">
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {tukangPlans.length >= 3 && (
            <p className="text-sm text-muted-foreground">
              Maksimal 3 paket per tipe. Hapus paket yang ada untuk menambah baru.
            </p>
          )}
        </TabsContent>

        <TabsContent value="supplier" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Paket Langganan Supplier</h3>
            {supplierPlans.length < 3 && (
              <Button
                onClick={() => {
                  resetPlanForm();
                  setPlanForm(prev => ({ ...prev, type: 'SUPPLIER' }));
                  setEditDialogOpen(true);
                }}
                className="gap-2 bg-gradient-to-r from-[#fd904c] to-[#e57835]"
              >
                <Plus className="h-4 w-4" />
                Tambah Paket
              </Button>
            )}
          </div>

          {supplierPlans.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Belum ada paket khusus. Harga default akan digunakan.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Harga default: {formatCurrency(settings?.supplierSubscriptionPrice || 49000)}/bulan
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {supplierPlans.map((plan) => (
                <Card key={plan.id} className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                        {plan.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-[#fd904c]">
                      {formatCurrency(plan.price)}
                      <span className="text-sm text-muted-foreground font-normal">/bulan</span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1">
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {supplierPlans.length >= 3 && (
            <p className="text-sm text-muted-foreground">
              Maksimal 3 paket per tipe. Hapus paket yang ada untuk menambah baru.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Paket Baru</DialogTitle>
            <DialogDescription>
              Tambahkan paket langganan baru untuk {planForm.type === 'TUKANG' ? 'Tukang' : 'Supplier'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Paket</Label>
              <Input
                placeholder="Contoh: Basic, Pro, Premium"
                value={planForm.name}
                onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Harga (Rp/bulan)</Label>
              <Input
                type="number"
                placeholder="25000"
                value={planForm.price}
                onChange={(e) => setPlanForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fitur (pisahkan dengan koma)</Label>
              <Input
                placeholder="Lamaran tidak terbatas, Profil featured, Badge verified"
                value={planForm.features}
                onChange={(e) => setPlanForm(prev => ({ ...prev, features: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Lamaran/Bulan (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={planForm.maxApplications}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, maxApplications: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioritas (lebih tinggi = lebih atas)</Label>
                <Input
                  type="number"
                  value={planForm.priority}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreatePlan}
              disabled={isSaving}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
