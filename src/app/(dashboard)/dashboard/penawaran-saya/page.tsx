'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  MapPin,
  Loader2,
  DollarSign,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface ProjectRow {
  id: string;
  rfqId: string | null;
  projectTitle: string;
  projectCity: string | null;
  totalOffer: number | null;
  status: string;
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PenawaranSayaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'VENDOR') {
      router.replace('/dashboard');
      return;
    }
    fetchProjects();
  }, [user, router]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?vendorHasRfqSubmission=1&limit=100', { credentials: 'include' });
      const result = await res.json();
      if (!result.success || !Array.isArray(result.data)) {
        setRows([]);
        return;
      }
      const projects = result.data as {
        id: string;
        title: string;
        city?: { name: string } | null;
        rfq?: {
          id: string;
          submissions?: { status: string; totalOffer: number | null }[];
        } | null;
      }[];
      const list: ProjectRow[] = projects.map((p) => {
        const sub = p.rfq?.submissions?.[0];
        return {
          id: p.id,
          rfqId: p.rfq?.id ?? null,
          projectTitle: p.title ?? 'Proyek',
          projectCity: p.city?.name ?? null,
          totalOffer: sub?.totalOffer ?? null,
          status: sub?.status ?? 'DRAFT',
        };
      });
      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;
  if (user.role !== 'VENDOR') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-[#fd904c]" />
          Penawaran Saya
        </h1>
        <p className="text-muted-foreground mt-1">
          Daftar penawaran RFQ yang telah Anda kirim. Pantau status dari sini.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Daftar Penawaran</CardTitle>
          <CardDescription>
            Proyek yang sudah Anda buat penawarannya. Klik baris untuk langsung melihat penawaran Anda di halaman RFQ proyek tersebut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada penawaran. Kirim penawaran dari halaman Proyek Tender.</p>
              <Button asChild className="mt-4 bg-[#fd904c] hover:bg-[#e57835]">
                <Link href="/proyek-tender">Lihat Proyek Tender</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.rfqId ? `/dashboard/rfq/${row.rfqId}` : `/dashboard/projects/${row.id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {row.projectTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {row.projectCity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            Proyek di {row.projectCity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Nilai penawaran Anda</p>
                        <p className="text-lg font-bold text-[#fd904c]">
                          {row.totalOffer != null ? formatCurrency(row.totalOffer) : '–'}
                        </p>
                      </div>
                      <Badge className={statusColors[row.status] ?? 'bg-muted'}>
                        {statusLabels[row.status] ?? row.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
