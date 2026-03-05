'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import {
  ArrowRight,
  Building2,
  Users,
  Shield,
  Wallet,
  Star,
  Clock,
  CheckCircle,
  Wrench,
  Truck,
  UserCircle,
  Layers,
  MessageSquare,
  TrendingUp,
  LayoutDashboard,
  FolderPlus,
  Package,
  Search,
} from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'Manajemen Proyek',
    description: 'Kelola proyek konstruksi dengan sistem tender atau harian, lengkap dengan BOQ dan tracking progress.',
  },
  {
    icon: Users,
    title: 'Tim Terpercaya',
    description: 'Temukan tukang dan vendor terverifikasi dengan rating dan portofolio yang jelas.',
  },
  {
    icon: Wallet,
    title: 'Pembayaran Aman',
    description: 'Sistem escrow dan verifikasi pembayaran untuk keamanan transaksi Anda.',
  },
  {
    icon: Shield,
    title: 'Terverifikasi',
    description: 'Semua vendor dan tukang telah diverifikasi KTP dan dokumen pendukungnya.',
  },
  {
    icon: MessageSquare,
    title: 'Komunikasi Real-time',
    description: 'Chat langsung dengan vendor dan tukang untuk koordinasi yang lebih baik.',
  },
  {
    icon: Truck,
    title: 'Marketplace Material',
    description: 'Cari dan bandingkan harga material dari berbagai supplier terpercaya.',
  },
];

const stats = [
  { value: '1,500+', label: 'Proyek Selesai' },
  { value: '500+', label: 'Vendor Aktif' },
  { value: '2,000+', label: 'Tukang Terdaftar' },
  { value: '98%', label: 'Kepuasan Klien' },
];

const testimonials = [
  {
    name: 'Budi Santoso',
    role: 'Pemilik Rumah',
    content: 'Platform yang sangat membantu! Saya bisa menemukan vendor terpercaya untuk renovasi rumah dengan mudah.',
    rating: 5,
  },
  {
    name: 'PT Maju Jaya',
    role: 'Vendor Konstruksi',
    content: 'Sebagai vendor, Adogalo membantu kami mendapatkan proyek baru dan manajemen tim yang lebih efisien.',
    rating: 5,
  },
  {
    name: 'Ahmad Tukang Kayu',
    role: 'Tukang',
    content: 'Sekarang saya bisa mencari pekerjaan dengan lebih mudah dan pembayaran selalu tepat waktu.',
    rating: 5,
  },
];

