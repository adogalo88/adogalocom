'use client';

import { useState, useEffect } from 'react';
import { useProjects, useApplications, useCategories, useCreateApplication, formatCurrency, formatDate, getApplicationStatusConfig } from '@/hooks/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Search,
  Briefcase,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Building2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function JobsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [provinceId, setProvinceId] = useState<string>('');
  const [cityId, setCityId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');

  // Location data for filters
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; provinceId: string }[]>([]);

  // Fetch provinces and cities
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const [provincesRes, citiesRes] = await Promise.all([
          fetch('/api/provinces?activeOnly=true'),
          fetch('/api/cities?activeOnly=true'),
        ]);
        const provincesData = await provincesRes.json();
        const citiesData = await citiesRes.json();
        if (provincesData.success) setProvinces(provincesData.data);
        if (citiesData.success) setCities(citiesData.data);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };
    fetchLocations();
  }, []);

  // Filter cities based on selected province
  const filteredCities = provinceId
    ? cities.filter(c => c.provinceId === provinceId)
    : cities;

  // Fetch published projects with workers needed
  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useProjects({
    search,
    status: 'PUBLISHED',
    cityId: cityId || undefined,
    provinceId: provinceId || undefined,
    categoryId: categoryFilter || undefined,
  });

  // Fetch user's applications to show status
  const { data: applicationsData } = useApplications({ userId: user?.id });

  // Fetch categories for filter
  const { data: categoriesData } = useCategories();

  const createApplication = useCreateApplication();

  const jobs = jobsData?.data?.filter(p => p.workerNeeded && p.workerNeeded > 0) || [];
  const applications = applicationsData?.data || [];
  const categories = categoriesData?.categories ?? categoriesData?.data ?? [];

  // Get application status for a job
  const getApplicationStatus = (projectId: string) => {
    const app = applications.find(a => a.projectId === projectId);
    return app?.status;
  };

  // Stats
  const availableJobsCount = jobs.length;
  const myApplicationsCount = applications.length;
  const pendingApplications = applications.filter(a => a.status === 'PENDING').length;
  const acceptedApplications = applications.filter(a => a.status === 'ACCEPTED').length;

  // Reset city when province changes
  const handleProvinceChange = (value: string) => {
    setProvinceId(value);
    setCityId('');
  };

  const handleOpenApplyDialog = (jobId: string) => {
    setSelectedJob(jobId);
    setCoverLetter('');
    setProposedBudget('');
    setShowApplyDialog(true);
  };

  const handleApply = async () => {
    if (!selectedJob) return;

    try {
      await createApplication.mutateAsync({
        projectId: selectedJob,
        coverLetter,
        proposedBudget: proposedBudget ? parseFloat(proposedBudget) : undefined,
      });
      toast.success('Lamaran berhasil dikirim!');
      setShowApplyDialog(false);
      setSelectedJob(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengirim lamaran');
    }
  };

  const selectedJobData = jobs.find(j => j.id === selectedJob);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cari Pekerjaan</h1>
          <p className="text-muted-foreground">
            Temukan proyek yang sesuai dengan keahlian Anda
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#fd904c]/10 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-[#fd904c]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableJobsCount}</p>
              <p className="text-sm text-muted-foreground">Pekerjaan Tersedia</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myApplicationsCount}</p>
              <p className="text-sm text-muted-foreground">Lamaran Saya</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingApplications}</p>
              <p className="text-sm text-muted-foreground">Menunggu</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{acceptedApplications}</p>
              <p className="text-sm text-muted-foreground">Diterima</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pekerjaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={provinceId} onValueChange={handleProvinceChange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Provinsi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Provinsi</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Kota/Kab." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kota</SelectItem>
                {filteredCities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {jobsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobsError ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            Gagal memuat data pekerjaan
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada pekerjaan yang tersedia</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const appStatus = getApplicationStatus(job.id);
            const statusConfig = appStatus ? getApplicationStatusConfig(appStatus) : null;

            return (
              <Card key={job.id} className="glass-card hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Title & Status */}
                      <div className="flex items-start gap-3">
                        <Link href={`/dashboard/projects/${job.id}`} className="flex-1">
                          <h3 className="text-lg font-semibold hover:text-[#fd904c] transition-colors">
                            {job.title}
                          </h3>
                        </Link>
                        {statusConfig && (
                          <Badge className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-muted-foreground line-clamp-2">{job.description}</p>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {job.budget && (
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-[#fd904c]" />
                            <span className="font-semibold text-[#fd904c]">
                              {formatCurrency(job.budget)}
                            </span>
                          </div>
                        )}
                        {job.city && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{job.city.name}, {job.city.province.name}</span>
                          </div>
                        )}
                        {job.workerNeeded && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{job.workerNeeded} orang</span>
                          </div>
                        )}
                        {job.startDate && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(job.startDate)}</span>
                          </div>
                        )}
                      </div>

                      {/* Category & Type */}
                      <div className="flex items-center gap-2">
                        {job.category && (
                          <Badge variant="outline" className="text-xs">
                            {job.category.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {job.type === 'TENDER' ? 'Tender' : 'Harian'}
                        </Badge>
                      </div>

                      {/* Client */}
                      {job.client && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-xs">
                            {job.client.name.charAt(0)}
                          </div>
                          <span className="text-muted-foreground">{job.client.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col gap-2">
                      {appStatus === 'PENDING' ? (
                        <Button variant="outline" disabled>
                          <Clock className="h-4 w-4 mr-2" />
                          Menunggu
                        </Button>
                      ) : appStatus === 'ACCEPTED' ? (
                        <Button variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Diterima
                        </Button>
                      ) : appStatus === 'REJECTED' ? (
                        <Button
                          onClick={() => handleOpenApplyDialog(job.id)}
                          variant="outline"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Lamar Lagi
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleOpenApplyDialog(job.id)}
                          className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Lamar
                        </Button>
                      )}
                      <Link href={`/dashboard/projects/${job.id}`}>
                        <Button variant="ghost" className="w-full">
                          Lihat Detail
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lamar Pekerjaan</DialogTitle>
            <DialogDescription>
              Kirim lamaran Anda untuk pekerjaan ini
            </DialogDescription>
          </DialogHeader>

          {selectedJobData && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold">{selectedJobData.title}</h4>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {selectedJobData.budget && (
                  <span className="font-semibold text-[#fd904c]">
                    {formatCurrency(selectedJobData.budget)}
                  </span>
                )}
                {selectedJobData.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedJobData.city.name}, {selectedJobData.city.province.name}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Surat Lamaran</Label>
              <Textarea
                placeholder="Ceritakan pengalaman dan keahlian Anda yang relevan..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Jelaskan mengapa Anda cocok untuk pekerjaan ini
              </p>
            </div>
            <div className="space-y-2">
              <Label>Penawaran Harga (Rp) - Opsional</Label>
              <Input
                type="number"
                placeholder="Masukkan penawaran harga Anda"
                value={proposedBudget}
                onChange={(e) => setProposedBudget(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Biarkan kosong jika menggunakan budget yang ditentukan
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleApply}
              disabled={createApplication.isPending}
              className="bg-gradient-to-r from-[#fd904c] to-[#e57835]"
            >
              {createApplication.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Kirim Lamaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
