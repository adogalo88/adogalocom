'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Search, 
  MapPin, 
  Calendar,
  Clock,
  Loader2,
  Users,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface RFQSubmission {
  id: string;
  status: string;
  totalOffer: number | null;
  vendor: {
    id: string;
    name: string;
    rating: number;
  };
}

interface RFQItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
}

interface RFQ {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  project: {
    id: string;
    title: string;
    location: string | null;
    budget: number | null;
    client: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
  };
  items: RFQItem[];
  submissions: RFQSubmission[];
  _count?: {
    submissions: number;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  PUBLISHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CLOSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Tersedia',
  CLOSED: 'Ditutup',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
};

const submissionStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-600',
  ACCEPTED: 'bg-green-100 text-green-600',
  REJECTED: 'bg-red-100 text-red-600',
};

export default function RFQListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  const { user } = useAuth();
  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRFQs();
  }, [projectIdFromUrl]);

  const fetchRFQs = async () => {
    try {
      const params = new URLSearchParams();
      if (projectIdFromUrl) {
        params.set('projectId', projectIdFromUrl);
        params.set('limit', '50');
      }
      const url = params.toString() ? `/api/rfq?${params}` : '/api/rfq';
      const response = await fetch(url, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setRFQs(Array.isArray(result.data) ? result.data : []);
      } else {
        setRFQs([]);
      }
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      setRFQs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRFQs = rfqs.filter((rfq) =>
    rfq.title.toLowerCase().includes(search.toLowerCase()) ||
    rfq.project.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMySubmission = (rfq: RFQ) => {
    return rfq.submissions.find(s => s.vendor.id === user?.id);
  };

  const getLowestOffer = (rfq: RFQ) => {
    const submittedOffers = rfq.submissions
      .filter(s => s.status === 'SUBMITTED' && s.totalOffer)
      .sort((a, b) => (a.totalOffer || 0) - (b.totalOffer || 0));
    return submittedOffers[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">RFQ (Request for Quotation)</h1>
          <p className="text-muted-foreground">
            {user?.role === 'VENDOR' 
              ? 'Lihat dan kirim penawaran untuk permintaan quotation'
              : 'Kelola permintaan quotation proyek Anda'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari RFQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* RFQ List */}
      {filteredRFQs.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {search 
                ? 'Tidak ada RFQ yang sesuai dengan pencarian'
                : 'Belum ada RFQ tersedia'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRFQs.map((rfq) => {
            const mySubmission = getMySubmission(rfq);
            const lowestOffer = getLowestOffer(rfq);
            
            return (
              <Card 
                key={rfq.id} 
                className="glass-card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/rfq/${rfq.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{rfq.project.title}</h3>
                        <Badge className={statusColors[rfq.status]}>
                          {statusLabels[rfq.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rfq.title}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{rfq.project.location || 'Lokasi tidak disebutkan'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(rfq.createdAt).toLocaleDateString('id-ID')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{rfq.items.length} item pekerjaan</span>
                        </div>
                        {rfq.deadline && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Deadline: {new Date(rfq.deadline).toLocaleDateString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-center gap-2">
                      {/* Submission count for clients */}
                      {user?.role !== 'VENDOR' && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{rfq._count?.submissions || rfq.submissions.length} penawaran</span>
                        </div>
                      )}

                      {/* Lowest offer for clients */}
                      {user?.role !== 'VENDOR' && lowestOffer && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-[#fd904c]" />
                          <span className="text-lg font-bold text-[#fd904c]">
                            {formatCurrency(lowestOffer.totalOffer!)}
                          </span>
                          <span className="text-xs text-muted-foreground">termurah</span>
                        </div>
                      )}

                      {/* My submission status for vendors */}
                      {user?.role === 'VENDOR' && mySubmission && (
                        <div className="flex items-center gap-2">
                          <Badge className={submissionStatusColors[mySubmission.status]}>
                            {mySubmission.status === 'SUBMITTED' ? 'Sudah Mengajukan' :
                             mySubmission.status === 'ACCEPTED' ? 'Diterima' :
                             mySubmission.status === 'REJECTED' ? 'Ditolak' : 'Draft'}
                          </Badge>
                          {mySubmission.totalOffer && (
                            <span className="text-sm font-medium">
                              {formatCurrency(mySubmission.totalOffer)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action button */}
                      {user?.role === 'VENDOR' && !mySubmission && (rfq.status === 'PUBLISHED' || rfq.status === 'CLOSED') && (
                        <Button 
                          className="bg-[#fd904c] hover:bg-[#fd904c]/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/rfq/${rfq.id}`);
                          }}
                        >
                          Kirim Penawaran
                        </Button>
                      )}

                      <Button variant="outline" size="sm">
                        Lihat Detail
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
