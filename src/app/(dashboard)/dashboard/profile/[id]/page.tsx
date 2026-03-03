'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  MapPin,
  Star,
  Briefcase,
  Clock,
  Phone,
  MessageSquare,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  UserCircle,
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatar: string | null;
  role: 'VENDOR' | 'TUKANG';
  rating: number;
  totalReviews: number;
  totalProjects: number;
  description: string | null;
  specialty: string | null;
  experience: number | null;
  phone: string | null;
  address: string | null;
  isVerified: boolean;
  city: {
    id: string;
    name: string;
    province: { id: string; name: string };
  } | null;
  createdAt: string;
  portfolio: Array<{
    id: string;
    title: string;
    description: string;
    images: string[];
    createdAt: string;
  }>;
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    reviewer: {
      id: string;
      name: string;
      avatar: string | null;
    };
    project: {
      id: string;
      title: string;
    } | null;
  }>;
  projectsAsVendor?: Array<{
    id: string;
    title: string;
    status: string;
    completedAt: string | null;
    category: { id: string; name: string } | null;
  }>;
  teamMemberships?: Array<{
    id: string;
    role: string;
    project: {
      id: string;
      title: string;
      status: string;
    };
  }>;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${params.id}/profile`);
        const data = await res.json();

        if (data.success) {
          setProfile(data.data);
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchProfile();
    }
  }, [params.id, router]);

  const handleMessage = () => {
    // Navigate to messages with this user
    router.push(`/dashboard/messages?userId=${profile?.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <UserCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Profil tidak ditemukan</h3>
      </div>
    );
  }

  const isVendor = profile.role === 'VENDOR';
  const isTukang = profile.role === 'TUKANG';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href={isVendor ? '/dashboard/directory/vendors' : '/dashboard/directory/tukangs'}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Direktori
        </Link>
      </Button>

      {/* Profile Header */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={profile.avatar || undefined} />
              <AvatarFallback className={`text-3xl text-white ${
                isVendor
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                  : 'bg-gradient-to-br from-orange-400 to-orange-600'
              }`}>
                {profile.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                {profile.isVerified && (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Terverifikasi
                  </Badge>
                )}
                <Badge variant="secondary">
                  {isVendor ? 'Vendor' : 'Tukang'}
                </Badge>
              </div>

              {/* Specialty (Tukang) */}
              {isTukang && profile.specialty && (
                <Badge className="mt-2">{profile.specialty}</Badge>
              )}

              {/* Location */}
              {profile.city && (
                <p className="text-muted-foreground flex items-center gap-1 mt-2">
                  <MapPin className="h-4 w-4" />
                  {profile.city.name}, {profile.city.province.name}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold">{profile.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({profile.totalReviews} ulasan)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="h-5 w-5" />
                  <span>{profile.totalProjects} proyek</span>
                </div>
                {isTukang && profile.experience && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-5 w-5" />
                    <span>{profile.experience} tahun pengalaman</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {profile.description && (
                <p className="mt-4 text-muted-foreground">{profile.description}</p>
              )}

              {/* Actions */}
              {user && user.id !== profile.id && (
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleMessage}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Kirim Pesan
                  </Button>
                  {profile.phone && (
                    <Button variant="outline" asChild>
                      <a href={`tel:${profile.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Hubungi
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio">Portofolio</TabsTrigger>
          <TabsTrigger value="reviews">Ulasan ({profile.totalReviews})</TabsTrigger>
          <TabsTrigger value="projects">Proyek Selesai</TabsTrigger>
        </TabsList>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-4 mt-4">
          {profile.portfolio.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada portofolio</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.portfolio.map((item) => (
                <Card key={item.id} className="glass-card overflow-hidden">
                  {item.images && item.images.length > 0 && (
                    <div className="aspect-video bg-muted">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4 mt-4">
          {profile.reviewsReceived.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada ulasan</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {profile.reviewsReceived.map((review) => (
                <Card key={review.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={review.reviewer.avatar || undefined} />
                        <AvatarFallback>
                          {review.reviewer.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.reviewer.name}</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.project && (
                          <p className="text-sm text-muted-foreground">
                            Proyek: {review.project.title}
                          </p>
                        )}
                        <p className="mt-2">{review.comment}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4 mt-4">
          {isVendor && profile.projectsAsVendor && profile.projectsAsVendor.length === 0 && (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada proyek selesai</p>
              </CardContent>
            </Card>
          )}

          {isVendor && profile.projectsAsVendor && profile.projectsAsVendor.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.projectsAsVendor.map((project) => (
                <Card key={project.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{project.title}</h3>
                        {project.category && (
                          <Badge variant="outline" className="mt-1">
                            {project.category.name}
                          </Badge>
                        )}
                      </div>
                      <Badge className="bg-green-100 text-green-700">Selesai</Badge>
                    </div>
                    {project.completedAt && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selesai: {new Date(project.completedAt).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isTukang && profile.teamMemberships && profile.teamMemberships.length === 0 && (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada proyek selesai</p>
              </CardContent>
            </Card>
          )}

          {isTukang && profile.teamMemberships && profile.teamMemberships.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.teamMemberships.map((membership) => (
                <Card key={membership.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{membership.project.title}</h3>
                        <Badge variant="outline" className="mt-1">
                          {membership.role.replace('TUKANG_', 'Tukang ').replace('_', ' ')}
                        </Badge>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Selesai</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