const roles = [
  {
    title: 'Klien',
    description: 'Pemilik proyek yang ingin membangun atau merenovasi',
    icon: UserCircle,
    color: 'from-purple-500 to-purple-600',
    benefits: ['Pasang proyek gratis', 'Pilih vendor terbaik', 'Pantau progress real-time', 'Pembayaran aman'],
  },
  {
    title: 'Vendor',
    description: 'Kontraktor atau perusahaan jasa konstruksi',
    icon: Building2,
    color: 'from-blue-500 to-blue-600',
    benefits: ['Dapatkan proyek baru', 'Kelola tim dengan mudah', 'Sistem BOQ terintegrasi', 'Reputasi terukur'],
  },
  {
    title: 'Tukang',
    description: 'Pekerja lepas dengan keahlian khusus',
    icon: Wrench,
    color: 'from-orange-500 to-orange-600',
    benefits: ['Cari pekerjaan mudah', 'Portofolio online', 'Pembayaran terjamin', 'Ulasan membangun reputasi'],
  },
  {
    title: 'Supplier',
    description: 'Penyedia material bangunan',
    icon: Truck,
    color: 'from-teal-500 to-teal-600',
    benefits: ['Jangkau klien lebih luas', 'Kelola penawaran mudah', 'Transaksi transparan', 'Laporan penjualan'],
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const role = user?.role;
  const showBuatProyek = role === 'VENDOR' || role === 'CLIENT';
  const showPermintaanMaterial = role === 'VENDOR' || role === 'CLIENT';
  const showDirektoriFull = role === 'ADMIN' || role === 'VENDOR' || role === 'CLIENT' || role === 'TUKANG';
  const showDirektoriVendorTukang = role === 'SUPPLIER';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 glass">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Adogalo"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
                Adogalo
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Fitur
              </Link>
              <Link href="#roles" className="text-muted-foreground hover:text-foreground transition-colors">
                Untuk Siapa
              </Link>
              <Link href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Testimoni
              </Link>
              {user && (
                <>
                  {showBuatProyek && (
                    <Link href="/dashboard/projects/create">
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                        <FolderPlus className="h-4 w-4" />
                        Buat Proyek
                      </Button>
                    </Link>
                  )}
                  {showPermintaanMaterial && (
                    <Link href="/dashboard/materials/create">
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                        <Package className="h-4 w-4" />
                        Permintaan Material
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Beta
                        </span>
                      </Button>
                    </Link>
                  )}
                  {(showDirektoriFull || showDirektoriVendorTukang) && (
                    <Link href="/directory/vendors">
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                        <Search className="h-4 w-4" />
                        Direktori
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <Link href="/dashboard">
                  <Button className="gap-2 bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Masuk</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90">
                      Daftar Gratis
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fd904c]/10 via-background to-[#e57835]/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#fd904c]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#e57835]/20 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Marketplace{' '}
              <span className="bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
                Konstruksi
              </span>{' '}
              Terpercaya
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Hubungkan kebutuhan proyek Anda dengan vendor, tukang, dan supplier terbaik. 
              Transaksi aman, transparan, dan profesional.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90 gap-2">
                  Mulai Sekarang
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="gap-2">
                  Pelajari Lebih Lanjut
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="glass-card rounded-xl p-4">
                  <div className="text-3xl font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Fitur Unggulan</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Semua yang Anda butuhkan untuk mengelola proyek konstruksi dalam satu platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card hover:shadow-lg transition-all group">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Untuk Siapa Adogalo?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Platform yang dirancang untuk semua pelaku industri konstruksi
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, index) => (
              <Card key={index} className="glass-card hover:shadow-lg transition-all h-full">
                <CardContent className="p-6">
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4`}>
                    <role.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">{role.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{role.description}</p>
                  <ul className="space-y-2">
                    {role.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-[#fd904c] flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Bagaimana Cara Kerjanya?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Mulai proyek Anda dalam 4 langkah mudah
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Daftar Akun', description: 'Buat akun gratis sebagai klien, vendor, tukang, atau supplier', icon: Users },
              { step: '02', title: 'Pasang/Cari Proyek', description: 'Klien pasang proyek, vendor dan tukang cari pekerjaan', icon: Layers },
              { step: '03', title: 'Kolaborasi', description: 'Diskusi, negosiasi, dan sepakati detail proyek', icon: MessageSquare },
              { step: '04', title: 'Selesai & Bayar', description: 'Proyek selesai, pembayaran diverifikasi, ulasan diberikan', icon: TrendingUp },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="glass-card rounded-xl p-6 text-center h-full">
                  <div className="text-4xl font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent mb-4">
                    {item.step}
                  </div>
                  <item.icon className="h-8 w-8 mx-auto mb-4 text-[#fd904c]" />
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {index < 3 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-3 h-6 w-6 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Apa Kata Mereka?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Testimoni dari pengguna Adogalo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass-card">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">&quot;{testimonial.content}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white font-semibold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#fd904c] to-[#e57835]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Memulai Proyek Anda?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Bergabung dengan ribuan pengguna yang telah mempercayakan proyek mereka kepada Adogalo
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Daftar Sekarang - Gratis!
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.svg"
                  alt="Adogalo"
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
                <span className="text-lg font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
                  Adogalo
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Marketplace konstruksi terpercaya untuk menghubungkan klien dengan vendor, tukang, dan supplier.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/projects" className="hover:text-foreground">Cari Proyek</Link></li>
                <li><Link href="/materials" className="hover:text-foreground">Marketplace Material</Link></li>
                <li><Link href="/vendors" className="hover:text-foreground">Vendor Terdaftar</Link></li>
                <li><Link href="/tukang" className="hover:text-foreground">Tukang Terdaftar</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">Tentang Kami</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Karir</Link></li>
                <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Kontak</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/terms" className="hover:text-foreground">Syarat & Ketentuan</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground">Kebijakan Privasi</Link></li>
                <li><Link href="/security" className="hover:text-foreground">Keamanan</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Adogalo. Hak cipta dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
