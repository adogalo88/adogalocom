'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  MapPin,
  Star,
  MessageSquare,
  Phone,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function DirectoryTukangProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/directory/tukangs/${params.id}`);
        const data = await res.json();
        if (data?.success && data.data) {
          setProfile(data.data);
        } else {
          router.push('/directory/tukangs');
        }
      } catch {
        router.push('/directory/tukangs');
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) fetchProfile();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!profile) return null;

  const portfolio = (profile.portfolio as Array<{ id: string; title: string; description: string; images: string | string[] }>) ?? [];
  const reviews = (profile.reviewsReceived as Array<{ id: string; rating: number; comment: string; createdAt: string; reviewer: { name: string; avatar: string | null }; project: { title: string } | null }>) ?? [];
  const city = profile.city as { name: string; province: { name: string } } | null;

  const parseImages = (img: string | string[] | undefined): string[] => {
    if (!img) return [];
    if (Array.isArray(img)) return img;
    try {
      const parsed = JSON.parse(img as string);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [img as string];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/directory/tukangs" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Direktori Tukang
          </Link>
        </Button>

        <Card className="border border-white/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-xl mb-8 overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <button
                type="button"
                onClick={() => profile.avatar && setEnlargedImage(profile.avatar as string)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shrink-0"
              >
                <Avatar className="h-28 w-28 md:h-36 md:w-36 ring-4 ring-white/50 shadow-lg cursor-pointer hover:ring-emerald-500/50 transition-all">
                  <AvatarImage src={(profile.avatar as string) ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-4xl">
                    {(profile.name as string)?.charAt(0)?.toUpperCase() ?? 'T'}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{profile.name as string}</h1>
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Terverifikasi
                  </Badge>
                  <Badge variant="secondary">Tukang</Badge>
                  {(profile.skills as { id: string; name: string }[])?.length > 0
                    ? (profile.skills as { id: string; name: string }[]).map((s) => (
                        <Badge key={s.id} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">{s.name}</Badge>
                      ))
                    : profile.specialty && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">{profile.specialty as string}</Badge>
                      )}
                </div>
                {city && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-2">
                    <MapPin className="h-4 w-4" />
                    {city.name}, {city.province?.name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-6 mt-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="text-lg font-semibold">{(profile.rating as number)?.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({profile.totalReviews} ulasan)</span>
                  </div>
                  {profile.experience != null && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-5 w-5" />
                      <span>{profile.experience} tahun pengalaman</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>{profile.totalProjects} proyek</span>
                  </div>
                </div>
                {profile.description && (
                  <p className="mt-4 text-muted-foreground">{profile.description as string}</p>
                )}
                <div className="flex gap-2 mt-6">
                  <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90">
                    <Link href={`/dashboard/messages?userId=${profile.id}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </Link>
                  </Button>
                  {profile.phone && (
                    <Button variant="outline" asChild>
                      <a href={`https://wa.me/62${(profile.phone as string).replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer">
                        <Phone className="h-4 w-4 mr-2" />
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="bg-white/60 dark:bg-gray-900/60 backdrop-blur border border-white/20">
            <TabsTrigger value="portfolio">Portofolio</TabsTrigger>
            <TabsTrigger value="reviews">Ulasan ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio">
            {portfolio.length === 0 ? (
              <Card className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                <CardContent className="py-16 text-center">
                  <ImageIcon className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Belum ada portofolio</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portfolio.map((item) => {
                  const imgs = parseImages(item.images);
                  return (
                    <Card key={item.id} className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl overflow-hidden">
                      {imgs[0] && (
                        <div className="aspect-video bg-muted">
                          <img src={imgs[0]} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <Card className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                <CardContent className="py-16 text-center">
                  <Star className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Belum ada ulasan</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.reviewer.name}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className={`h-4 w-4 ${i <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                          ))}
                        </div>
                      </div>
                      {review.project && <p className="text-sm text-muted-foreground mt-1">Proyek: {review.project.title}</p>}
                      <p className="mt-2">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto profil</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            <img
              src={enlargedImage}
              alt="Foto profil"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
