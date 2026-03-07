'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReviews, useProjects, useCreateReview, formatCurrency, formatDate, getProjectStatusConfig } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Star,
  MessageSquare,
  User,
  Send,
  FolderKanban,
  TrendingUp,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

// Star Rating Component
function StarRating({ rating, onRatingChange, readonly = false, size = 'md' }: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRatingChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const DIMENSION_LABELS: Record<string, Record<string, string>> = {
  CLIENT_TO_VENDOR: {
    quality: 'Kualitas pekerjaan',
    timeliness: 'Ketepatan waktu',
    communication: 'Komunikasi',
    professionalism: 'Profesionalitas',
    specMatch: 'Kesesuaian hasil dengan spesifikasi',
  },
  VENDOR_TO_CLIENT: {
    clarity: 'Kejelasan Proyek',
    communication: 'Komunikasi',
    consistency: 'Konsistensi Kesepakatan',
    professionalism: 'Profesionalitas',
    coordination: 'Kemudahan Koordinasi Lapangan',
  },
};

// Infer reviewType dari dimension keys jika reviewType null (fallback untuk data lama/migration)
function inferReviewType(dims: Record<string, number>): 'CLIENT_TO_VENDOR' | 'VENDOR_TO_CLIENT' | null {
  const keys = Object.keys(dims);
  if (keys.some((k) => k === 'quality' || k === 'specMatch')) return 'CLIENT_TO_VENDOR';
  if (keys.some((k) => k === 'clarity' || k === 'consistency' || k === 'coordination')) return 'VENDOR_TO_CLIENT';
  return null;
}

// Review Card Component - received: reviewee bisa membalas 1x
function ReviewCard({ review, type, currentUserId, onReplySubmit }: {
  review: any;
  type: 'given' | 'received';
  currentUserId?: string;
  onReplySubmit?: (reviewId: string, reply: string) => Promise<void>;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const user = type === 'given' ? review.reviewee : review.reviewer;
  const actionText = type === 'given' ? 'Anda review' : 'mereview Anda';
  const canReply = type === 'received' && currentUserId === review.reviewee?.id && !review.reply;
  const rawDims = review.dimensionRatings;
  const dims: Record<string, number> | null =
    rawDims && typeof rawDims === 'object' && !Array.isArray(rawDims)
      ? (rawDims as Record<string, number>)
      : typeof rawDims === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(rawDims) as Record<string, number>;
              return typeof parsed === 'object' && parsed !== null ? parsed : null;
            } catch {
              return null;
            }
          })()
        : null;
  const reviewType = (review.reviewType as string) || (dims ? inferReviewType(dims) : null);
  const labels = reviewType ? DIMENSION_LABELS[reviewType as keyof typeof DIMENSION_LABELS] : null;

  return (
    <Card className="glass-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white">
                {user?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{actionText}</p>
            </div>
          </div>
          <StarRating rating={review.rating} readonly size="sm" />
        </div>

        {dims && labels && Object.keys(dims).length > 0 && (
          <div className="space-y-1.5 py-2 border-y border-border">
            {Object.entries(dims).map(([key, val]) => labels[key] && (
              <div key={key} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{labels[key]}</span>
                <StarRating rating={val} readonly size="sm" />
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">{review.comment}</p>

        {review.reply && (
          <div className="rounded-lg bg-muted/50 p-3 border-l-4 border-primary/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Balasan dari {review.reviewee?.name}</p>
            <p className="text-sm text-foreground">{review.reply}</p>
            {review.repliedAt && (
              <p className="text-xs text-muted-foreground mt-1">{formatDate(review.repliedAt)}</p>
            )}
          </div>
        )}

        {canReply && !review.reply && (
          <div className="pt-2">
            {!showReplyForm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReplyForm(true)}
                className="text-xs"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Balas Ulasan (sekali saja)
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Tulis balasan Anda (min. 10 karakter)..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[70px] text-sm"
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={replyText.trim().length < 10 || submittingReply}
                    onClick={async () => {
                      if (!onReplySubmit || replyText.trim().length < 10) return;
                      setSubmittingReply(true);
                      try {
                        await onReplySubmit(review.id, replyText.trim());
                        setReplyText('');
                        setShowReplyForm(false);
                        toast.success('Balasan terkirim');
                      } catch {
                        toast.error('Gagal mengirim balasan');
                      } finally {
                        setSubmittingReply(false);
                      }
                    }}
                  >
                    {submittingReply && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Kirim Balasan
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowReplyForm(false); setReplyText(''); }}>
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {review.project && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
            <FolderKanban className="h-3 w-3" />
            <span>{review.project.title}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{formatDate(review.createdAt)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('received');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedRevieweeId, setSelectedRevieweeId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Fetch reviews given by user
  const { data: givenReviewsData, isLoading: givenLoading } = useReviews({
    reviewerId: user?.id,
  });

  // Fetch reviews received by user
  const { data: receivedReviewsData, isLoading: receivedLoading } = useReviews({
    revieweeId: user?.id,
  });

  // Fetch completed projects for review creation
  const { data: completedProjectsData } = useProjects({
    status: 'COMPLETED',
  });

  const createReview = useCreateReview();
  const queryClient = useQueryClient();

  const handleReplySubmit = async (reviewId: string, reply: string) => {
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reply }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Gagal mengirim balasan');
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
  };

  const givenReviews = givenReviewsData?.data || [];
  const receivedReviews = receivedReviewsData?.data || [];
  const completedProjects = completedProjectsData?.data || [];

  // Calculate stats
  const totalReviewsReceived = receivedReviews.length;
  const totalReviewsGiven = givenReviews.length;
  const averageRating = totalReviewsReceived > 0
    ? (receivedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsReceived).toFixed(1)
    : '0.0';

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: receivedReviews.filter(r => r.rating === star).length,
    percentage: totalReviewsReceived > 0
      ? (receivedReviews.filter(r => r.rating === star).length / totalReviewsReceived) * 100
      : 0,
  }));

  const isLoading = givenLoading || receivedLoading;

  // Get potential reviewees from selected project
  const selectedProject = completedProjects.find(p => p.id === selectedProjectId);
  const potentialReviewees = selectedProject ? [
    ...(selectedProject.client && selectedProject.client.id !== user?.id ? [selectedProject.client] : []),
    ...(selectedProject.vendor && selectedProject.vendor.id !== user?.id ? [selectedProject.vendor] : []),
  ] : [];

  const handleCreateReview = async () => {
    if (!selectedProjectId || !selectedRevieweeId || !comment.trim()) {
      toast.error('Harap lengkapi semua field');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Komentar minimal 10 karakter');
      return;
    }

    try {
      await createReview.mutateAsync({
        projectId: selectedProjectId,
        revieweeId: selectedRevieweeId,
        rating,
        comment: comment.trim(),
      });
      toast.success('Review berhasil dikirim!');
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim review');
    }
  };

  const resetForm = () => {
    setSelectedProjectId('');
    setSelectedRevieweeId('');
    setRating(5);
    setComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ulasan & Rating</h1>
          <p className="text-muted-foreground">
            Lihat ulasan yang Anda terima dan berikan
          </p>
        </div>
        {completedProjects.length > 0 && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
          >
            <Send className="h-4 w-4 mr-2" />
            Berikan Ulasan
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{averageRating}</p>
              <p className="text-sm text-muted-foreground">Rating Rata-rata</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#fd904c]/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-[#fd904c]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalReviewsReceived}</p>
              <p className="text-sm text-muted-foreground">Ulasan Diterima</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#e57835]/10 flex items-center justify-center">
              <Send className="h-6 w-6 text-[#e57835]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalReviewsGiven}</p>
              <p className="text-sm text-muted-foreground">Ulasan Diberikan</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{user?.totalReviews || 0}</p>
              <p className="text-sm text-muted-foreground">Total Review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Rating Distribution */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribusi Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium">{star}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#fd904c] to-[#e57835] transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8">{count}</span>
              </div>
            ))}

            {totalReviewsReceived === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Belum ada ulasan
              </p>
            )}
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received">
                Diterima ({totalReviewsReceived})
              </TabsTrigger>
              <TabsTrigger value="given">
                Diberikan ({totalReviewsGiven})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : receivedReviews.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Belum ada ulasan yang diterima</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {receivedReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} type="received" currentUserId={user?.id} onReplySubmit={handleReplySubmit} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="given" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : givenReviews.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="py-12 text-center">
                    <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Belum ada ulasan yang diberikan</p>
                    {completedProjects.length > 0 && (
                      <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="mt-4"
                        variant="outline"
                      >
                        Berikan Ulasan Pertama
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {givenReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} type="given" currentUserId={user?.id} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Review Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Beri Ulasan</DialogTitle>
            <DialogDescription>
              Berikan ulasan untuk proyek yang telah selesai
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Select Project */}
            <div className="space-y-2">
              <Label>Pilih Proyek</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih proyek yang selesai" />
                </SelectTrigger>
                <SelectContent>
                  {completedProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span>{project.title}</span>
                        {project.budget && (
                          <span className="text-xs text-muted-foreground">
                            ({formatCurrency(project.budget)})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Reviewee */}
            {selectedProjectId && (
              <div className="space-y-2">
                <Label>Review Untuk</Label>
                <Select value={selectedRevieweeId} onValueChange={setSelectedRevieweeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih orang yang ingin direview" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialReviewees.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-gradient-to-br from-[#fd904c] to-[#e57835] text-white text-xs">
                              {person.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{person.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {potentialReviewees.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada orang yang dapat direview dari proyek ini
                  </p>
                )}
              </div>
            )}

            {/* Rating */}
            {selectedRevieweeId && (
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-4">
                  <StarRating rating={rating} onRatingChange={setRating} size="lg" />
                  <span className="text-lg font-semibold">{rating}/5</span>
                </div>
              </div>
            )}

            {/* Comment */}
            {selectedRevieweeId && (
              <div className="space-y-2">
                <Label>Komentar</Label>
                <Textarea
                  placeholder="Bagikan pengalaman Anda bekerja dengan orang ini..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Minimal 10 karakter ({comment.length}/1000)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Batal
            </Button>
            <Button
              onClick={handleCreateReview}
              disabled={createReview.isPending || !selectedProjectId || !selectedRevieweeId || comment.trim().length < 10}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {createReview.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Kirim Ulasan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
