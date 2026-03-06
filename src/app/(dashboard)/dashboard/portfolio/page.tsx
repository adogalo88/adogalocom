'use client';

import { useState } from 'react';
import { usePortfolio, useDeletePortfolio, useReviews, formatDate } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Layers, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Image as ImageIcon,
  Star,
  ExternalLink,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PortfolioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const { data, isLoading, error } = usePortfolio();
  const { data: reviewsData } = useReviews({ revieweeId: user?.id });
  
  const portfolio = data?.portfolio || [];
  const reviews = reviewsData?.data || [];

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const deletePortfolio = useDeletePortfolio(deleteId || '');

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deletePortfolio.mutateAsync();
      toast.success('Portofolio berhasil dihapus');
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus portofolio');
    }
  };

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

  // Stats cards
  const stats = [
    { label: 'Total Portofolio', value: portfolio.length, icon: <Layers className="h-5 w-5" /> },
    { label: 'Rating Rata-rata', value: averageRating, icon: <Star className="h-5 w-5" /> },
    { label: 'Total Ulasan', value: reviews.length, icon: <Star className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portofolio</h1>
          <p className="text-muted-foreground">
            Kelola karya dan proyek yang telah Anda selesaikan
          </p>
        </div>
        <Link href="/dashboard/portfolio/create">
          <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835] gap-2">
            <Plus className="h-4 w-4" />
            Tambah Portofolio
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#fd904c]/20 to-[#e57835]/20 flex items-center justify-center text-[#fd904c]">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-0">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Gagal memuat data portofolio
          </CardContent>
        </Card>
      ) : portfolio.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#fd904c]/20 to-[#e57835]/20 flex items-center justify-center">
              <Layers className="h-8 w-8 text-[#fd904c]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Belum Ada Portofolio</h3>
            <p className="text-muted-foreground mb-4">
              Mulai tunjukkan karya terbaik Anda kepada calon klien
            </p>
            <Link href="/dashboard/portfolio/create">
              <Button className="bg-gradient-to-r from-[#fd904c] to-[#e57835]">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Portofolio Pertama
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolio.map((item) => {
            const isTukang = user?.role === 'TUKANG';
            const cardContent = (
              <Card key={item.id} className={`glass-card overflow-hidden group ${isTukang ? 'cursor-pointer hover:border-emerald-500/30 transition-colors' : ''}`}>
                {/* Image */}
                <div className="relative h-48 bg-muted">
                  {item.images && item.images.length > 0 ? (
                    <>
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                        onClick={(e) => {
                          if (isTukang) return; // navigation handled by parent link
                          openImagePreview(item.images, 0);
                        }}
                      />
                      {item.images.length > 1 && (
                        <Badge 
                          className="absolute bottom-2 right-2 bg-black/60 text-white hover:bg-black/70"
                        >
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {item.images.length} foto
                        </Badge>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Actions Menu */}
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="icon"
                          className="h-8 w-8 bg-white/80 backdrop-blur-sm hover:bg-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/portfolio/${item.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Content */}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(item.createdAt)}
                    </div>
                    {item.projectId && (
                      <Badge variant="outline" className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Proyek Terkait
                      </Badge>
                    )}
                  </div>
                  
                  {/* Image Thumbnails */}
                  {item.images && item.images.length > 1 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1" onClick={(e) => e.stopPropagation()}>
                      {item.images.slice(0, 4).map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => openImagePreview(item.images, idx)}
                          className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 border-transparent hover:border-[#fd904c] transition-colors"
                        >
                          <img
                            src={img}
                            alt={`${item.title} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                      {item.images.length > 4 && (
                        <button
                          onClick={() => openImagePreview(item.images, 4)}
                          className="flex-shrink-0 w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground"
                        >
                          +{item.images.length - 4}
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
            return isTukang ? (
              <Link key={item.id} href={`/dashboard/portfolio/${item.id}`} className="block">
                {cardContent}
              </Link>
            ) : (
              cardContent
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Portofolio?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Portofolio akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletePortfolio.isPending}
            >
              {deletePortfolio.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
          <DialogHeader className="absolute top-4 left-4 right-4 z-10">
            <DialogTitle className="text-white sr-only">Pratinjau Gambar</DialogTitle>
            <DialogDescription className="text-white/70 text-center">
              {previewIndex + 1} / {previewImages.length}
            </DialogDescription>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
