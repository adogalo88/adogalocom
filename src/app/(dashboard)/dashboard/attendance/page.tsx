'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';

interface TeamMember {
  id: string;
  role: string;
  salaryType: string;
  salaryAmount: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    specialty: string | null;
  };
}

interface Attendance {
  id: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  teamMember: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface Project {
  id: string;
  title: string;
  type: string;
  teamMembers: TeamMember[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PRESENT: { label: 'Hadir', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  ABSENT: { label: 'Tidak Hadir', color: 'bg-red-100 text-red-800', icon: XCircle },
  LATE: { label: 'Terlambat', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  HALF_DAY: { label: 'Setengah Hari', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  EXCUSED: { label: 'Izin', color: 'bg-blue-100 text-blue-800', icon: FileCheck },
};

export default function AttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Form state for each team member
  const [attendanceForm, setAttendanceForm] = useState<Record<string, {
    status: string;
    checkIn: string;
    checkOut: string;
    notes: string;
  }>>({});

  const dateStr = currentDate.toISOString().split('T')[0];

  // Fetch projects
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch attendance when project/date changes
  useEffect(() => {
    if (selectedProject) {
      fetchAttendance();
    }
  }, [selectedProject, dateStr]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?type=HARIAN&status=IN_PROGRESS');
      const result = await response.json();
      
      if (result.success) {
        // Get projects with team members
        const projectsWithTeam = result.data.filter((p: Project) => 
          p.teamMembers && p.teamMembers.length > 0
        );
        setProjects(projectsWithTeam);
        
        // Auto-select project from URL or first project
        const urlProject = searchParams.get('projectId');
        if (urlProject && projectsWithTeam.some((p: Project) => p.id === urlProject)) {
          setSelectedProject(urlProject);
        } else if (projectsWithTeam.length > 0) {
          setSelectedProject(projectsWithTeam[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/attendance?projectId=${selectedProject}&date=${dateStr}`);
      const result = await response.json();
      
      if (result.success) {
        // Convert to record by team member id
        const attendanceRecord: Record<string, Attendance> = {};
        const formRecord: Record<string, { status: string; checkIn: string; checkOut: string; notes: string }> = {};
        
        result.data.forEach((att: Attendance) => {
          attendanceRecord[att.teamMember.id] = att;
          formRecord[att.teamMember.id] = {
            status: att.status,
            checkIn: att.checkIn ? att.checkIn.split('T')[1].slice(0, 5) : '',
            checkOut: att.checkOut ? att.checkOut.split('T')[1].slice(0, 5) : '',
            notes: att.notes || '',
          };
        });
        
        setAttendances(attendanceRecord);
        setAttendanceForm(formRecord);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const handleFormChange = (teamMemberId: string, field: string, value: string) => {
    setAttendanceForm(prev => ({
      ...prev,
      [teamMemberId]: {
        ...prev[teamMemberId] || { status: 'PRESENT', checkIn: '', checkOut: '', notes: '' },
        [field]: value,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedProjectData) return;

    setIsSaving(true);
    try {
      const attendances = selectedProjectData.teamMembers.map(tm => ({
        teamMemberId: tm.id,
        status: attendanceForm[tm.id]?.status || 'PRESENT',
        checkIn: attendanceForm[tm.id]?.checkIn 
          ? `${dateStr}T${attendanceForm[tm.id].checkIn}:00` 
          : undefined,
        checkOut: attendanceForm[tm.id]?.checkOut 
          ? `${dateStr}T${attendanceForm[tm.id].checkOut}:00` 
          : undefined,
        notes: attendanceForm[tm.id]?.notes || undefined,
      }));

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          date: dateStr,
          attendances,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Berhasil menyimpan ${result.data.length} absensi`);
        fetchAttendance();
        setShowSaveDialog(false);
      } else {
        toast.error(result.error || 'Gagal menyimpan absensi');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Gagal menyimpan absensi');
    } finally {
      setIsSaving(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Absensi Harian</h1>
          <p className="text-muted-foreground">
            Catat kehadiran pekerja harian
          </p>
        </div>
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Tidak ada proyek harian aktif dengan anggota tim
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Tambahkan tukang ke proyek harian Anda untuk mulai mencatat absensi
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Absensi Harian</h1>
          <p className="text-muted-foreground">
            Catat kehadiran pekerja harian
          </p>
        </div>
      </div>

      {/* Project & Date Selection */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Project Selector */}
            <div className="w-full md:w-64">
              <Label className="text-sm text-muted-foreground mb-1">Proyek</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih proyek" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg min-w-[250px] justify-center">
                <Calendar className="h-4 w-4 text-[#fd904c]" />
                <span className="font-medium">{formatDateDisplay(currentDate)}</span>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Today Button */}
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
              className="w-full md:w-auto"
            >
              Hari Ini
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Attendance */}
      {selectedProjectData && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tim Pekerja ({selectedProjectData.teamMembers.length})
            </CardTitle>
            <CardDescription>
              Tandai status kehadiran untuk setiap pekerja
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead>Gaji/Hari</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Keluar</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProjectData.teamMembers.map(tm => {
                    const existingAtt = attendances[tm.id];
                    const form = attendanceForm[tm.id] || { status: 'PRESENT', checkIn: '', checkOut: '', notes: '' };
                    const config = statusConfig[form.status] || statusConfig.PRESENT;
                    
                    return (
                      <TableRow key={tm.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white text-sm">
                              {tm.user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{tm.user.name}</p>
                              <p className="text-xs text-muted-foreground">{tm.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tm.role.replace('_', ' ')}</Badge>
                          {tm.user.specialty && (
                            <p className="text-xs text-muted-foreground mt-1">{tm.user.specialty}</p>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(tm.salaryAmount)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={form.status}
                            onValueChange={(value) => handleFormChange(tm.id, 'status', value)}
                          >
                            <SelectTrigger className="w-32">
                              <Badge className={config.color}>{config.label}</Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([key, val]) => (
                                <SelectItem key={key} value={key}>
                                  {val.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={form.checkIn}
                            onChange={(e) => handleFormChange(tm.id, 'checkIn', e.target.value)}
                            className="w-28"
                            disabled={form.status === 'ABSENT' || form.status === 'EXCUSED'}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={form.checkOut}
                            onChange={(e) => handleFormChange(tm.id, 'checkOut', e.target.value)}
                            className="w-28"
                            disabled={form.status === 'ABSENT' || form.status === 'EXCUSED'}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Catatan..."
                            value={form.notes}
                            onChange={(e) => handleFormChange(tm.id, 'notes', e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button
                className="bg-[#fd904c] hover:bg-[#fd904c]/90"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Simpan Absensi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {selectedProjectData && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(statusConfig).map(([key, config]) => {
                const count = selectedProjectData.teamMembers.filter(tm => 
                  (attendanceForm[tm.id]?.status || 'PRESENT') === key
                ).length;
                const Icon = config.icon;
                
                return (
                  <div key={key} className="text-center p-3 rounded-lg bg-muted/50">
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${config.color.replace('bg-', 'text-').split(' ')[0]}`} />
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                );
              })}
            </div>
            
            {/* Calculate daily salary */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Estimasi Gaji Harian:</span>
                <span className="text-xl font-bold text-[#fd904c]">
                  {formatCurrency(
                    selectedProjectData.teamMembers.reduce((sum, tm) => {
                      const status = attendanceForm[tm.id]?.status || 'PRESENT';
                      let multiplier = 1;
                      if (status === 'ABSENT' || status === 'EXCUSED') multiplier = 0;
                      else if (status === 'HALF_DAY') multiplier = 0.5;
                      else if (status === 'LATE') multiplier = 0.9;
                      return sum + (tm.salaryAmount * multiplier);
                    }, 0)
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simpan Absensi?</DialogTitle>
            <DialogDescription>
              Absensi untuk tanggal {formatDateDisplay(currentDate)} akan disimpan.
              Data absensi sebelumnya akan diperbarui.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Batal
            </Button>
            <Button
              className="bg-[#fd904c] hover:bg-[#fd904c]/90"
              onClick={handleSaveAttendance}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
