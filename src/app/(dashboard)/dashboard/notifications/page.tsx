'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

function getNotificationLink(notif: NotificationItem): string | null {
  if (!notif.data) return null;
  try {
    const d = JSON.parse(notif.data) as Record<string, string>;
    if (d.projectId) return `/dashboard/projects/${d.projectId}`;
    if (d.materialId) return `/dashboard/materials/${d.materialId}`;
    if (d.applicationId && d.projectId) return `/dashboard/projects/${d.projectId}`;
    if (d.offerId && d.materialId) return `/dashboard/materials/${d.materialId}`;
  } catch {
    // ignore
  }
  return null;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?page=1&limit=50');
      if (!res.ok) throw new Error('Gagal memuat notifikasi');
      const json = await res.json();
      return {
        data: (json?.data ?? []) as NotificationItem[],
        pagination: json?.pagination,
        unreadCount: json?.unreadCount ?? 0,
      };
    },
  });

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'notifications'] });
      }
    } catch {
      toast.error('Gagal menandai dibaca');
    }
  };

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Notifikasi</h1>
        <p className="text-muted-foreground mt-1">
          {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua notifikasi'}
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Daftar Notifikasi</CardTitle>
          <CardDescription>Notifikasi terkait proyek, material, pembayaran, dan aktivitas Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Belum ada notifikasi</p>
              <p className="text-sm mt-1">Notifikasi akan muncul di sini ketika ada aktivitas terkait akun Anda.</p>
              <Link href="/dashboard">
                <Button variant="outline" className="mt-4">Kembali ke Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => {
                const href = getNotificationLink(notif);
                const content = (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                      notif.isRead ? 'bg-muted/30' : 'bg-primary/5 border border-primary/10'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {notif.isRead ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <div key={notif.id}>
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !notif.isRead && markAsRead(notif.id)}
                        onKeyDown={(e) => e.key === 'Enter' && !notif.isRead && markAsRead(notif.id)}
                      >
                        {content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
