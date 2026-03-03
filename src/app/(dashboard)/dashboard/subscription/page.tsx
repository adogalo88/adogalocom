'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Check,
  Crown,
  Star,
  Zap,
  Shield,
  Clock,
  AlertCircle,
  Loader2,
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

interface CurrentSubscription {
  id: string;
  plan: string;
  price: number;
  status: string;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  daysRemaining: number | null;
}

const featureIcons: Record<string, React.ReactNode> = {
  'Lamaran tidak terbatas': <Zap className="h-4 w-4" />,
  'Profil featured': <Star className="h-4 w-4" />,
  'Prioritas listing': <Crown className="h-4 w-4" />,
  'Badge verified': <Shield className="h-4 w-4" />,
  'Support prioritas': <Check className="h-4 w-4" />,
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'TUKANG' && user.role !== 'SUPPLIER') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    try {
      const [plansRes, settingsRes, subRes] = await Promise.all([
        fetch('/api/subscriptions/plans'),
        fetch('/api/platform-settings'),
        fetch('/api/subscriptions/current'),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setCurrentSubscription(subData.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Gagal memuat data langganan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setIsSubscribing(true);
    try {
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Langganan berhasil diaktifkan!');
        setConfirmDialogOpen(false);
        fetchData();
      } else {
        toast.error(result.error || 'Gagal berlangganan');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSubscribing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!settings?.subscriptionEnabled) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Fitur Langganan Belum Tersedia</h2>
            <p className="text-muted-foreground mt-2">
              Sistem langganan sedang tidak aktif saat ini.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  const userType = user?.role as 'TUKANG' | 'SUPPLIER';
  const filteredPlans = plans.filter((p) => p.type === userType && p.isActive);
  const defaultPrice =
    userType === 'TUKANG'
      ? settings?.tukangSubscriptionPrice || 25000
      : settings?.supplierSubscriptionPrice || 49000;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Langganan Premium</h1>
        <p className="text-muted-foreground">
          Tingkatkan visibilitas dan dapatkan lebih banyak peluang
        </p>
      </div>

      {/* Current Subscription */}
      {currentSubscription && (
        <Card className="glass-card border-green-200 bg-green-50/50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Langganan Aktif: {currentSubscription.plan}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentSubscription.daysRemaining !== null ? (
                      <>
                        <Clock className="h-4 w-4 inline mr-1" />
                        {currentSubscription.daysRemaining} hari tersisa
                      </>
                    ) : (
                      'Berlaku tanpa batas waktu'
                    )}
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700">Aktif</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Default/Free Plan */}
        <Card
          className={`glass-card relative ${
            !currentSubscription ? 'border-2 border-[#fd904c]' : ''
          }`}
        >
          {!currentSubscription && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-[#fd904c]">Paket Saat Ini</Badge>
            </div>
          )}
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Gratis</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">Rp 0</span>
              <span className="text-muted-foreground">/bulan</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                5 lamaran per bulan
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                Profil dasar
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                Portofolio publik
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Tidak ada prioritas
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Paket Saat Ini
            </Button>
          </CardContent>
        </Card>

        {/* Paid Plans */}
        {filteredPlans.map((plan, index) => (
          <Card
            key={plan.id}
            className={`glass-card relative ${
              currentSubscription?.plan === plan.name
                ? 'border-2 border-[#fd904c]'
                : ''
            }`}
          >
            {index === 0 && !currentSubscription && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-[#fd904c]">Rekomendasi</Badge>
              </div>
            )}
            {currentSubscription?.plan === plan.name && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-green-500">Aktif</Badge>
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold text-[#fd904c]">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-muted-foreground">/bulan</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {featureIcons[feature] || <Check className="h-4 w-4 text-green-500" />}
                    {feature}
                  </li>
                ))}
                {plan.maxApplications > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    {plan.maxApplications} lamaran per bulan
                  </li>
                )}
                {plan.maxApplications === 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Lamaran tidak terbatas
                  </li>
                )}
                {plan.priority > 0 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Crown className="h-4 w-4 text-purple-500" />
                    Prioritas #{plan.priority} di listing
                  </li>
                )}
              </ul>
              {currentSubscription?.plan === plan.name ? (
                <Button variant="outline" className="w-full" disabled>
                  Sedang Aktif
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90"
                  onClick={() => {
                    setSelectedPlan(plan);
                    setConfirmDialogOpen(true);
                  }}
                >
                  Pilih Paket
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {/* If no custom plans, show default plan */}
        {filteredPlans.length === 0 && !currentSubscription && (
          <Card className="glass-card relative border-2 border-[#fd904c]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-[#fd904c]">Rekomendasi</Badge>
            </div>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Member</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold text-[#fd904c]">
                  {formatCurrency(defaultPrice)}
                </span>
                <span className="text-muted-foreground">/bulan</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  20 lamaran per bulan
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-blue-500" />
                  Profil featured
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Crown className="h-4 w-4 text-purple-500" />
                  Prioritas di listing
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-500" />
                  Badge verified
                </li>
              </ul>
              <Button
                className="w-full bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90"
                onClick={() => {
                  setSelectedPlan({
                    id: 'default',
                    name: 'Member',
                    type: userType,
                    price: defaultPrice,
                    features: ['Profil featured', 'Prioritas di listing', 'Badge verified'],
                    maxApplications: 20,
                    priority: 1,
                    isActive: true,
                    sortOrder: 1,
                  });
                  setConfirmDialogOpen(true);
                }}
              >
                Pilih Paket
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Features Comparison */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Mengapa Berlangganan?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-[#fd904c]/20 flex items-center justify-center mx-auto mb-3">
                <Crown className="h-6 w-6 text-[#fd904c]" />
              </div>
              <h3 className="font-medium">Visibilitas Tinggi</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Profil Anda muncul di urutan teratas saat klien mencari
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-[#fd904c]/20 flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-[#fd904c]" />
              </div>
              <h3 className="font-medium">Lebih Banyak Peluang</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tingkatkan limit lamaran dan dapatkan lebih banyak proyek
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-[#fd904c]/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-[#fd904c]" />
              </div>
              <h3 className="font-medium">Kepercayaan Klien</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Badge verified menunjukkan profesionalisme Anda
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Langganan</DialogTitle>
            <DialogDescription>
              Anda akan berlangganan paket {selectedPlan?.name} dengan harga{' '}
              <strong>{selectedPlan && formatCurrency(selectedPlan.price)}</strong>/bulan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Pembayaran akan diproses melalui sistem pembayaran kami. Langganan akan aktif
              segera setelah pembayaran dikonfirmasi.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Konfirmasi & Bayar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
