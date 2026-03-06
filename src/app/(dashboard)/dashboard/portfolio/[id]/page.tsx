'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { usePortfolioById, usePortfolio, formatDate } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  MapPin,
  ExternalLink,
  Layers,
  Loader2,
} from 'lucide-react';

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string | undefined;
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const { data, isLoading, error } = usePortfolioById(id ?? null);
  const portfolio = data?.portfolio;

  // Other portfolios from the same tukang (only when this is tukang's portfolio)
  const isTukang = user?.role === 'TUKANG';
  const { data: listData } = usePortfolio(portfolio?.userId);
  const allFromUser = listData?.portfolio ?? [];
  const otherPortfolios = allFromUser.filter((p) => p.id !== id);

  useEffect(() => {
    if (!user) return;
    if (!isTukang) {
      router.replace('/dashboard/portfolio');
      return;
    }
    if (portfolio && portfolio.userId !== user.id) {
      router.replace('/dashboard/portfolio');
    }
  }, [user, isTukang, portfolio, router]);

  const openImagePreview = (images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
    setPreviewImage(images[index]);
  };

  const nextImage = () => {
    const newIndex = (previewIndex + 1) % previewImages.length;
    setPreviewIndex(newIndex);
    setPreviewImage(previewImages[newIndex]);
  };

  const prevImage = () => {
    const newIndex = (previewIndex - 1 + previewImages.length) % previewImages.length;
    setPreviewIndex(newIndex);
    setPreviewImage(previewImages[newIndex]);
  };

  if (!user || !isTukang) return null;

  if (isLoading || !id) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/portfolio">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Portofolio
          </Button>
        </Link>
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Portofolio tidak ditemukan atau Anda tidak memiliki akses.
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = Array.isArray(portfolio.images) ? portfolio.images : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/portfolio">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{portfolio.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(portfolio.createdAt)}
              {portfolio.completedYear && (
                <>
                  <span className="mx-1">·</span>
                  <span>Tahun selesai: {portfolio.completedYear}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/portfolio/${portfolio.id}/edit`}>
          <Button variant="outline" size="sm">
            Edit Portofolio
          </Button>
        </Link>
      </div>

      {/* Main content - glassmorphism style for tukang */}
      <Card className="glass-card overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Images */}
          <div className="relative bg-muted/50 min-h-[280px] md:min-h-[360px]">
            {images.length > 0 ? (
              <div className="relative w-full h-full">
                <img
                  src={images[0]}
                  alt={portfolio.title}
                  className="w-full h-full object-cover min-h-[280px] md:min-h-[360px] cursor-pointer"
                  onClick={() => openImagePreview(images, 0)}
                />
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto pb-1">
                    {images.slice(0, 5).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          openImagePreview(images, idx);
                        }}
                        className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-white/80 shadow hover:border-emerald-400 transition-colors"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <span className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-lg bg-black/40 text-white text-xs">
                        +{images.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full min-h-[280px] md:min-h-[360px] flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <CardContent className="p-6 md:p-8 flex flex-col justify-center">
            <CardDescription className="text-base whitespace-pre-wrap mb-4">
              {portfolio.description}
            </CardDescription>
            <div className="flex flex-wrap gap-2 mt-auto">
              {portfolio.city && (
                <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <MapPin className="h-3 w-3" />
                  {portfolio.city.name}
                  {portfolio.city.province?.name && `, ${portfolio.city.province.name}`}
                </Badge>
              )}
              {portfolio.completedYear && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  {portfolio.completedYear}
                </Badge>
              )}
              {portfolio.project && (
                <Link href={`/dashboard/projects/${portfolio.project.id}`}>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-emerald-500/10">
                    <ExternalLink className="h-3 w-3" />
                    Proyek: {portfolio.project.title}
                  </Badge>
                </Link>
              )}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Portofolio lainnya dari tukang ini - only for TUKANG */}
      {isTukang && otherPortfolios.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            Portofolio lainnya dari Anda
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherPortfolios.map((item) => {
              const itemImages = Array.isArray(item.images) ? item.images : [];
              return (
                <Link key={item.id} href={`/dashboard/portfolio/${item.id}`}>
                  <Card className="glass-card overflow-hidden h-full transition-all hover:border-emerald-500/30 hover:shadow-md">
                    <div className="relative h-40 bg-muted">
                      {itemImages.length > 0 ? (
                        <img
                          src={itemImages[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {itemImages.length > 1 && (
                        <Badge className="absolute bottom-2 right-2 bg-black/60 text-white text-xs">
                          {itemImages.length} foto
                        </Badge>
                      )}
                    </div>
                    <CardHeader className="py-3">
                      <CardTitle className="text-base line-clamp-1">{item.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-sm">
                        {item.description}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(item.createdAt)}
                      </p>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
          <DialogHeader className="absolute top-4 left-4 right-4 z-10">
            <DialogTitle className="text-white sr-only">Pratinjau Gambar</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
              {previewImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                    {previewIndex + 1} / {previewImages.length}
                  </p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
