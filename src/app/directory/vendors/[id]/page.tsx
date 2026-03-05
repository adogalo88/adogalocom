'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  MapPin,
  Star,
  Briefcase,
  MessageSquare,
  Phone,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function DirectoryVendorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/directory/vendors/${params.id}`);
        const data = await res.json();
        if (data?.success && data.data) {
          setProfile(data.data);
        } else {
          router.push('/directory/vendors');
        }
      } catch {
        router.push('/directory/vendors');
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) fetchProfile();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fd904c]/5 via-background to-[#e57835]/5">
        <Loader2 className="h-12 w-12 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  if (!profile) return null;

  const portfolio = (profile.portfolio as Array<{ id: string; title: string; description: string; images: string | string[] }>) ?? [];
  const reviews = (profile.reviewsReceived as Array<{ id: string; rating: number; comment: string; createdAt: string; reviewer: { name: string; avatar: string | null }; project: { title: string } | null }>) ?? [];
  const projects = (profile.projectsAsVendor as Array<{ id: string; title: string; category: { name: string } | null }>) ?? [];
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
    <div className="min-h-screen bg-gradient-to-br from-[#fd904c]/10 via-background to-[#e57835]/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/directory/vendors" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Direktori Vendor
          </Link>
        </Button>

        {/* Hero card - glassmorphism */}
        <Card className="border border-white/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-xl mb-8 overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <Avatar className="h-28 w-28 md:h-36 md:w-36 ring-4 ring-white/50 shadow-lg">
                <AvatarImage src={(profile.avatar as string) ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-4xl">
                  {(profile.name as string)?.charAt(0)?.toUpperCase() ?? 'V'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{profile.name as string}</h1>
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Terverifikasi
                  </Badge>
                  <Badge variant="secondary">Vendor</Badge>
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
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="h-5 w-5" />
                    <span>{profile.totalProjects} proyek</span>
                  </div>
                </div>
                {profile.description && (
                  <p className="mt-4 text-muted-foreground">{profile.description as string}</p>
                )}
                <div className="flex gap-2 mt-6">
                  <Button asChild className="bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90">
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
            <TabsTrigger value="projects">Proyek Selesai</TabsTrigger>
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

          <TabsContent value="projects">
            {projects.length === 0 ? (
              <Card className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                <CardContent className="py-16 text-center">
                  <Briefcase className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Belum ada proyek selesai</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <Card key={p.id} className="border-white/20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-medium">{p.title}</span>
                      {p.category && <Badge variant="secondary">{p.category.name}</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
