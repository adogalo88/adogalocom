'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Star,
  MapPin,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

type PortfolioData = {
  id: string;
  userId: string;
  title: string;
  description: string;
  images: string[];
  projectId: string | null;
  completedYear: number | null;
  cityId: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null; role: string; isVerified: boolean };
  city: { id: string; name: string; province?: { name: string } } | null;
  project: { id: string; title: string } | null;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { id: string; name: string; avatar: string | null };
  }>;
  averageRating: number | null;
  totalReviews: number;
};

export default function DirectoryPortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/directory/portfolio/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data) setData(res.data);
        else router.push('/directory/tukangs');
      })
      .catch(() => router.push('/directory/tukangs'))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!data || !currentUser) return;
    const mine = data.reviews.find((r) => r.user.id === currentUser.id);
    if (mine) {
      setHasReviewed(true);
      setRating(mine.rating);
      setComment(mine.comment ?? '');
    }
  }, [data, currentUser]);

  const handleSubmitReview = async () => {
    if (!id || !currentUser) {
      toast.error('Anda harus login untuk memberi rating dan komentar');
      return;
    }
    if (data?.userId === currentUser.id) {
      toast.error('Anda tidak dapat mengulas portofolio sendiri');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/directory/portfolio/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || null }),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? 'Gagal menyimpan ulasan');
        setSubmitting(false);
        return;
      }
      toast.success(hasReviewed ? 'Ulasan diperbarui' : 'Ulasan berhasil dikirim');
      setHasReviewed(true);
      // Refresh portfolio data to show new review
      const refetch = await fetch(`/api/directory/portfolio/${id}`);
      const refetchJson = await refetch.json();
      if (refetchJson?.success && refetchJson.data) setData(refetchJson.data);
    } catch {
      toast.error('Gagal menyimpan ulasan');
    } finally {
      setSubmitting(false);
    }
  };

  const nextImage = () => {
    if (!data?.images?.length) return;
    setPreviewIndex((i) => (i + 1) % data.images.length);
    setPreviewImage(data.images[(previewIndex + 1) % data.images.length]);
  };
  const prevImage = () => {
    if (!data?.images?.length) return;
    const next = (previewIndex - 1 + data.images.length) % data.images.length;
    setPreviewIndex(next);
    setPreviewImage(data.images[next]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) return null;

  const images = data.images ?? [];
  const isOwner = currentUser?.id === data.userId;
  const canReview = currentUser && !isOwner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/directory/tukangs/${data.userId}`} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke profil tukang
            </Link>
          </Button>
        </div>

        <Card className="border border-white/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-xl overflow-hidden mb-8">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative bg-muted/50 min-h-[260px] md:min-h-[320px]">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[0]}
                    alt={data.title}
                    className="w-full h-full object-cover min-h-[260px] md:min-h-[320px] cursor-pointer"
                    onClick={() => {
                      setPreviewImage(images[0]);
                      setPreviewIndex(0);
                    }}
                  />
                  {images.length > 1 && (
                    <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto pb-1">
                      {images.slice(0, 5).map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPreviewImage(img);
                            setPreviewIndex(idx);
                          }}
                          className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-white/80 shadow"
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
                </>
              ) : (
                <div className="w-full h-full min-h-[260px] flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <CardContent className="p-6 md:p-8 flex flex-col justify-center">
              <h1 className="text-2xl font-bold text-foreground">{data.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(data.createdAt).toLocaleDateString('id-ID')}
                {data.completedYear && (
                  <>
                    <span className="mx-1">·</span>
                    <span>Tahun selesai: {data.completedYear}</span>
                  </>
                )}
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap mt-4">{data.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {data.city && (
                  <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <MapPin className="h-3 w-3" />
                    {data.city.name}
                    {data.city.province?.name && `, ${data.city.province.name}`}
                  </Badge>
                )}
                {data.project && (
                  <Link href={`/directory/tukangs/${data.userId}`}>
                    <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-emerald-500/10">
                      <ExternalLink className="h-3 w-3" />
                      Proyek: {data.project.title}
                    </Badge>
                  </Link>
                )}
              </div>
              <Link href={`/directory/tukangs/${data.userId}`} className="mt-6 flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Avatar className="h-10 w-10 ring-2 ring-emerald-500/30">
                  <AvatarImage src={data.user.avatar ?? undefined} />
                  <AvatarFallback className="bg-emerald-600 text-white">{data.user.name?.charAt(0) ?? 'T'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{data.user.name}</p>
                  <p className="text-sm text-muted-foreground">Lihat profil tukang</p>
                </div>
              </Link>
            </CardContent>
          </div>
        </Card>

        {/* Rating & Ulasan */}
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              Rating & Ulasan
              {data.averageRating != null && (
                <span className="text-muted-foreground font-normal">
                  ({data.averageRating.toFixed(1)} · {data.totalReviews} ulasan)
                </span>
              )}
            </h2>
          </div>

          {canReview && (
            <Card className="border border-white/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl">
              <CardContent className="p-6">
                <p className="font-medium mb-3">{hasReviewed ? 'Edit ulasan Anda' : 'Berikan rating dan komentar'}</p>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <Star className={`h-8 w-8 ${v <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Tulis komentar (opsional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[80px] mb-3"
                  maxLength={2000}
                />
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  {hasReviewed ? 'Perbarui Ulasan' : 'Kirim Ulasan'}
                </Button>
              </CardContent>
            </Card>
          )}

          {!currentUser && (
            <Card className="border border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
              <CardContent className="py-6 text-center text-muted-foreground">
                <p className="mb-2">Login untuk memberi rating dan komentar</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/login?redirect=${encodeURIComponent(`/directory/portfolio/${id}`)}`}>Masuk</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {data.reviews.length === 0 ? (
              <Card className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Belum ada ulasan. Jadilah yang pertama mengulas.
                </CardContent>
              </Card>
            ) : (
              data.reviews.map((review) => (
                <Card key={review.id} className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={review.user.avatar ?? undefined} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">{review.user.name?.charAt(0) ?? '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{review.user.name}</p>
                        <div className="flex gap-0.5 items-center">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className={`h-4 w-4 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                          ))}
                          <span className="text-sm text-muted-foreground ml-1">
                            {new Date(review.createdAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.comment && <p className="mt-2 text-muted-foreground">{review.comment}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
          {previewImage && (
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain" />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                    {previewIndex + 1} / {images.length}
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
