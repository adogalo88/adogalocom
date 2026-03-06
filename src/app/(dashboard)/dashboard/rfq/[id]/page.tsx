'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Trophy,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';

interface RFQItemPrice {
  id: string;
  unitPrice: number;
  totalPrice: number;
  vendorNotes: string | null;
  item: {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
  };
}

interface RFQSubmissionExtraItem {
  id: string;
  itemName: string;
  spesifikasi: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  vendorNotes: string | null;
  sortOrder: number;
}

interface RFQSubmission {
  id: string;
  status: string;
  notes: string | null;
  totalOffer: number | null;
  submittedAt: string | null;
  vendor: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    rating: number;
  };
  prices: RFQItemPrice[];
  extraItems?: RFQSubmissionExtraItem[];
}

interface RFQItem {
  id: string;
  itemName: string;
  description: string | null;
  quantity: number;
  unit: string;
  prices: {
    submission: RFQSubmission;
    unitPrice: number;
    totalPrice: number;
  }[];
}

interface RFQ {
  id: string;
  title: string;
  description: string | null;
  status: string;
  notes: string | null;
  deadline: string | null;
  createdAt: string;
  project: {
    id: string;
    title: string;
    description: string;
    address?: string | null;
    budget: number | null;
    startDate: string | null;
    endDate: string | null;
    city?: { id: string; name: string; province?: { name: string } } | null;
    client: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      avatar: string | null;
    };
  };
  items: RFQItem[];
  submissions: RFQSubmission[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
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

export default function RFQDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [rfq, setRFQ] = useState<RFQ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('items');

  useEffect(() => {
    fetchRFQ();
  }, [id]);

  const fetchRFQ = async () => {
    try {
      const response = await fetch(`/api/rfq/${id}`);
      const result = await response.json();
      if (result.success) {
        setRFQ(result.data);
        
        // Initialize prices from existing submission if any
        const mySubmission = result.data.submissions?.find(
          (s: RFQSubmission) => s.vendor.id === user?.id
        );
        if (mySubmission && mySubmission.prices) {
          const initialPrices: Record<string, number> = {};
          mySubmission.prices.forEach((p: RFQItemPrice) => {
            initialPrices[p.item.id] = p.unitPrice;
          });
          setPrices(initialPrices);
          setNotes(mySubmission.notes || '');
        }
      } else {
        toast.error(result.error || 'Gagal memuat data RFQ');
        router.push('/dashboard/rfq');
      }
    } catch (error) {
      console.error('Error fetching RFQ:', error);
      toast.error('Gagal memuat data RFQ');
      router.push('/dashboard/rfq');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePriceChange = (itemId: string, value: string) => {
    const price = parseFloat(value) || 0;
    setPrices((prev) => ({ ...prev, [itemId]: price }));
  };

  const calculateItemTotal = (itemId: string, quantity: number) => {
    return (prices[itemId] || 0) * quantity;
  };

  const calculateTotal = () => {
    if (!rfq) return 0;
    return rfq.items.reduce((sum, item) => sum + calculateItemTotal(item.id, item.quantity), 0);
  };

  const handleSubmitOffer = async () => {
    if (!rfq) return;

    // Validate all prices are filled
    const missingPrices = rfq.items.filter((item) => !prices[item.id] || prices[item.id] <= 0);
    if (missingPrices.length > 0) {
      toast.error('Harap isi semua harga item');
      return;
    }

    setIsSaving(true);
    try {
      const itemPrices = rfq.items.map((item) => ({
        itemId: item.id,
        unitPrice: prices[item.id],
      }));

      const response = await fetch('/api/rfq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfqId: rfq.id,
          itemPrices,
          notes: notes || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Penawaran berhasil dikirim!');
        fetchRFQ();
      } else {
        toast.error(result.error || 'Gagal mengirim penawaran');
      }
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error('Gagal mengirim penawaran');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!rfq) return;

    if (action === 'accept' && !selectedSubmissionId) {
      toast.error('Pilih penawaran yang akan diterima');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/rfq/${rfq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          submissionId: selectedSubmissionId 
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        fetchRFQ();
      } else {
        toast.error(result.error || 'Gagal memproses aksi');
      }
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Gagal memproses aksi');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
      </div>
    );
  }

  if (!rfq) {
    return null;
  }

  const isVendor = user?.role === 'VENDOR';
  const isClient = user?.role === 'CLIENT' || user?.role === 'ADMIN';
  const canSubmitOffer = isVendor && (rfq.status === 'PUBLISHED' || rfq.status === 'CLOSED');
  const canPublish = isClient && rfq.status === 'DRAFT';
  const canClose = isClient && rfq.status === 'PUBLISHED';
  const canAccept = isClient && (rfq.status === 'PUBLISHED' || rfq.status === 'CLOSED');
  
  const mySubmission = rfq.submissions?.find(s => s.vendor.id === user?.id);
  const submittedSubmissions = rfq.submissions?.filter(s => s.status === 'SUBMITTED') || [];
  const sortedSubmissions = [...submittedSubmissions].sort(
    (a, b) => (a.totalOffer || 0) - (b.totalOffer || 0)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Badge className={statusColors[rfq.status]}>
          {statusLabels[rfq.status]}
        </Badge>
      </div>

      {/* Project Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{rfq.project.title}</CardTitle>
          <CardDescription>{rfq.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{rfq.project.client.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{rfq.project.address || rfq.project.city?.name || 'Lokasi tidak disebutkan'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {rfq.project.startDate && rfq.project.endDate
                  ? `${new Date(rfq.project.startDate).toLocaleDateString('id-ID')} - ${new Date(rfq.project.endDate).toLocaleDateString('id-ID')}`
                  : 'Tanggal belum ditentukan'}
              </span>
            </div>
            {rfq.project.budget && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#fd904c]" />
                <span className="font-medium text-[#fd904c]">
                  Budget: {formatCurrency(rfq.project.budget)}
                </span>
              </div>
            )}
          </div>
          {rfq.description && (
            <p className="mt-4 text-sm text-muted-foreground">{rfq.description}</p>
          )}
          {rfq.deadline && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Batas waktu: {new Date(rfq.deadline).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items" className="gap-2">
            <FileText className="h-4 w-4" />
            Item Pekerjaan
          </TabsTrigger>
          {isClient && (
            <TabsTrigger value="submissions" className="gap-2">
              <Users className="h-4 w-4" />
              Penawaran ({submittedSubmissions.length})
            </TabsTrigger>
          )}
          {isVendor && mySubmission && (
            <TabsTrigger value="my-offer" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Penawaran Saya
            </TabsTrigger>
          )}
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Item Pekerjaan</CardTitle>
              <CardDescription>
                {canSubmitOffer && !mySubmission
                  ? 'Isi harga per satuan untuk setiap item pekerjaan'
                  : 'Daftar item pekerjaan dalam RFQ ini'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama Item</TableHead>
                      <TableHead className="text-center">Jumlah</TableHead>
                      <TableHead className="text-center">Satuan</TableHead>
                      {canSubmitOffer && !mySubmission && (
                        <TableHead className="text-right">Harga/Satuan</TableHead>
                      )}
                      {canSubmitOffer && !mySubmission && (
                        <TableHead className="text-right">Total</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfq.items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-center">{item.unit}</TableCell>
                        {canSubmitOffer && !mySubmission && (
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              placeholder="0"
                              value={prices[item.id] || ''}
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              className="w-32 ml-auto text-right"
                            />
                          </TableCell>
                        )}
                        {canSubmitOffer && !mySubmission && (
                          <TableCell className="text-right font-medium">
                            {formatCurrency(calculateItemTotal(item.id, item.quantity))}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Notes for vendor */}
              {canSubmitOffer && !mySubmission && (
                <div className="mt-4 space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea
                    placeholder="Tambahkan catatan untuk penawaran Anda..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Total */}
              {canSubmitOffer && !mySubmission && (
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Penawaran</p>
                    <p className="text-2xl font-bold text-[#fd904c]">
                      {formatCurrency(calculateTotal())}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab (for Client) */}
        <TabsContent value="submissions" className="space-y-4">
          {sortedSubmissions.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada penawaran masuk</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Comparison Table */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Perbandingan Penawaran
                  </CardTitle>
                  <CardDescription>
                    Pilih penawaran terbaik untuk diterima
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead className="text-right">Total Penawaran</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Rating</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSubmissions.map((submission, index) => (
                          <TableRow 
                            key={submission.id}
                            className={selectedSubmissionId === submission.id ? 'bg-orange-50 dark:bg-orange-950/20' : ''}
                          >
                            <TableCell>
                              {index === 0 && (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-sm">
                                  {submission.vendor.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium">{submission.vendor.name}</p>
                                  <p className="text-xs text-muted-foreground">{submission.vendor.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-bold ${index === 0 ? 'text-[#fd904c]' : ''}`}>
                                {formatCurrency(submission.totalOffer || 0)}
                              </span>
                              {index === 0 && (
                                <p className="text-xs text-green-600">Termurah</p>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={submissionStatusColors[submission.status]}>
                                {submission.status === 'SUBMITTED' ? 'Menunggu' : submission.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              ⭐ {submission.vendor.rating.toFixed(1)}
                            </TableCell>
                            <TableCell>
                              {canAccept && (
                                <Button
                                  size="sm"
                                  variant={selectedSubmissionId === submission.id ? 'default' : 'outline'}
                                  className={selectedSubmissionId === submission.id ? 'bg-[#fd904c] hover:bg-[#fd904c]/90' : ''}
                                  onClick={() => setSelectedSubmissionId(submission.id)}
                                >
                                  Pilih
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Submission Details */}
              {selectedSubmissionId && (
                <Card className="glass-card border-[#fd904c]">
                  <CardHeader>
                    <CardTitle>Detail Penawaran Terpilih</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const selected = sortedSubmissions.find(s => s.id === selectedSubmissionId);
                      if (!selected) return null;
                      
                      return (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Harga/Satuan</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selected.prices.map((price) => (
                                <TableRow key={price.id}>
                                  <TableCell>{price.item.itemName}</TableCell>
                                  <TableCell className="text-center">
                                    {price.item.quantity} {price.item.unit}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(price.unitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(price.totalPrice)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(selected.extraItems?.length ?? 0) > 0 && selected.extraItems!.map((ex) => (
                                <TableRow key={ex.id} className="bg-amber-50/70 dark:bg-amber-950/30">
                                  <TableCell className="font-medium">{ex.itemName}</TableCell>
                                  <TableCell className="text-center">{ex.quantity} {ex.unit}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(ex.unitPrice)}</TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(ex.totalPrice)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {selected.notes && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <p className="text-sm"><strong>Catatan Vendor:</strong> {selected.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* My Offer Tab (for Vendor) */}
        {isVendor && mySubmission && (
          <TabsContent value="my-offer">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Penawaran Saya</CardTitle>
                <CardDescription>
                  Status: <Badge className={submissionStatusColors[mySubmission.status]}>
                    {mySubmission.status === 'SUBMITTED' ? 'Terkirim' :
                     mySubmission.status === 'ACCEPTED' ? 'Diterima' :
                     mySubmission.status === 'REJECTED' ? 'Ditolak' : 'Draft'}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Harga/Satuan</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mySubmission.prices.map((price) => (
                        <TableRow key={price.id}>
                          <TableCell>{price.item.itemName}</TableCell>
                          <TableCell className="text-center">
                            {price.item.quantity} {price.item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(price.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(price.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(mySubmission.extraItems?.length ?? 0) > 0 && mySubmission.extraItems!.map((ex) => (
                        <TableRow key={ex.id} className="bg-amber-50/70 dark:bg-amber-950/30">
                          <TableCell className="font-medium">{ex.itemName}</TableCell>
                          <TableCell className="text-center">{ex.quantity} {ex.unit}</TableCell>
                          <TableCell className="text-right">{formatCurrency(ex.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(ex.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Penawaran</p>
                    <p className="text-2xl font-bold text-[#fd904c]">
                      {formatCurrency(mySubmission.totalOffer || 0)}
                    </p>
                  </div>
                </div>
                {mySubmission.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm"><strong>Catatan:</strong> {mySubmission.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Vendor Actions */}
        {canSubmitOffer && !mySubmission && (
          <Button
            onClick={handleSubmitOffer}
            disabled={isSaving}
            className="bg-[#fd904c] hover:bg-[#fd904c]/90"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Kirim Penawaran
          </Button>
        )}

        {/* Client Actions */}
        {canPublish && (
          <Button
            onClick={() => handleAction('publish')}
            disabled={isSaving}
            className="bg-[#fd904c] hover:bg-[#fd904c]/90"
          >
            <Clock className="h-4 w-4 mr-2" />
            Publish RFQ
          </Button>
        )}

        {canClose && (
          <Button
            onClick={() => handleAction('close')}
            disabled={isSaving}
            variant="outline"
          >
            Tutup Penawaran
          </Button>
        )}

        {canAccept && selectedSubmissionId && (
          <Button
            onClick={() => handleAction('accept')}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Terima Penawaran
          </Button>
        )}
      </div>
    </div>
  );
}

// Add missing import
function Send({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}
