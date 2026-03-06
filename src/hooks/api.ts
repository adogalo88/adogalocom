import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  role: 'CLIENT' | 'VENDOR' | 'TUKANG' | 'SUPPLIER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  ktpNumber: string | null;
  ktpPhoto: string | null;
  npwpNumber: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  specialty: string | null;
  experience: number | null;
  rating: number;
  totalReviews: number;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  type: 'TENDER' | 'HARIAN';
  status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  budget: number | null;
  location: string | null;
  workerNeeded: number | null;
  requirements: string | null;
  startDate: string | null;
  endDate: string | null;
  categoryId: string | null;
  clientId: string;
  vendorId: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client?: User;
  vendor?: User | null;
  category?: { id: string; name: string } | null;
  applications?: Application[];
  _count?: { applications: number; teamMembers: number };
}

export interface Application {
  id: string;
  projectId: string;
  userId: string;
  coverLetter: string | null;
  proposedBudget: number | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  project?: Project;
  user?: User;
}

export interface Material {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  budget: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED';
  location: string | null;
  deadline: string | null;
  clientId: string;
  projectId: string | null;
  createdAt: string;
  client?: User;
  project?: Project | null;
  offers?: MaterialOffer[];
  _count?: { offers: number };
}

export interface MaterialOffer {
  id: string;
  materialId: string;
  supplierId: string;
  price: number;
  notes: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  supplier?: User;
  material?: Material;
}

export interface Transaction {
  id: string;
  userId: string;
  projectId: string | null;
  type: 'PROJECT_PAYMENT' | 'MATERIAL_PAYMENT' | 'SUBSCRIPTION' | 'WITHDRAWAL' | 'REFUND';
  amount: number;
  fee: number;
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod: string | null;
  paymentProof: string | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
  user?: User;
  project?: Project | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

export interface Conversation {
  userId: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

export interface TeamMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  salaryType: string;
  salaryAmount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  user?: User;
  project?: Project;
}

export interface Review {
  id: string;
  projectId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer?: User;
  reviewee?: User;
  project?: Project;
}

// API Response Types
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper functions
const fetchApi = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Format currency to IDR
export function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date to Indonesian locale
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

// Format date time
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Get relative time
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  return formatDate(date);
}

// Status configs
export function getProjectStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    PUBLISHED: { label: 'Dipublikasi', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    IN_PROGRESS: { label: 'Berjalan', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    COMPLETED: { label: 'Selesai', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CANCELLED: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  return configs[status] || configs.DRAFT;
}

export function getMaterialStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    PUBLISHED: { label: 'Dipublikasi', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    IN_PROGRESS: { label: 'Proses', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    FULFILLED: { label: 'Terpenuhi', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CANCELLED: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  return configs[status] || configs.DRAFT;
}

export function getApplicationStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    ACCEPTED: { label: 'Diterima', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    REJECTED: { label: 'Ditolak', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    WITHDRAWN: { label: 'Ditarik', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };
  return configs[status] || configs.PENDING;
}

export function getTransactionStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    PROCESSING: { label: 'Diproses', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    COMPLETED: { label: 'Selesai', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    FAILED: { label: 'Gagal', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    CANCELLED: { label: 'Dibatalkan', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };
  return configs[status] || configs.PENDING;
}

// Query Keys
export const queryKeys = {
  projects: (filters?: Record<string, unknown>) => ['projects', filters] as const,
  project: (id: string) => ['project', id] as const,
  materials: (filters?: Record<string, unknown>) => ['materials', filters] as const,
  material: (id: string) => ['material', id] as const,
  applications: (filters?: Record<string, unknown>) => ['applications', filters] as const,
  application: (id: string) => ['application', id] as const,
  transactions: (filters?: Record<string, unknown>) => ['transactions', filters] as const,
  transaction: (id: string) => ['transaction', id] as const,
  notifications: (filters?: Record<string, unknown>) => ['notifications', filters] as const,
  messages: (filters?: Record<string, unknown>) => ['messages', filters] as const,
  conversations: () => ['conversations'] as const,
  teamMembers: (projectId?: string) => ['teamMembers', projectId] as const,
  reviews: (filters?: Record<string, unknown>) => ['reviews', filters] as const,
  users: (filters?: Record<string, unknown>) => ['users', filters] as const,
  user: (id: string) => ['user', id] as const,
  categories: () => ['categories'] as const,
  boq: (filters?: Record<string, unknown>) => ['boq', filters] as const,
};

// Projects Hooks
export function useProjects(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.projects(filters),
    queryFn: () => fetchApi<PaginatedResponse<Project>>(`/api/projects?${params.toString()}`),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => fetchApi<{ project: Project }>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Project>) =>
      fetchApi<{ project: Project; message: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Project>) =>
      fetchApi<{ project: Project; message: string }>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>(`/api/projects/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Materials Hooks
export function useMaterials(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.materials(filters),
    queryFn: () => fetchApi<PaginatedResponse<Material>>(`/api/materials?${params.toString()}`),
  });
}

export function useMaterial(id: string) {
  return useQuery({
    queryKey: queryKeys.material(id),
    queryFn: () => fetchApi<{ material: Material }>(`/api/materials/${id}`),
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Material>) =>
      fetchApi<{ material: Material; message: string }>('/api/materials', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useUpdateMaterial(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Material>) =>
      fetchApi<{ material: Material; message: string }>(`/api/materials/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.material(id) });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

// Applications Hooks
export function useApplications(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.applications(filters),
    queryFn: () => fetchApi<PaginatedResponse<Application>>(`/api/applications?${params.toString()}`),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { projectId: string; coverLetter?: string; proposedBudget?: number }) =>
      fetchApi<{ application: Application; message: string }>('/api/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { status: 'ACCEPTED' | 'REJECTED' }) =>
      fetchApi<{ application: Application; message: string }>(`/api/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Material Offers Hooks
export function useMaterialOffers(materialId: string) {
  return useQuery({
    queryKey: ['offers', materialId],
    queryFn: () => fetchApi<{ offers: MaterialOffer[] }>(`/api/materials/${materialId}/offers`),
    enabled: !!materialId,
  });
}

export function useCreateOffer(materialId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { price: number; notes?: string }) =>
      fetchApi<{ offer: MaterialOffer; message: string }>(`/api/materials/${materialId}/offers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', materialId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.material(materialId) });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

// Transactions Hooks
export function useTransactions(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => fetchApi<PaginatedResponse<Transaction>>(`/api/transactions?${params.toString()}`),
  });
}

// Notifications Hooks
export function useNotifications(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.notifications(filters),
    queryFn: () => fetchApi<PaginatedResponse<Notification>>(`/api/notifications?${params.toString()}`),
  });
}

// Messages Hooks
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: () => fetchApi<{ conversations: Conversation[] }>('/api/messages?type=conversations'),
  });
}

export function useMessageThread(userId: string) {
  return useQuery({
    queryKey: queryKeys.messages({ with: userId }),
    queryFn: () => fetchApi<{ messages: Message[] }>(`/api/messages?with=${userId}`),
    enabled: !!userId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { receiverId: string; content: string }) =>
      fetchApi<{ message: Message; message_text: string }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages({ with: variables.receiverId }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    },
  });
}

// Users Hooks
export function useUsers(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.users(filters),
    queryFn: () => fetchApi<PaginatedResponse<User>>(`/api/users?${params.toString()}`),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => fetchApi<{ user: User }>(`/api/users/${id}`),
    enabled: !!id,
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<User> & { isVerified?: boolean }) =>
      fetchApi<{ user: User; message: string }>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>(`/api/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Team Members Hooks
export function useTeamMembers(projectId?: string) {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId);
  
  return useQuery({
    queryKey: queryKeys.teamMembers(projectId),
    queryFn: () => fetchApi<PaginatedResponse<TeamMember>>(`/api/team-members?${params.toString()}`),
  });
}

// Reviews Hooks
export function useReviews(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.reviews(filters),
    queryFn: () => fetchApi<PaginatedResponse<Review>>(`/api/reviews?${params.toString()}`),
  });
}

// BOQ Types
export interface BOQ {
  id: string;
  projectId: string;
  vendorId: string;
  title: string;
  description: string | null;
  totalPrice: number;
  items: BOQItem[];
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  notes: string | null;
  createdAt: string;
  project?: Project;
  vendor?: User;
}

export interface BOQItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

// BOQ Hooks
export function useBOQs(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.boq(filters),
    queryFn: () => fetchApi<PaginatedResponse<BOQ>>(`/api/boq?${params.toString()}`),
  });
}

export function useBOQ(id: string) {
  return useQuery({
    queryKey: ['boq', id],
    queryFn: () => fetchApi<{ success: boolean; data: BOQ }>(`/api/boq/${id}`),
    enabled: !!id,
  });
}

export function useCreateBOQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      projectId: string;
      title: string;
      description?: string;
      items: BOQItem[];
      notes?: string;
      status?: 'DRAFT' | 'SUBMITTED';
    }) =>
      fetchApi<{ success: boolean; message: string; data: BOQ }>('/api/boq', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq'] });
    },
  });
}

export function useUpdateBOQ(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<BOQ> & { items?: BOQItem[]; rejectionReason?: string }) =>
      fetchApi<{ success: boolean; message: string; data: BOQ }>(`/api/boq/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq', id] });
      queryClient.invalidateQueries({ queryKey: ['boq'] });
    },
  });
}

export function useDeleteBOQ(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>(`/api/boq/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq'] });
    },
  });
}

// Team Member Mutations
export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      userId: string;
      role: string;
      salaryType: string;
      salaryAmount: number;
      startDate?: string;
      endDate?: string;
    }) =>
      fetchApi<{ teamMember: TeamMember; message: string }>('/api/team-members', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
}

export function useUpdateTeamMember(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<TeamMember>) =>
      fetchApi<{ teamMember: TeamMember; message: string }>(`/api/team-members/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
}

export function useDeleteTeamMember(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>(`/api/team-members/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
}

// Review Mutations
export function useCreateReview() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      revieweeId: string;
      rating: number;
      comment: string;
    }) =>
      fetchApi<{ review: Review; message: string }>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useUpdateReview(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { rating?: number; comment?: string }) =>
      fetchApi<{ review: Review; message: string }>(`/api/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

// Portfolio Types
export interface Portfolio {
  id: string;
  userId: string;
  title: string;
  description: string;
  images: string[];
  projectId: string | null;
  createdAt: string;
  user?: User;
  project?: Project;
}

export function usePortfolio(userId?: string) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () => fetchApi<{ portfolio: Portfolio[] }>(`/api/portfolio?${params.toString()}`),
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      images: string[];
      projectId?: string;
      completedYear?: number | null;
      cityId?: string | null;
    }) =>
      fetchApi<{ portfolio: Portfolio; message: string }>('/api/portfolio', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useUpdatePortfolio(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      title?: string;
      description?: string;
      images?: string[];
      projectId?: string | null;
    }) =>
      fetchApi<{ portfolio: Portfolio; message: string }>(`/api/portfolio/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

export function useDeletePortfolio(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>(`/api/portfolio/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

// Transaction Mutations
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      projectId?: string;
      type: string;
      amount: number;
      fee?: number;
      paymentMethod?: string;
      notes?: string;
    }) =>
      fetchApi<{ transaction: Transaction; message: string }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransaction(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      status?: string;
      paymentProof?: string;
      rejectionReason?: string;
      notes?: string;
    }) =>
      fetchApi<{ transaction: Transaction; message: string }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// BOQ Status Config
export function getBOQStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    SUBMITTED: { label: 'Diajukan', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    ACCEPTED: { label: 'Diterima', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    REJECTED: { label: 'Ditolak', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  return configs[status] || configs.DRAFT;
}

// Tukang Role Config
export function getTukangRoleConfig(role: string) {
  const configs: Record<string, { label: string }> = {
    TUKANG_BATU: { label: 'Tukang Batu' },
    TUKANG_KAYU: { label: 'Tukang Kayu' },
    TUKANG_BESI: { label: 'Tukang Besi' },
    TUKANG_LISTRIK: { label: 'Tukang Listrik' },
    TUKANG_PLOMBON: { label: 'Tukang Plambon' },
    TUKANG_CAT: { label: 'Tukang Cat' },
    MANDOR: { label: 'Mandor' },
    PEKERJA_LEPAS: { label: 'Pekerja Lepas' },
  };
  return configs[role] || { label: role };
}

// Salary Type Config
export function getSalaryTypeConfig(type: string) {
  const configs: Record<string, { label: string }> = {
    HOURLY: { label: 'Per Jam' },
    DAILY: { label: 'Per Hari' },
    WEEKLY: { label: 'Per Minggu' },
    MONTHLY: { label: 'Per Bulan' },
    FIXED: { label: 'Fix' },
  };
  return configs[type] || { label: type };
}

// Categories Hook
export function useCategories(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => fetchApi<{ data: (Category & { projectCount: number })[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/api/categories?${params.toString()}`),
  });
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string }) =>
      fetchApi<{ data: Category & { projectCount: number }; message: string }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name?: string; description?: string | null; icon?: string | null }) =>
      fetchApi<{ data: Category & { projectCount: number }; message: string }>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>(`/api/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// User Status Config
export function getUserStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: 'Aktif', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    INACTIVE: { label: 'Tidak Aktif', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    SUSPENDED: { label: 'Ditangguhkan', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    PENDING_VERIFICATION: { label: 'Menunggu Verifikasi', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  };
  return configs[status] || configs.ACTIVE;
}

// Role Config
export function getRoleConfig(role: string) {
  const configs: Record<string, { label: string; className: string }> = {
    CLIENT: { label: 'Klien', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    VENDOR: { label: 'Vendor', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    TUKANG: { label: 'Tukang', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    SUPPLIER: { label: 'Supplier', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
    ADMIN: { label: 'Admin', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  return configs[role] || configs.CLIENT;
}

// Offer Status Config
export function getOfferStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    ACCEPTED: { label: 'Diterima', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    REJECTED: { label: 'Ditolak', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  return configs[status] || configs.PENDING;
}

// Supplier Offer with Material type
export interface SupplierOffer extends MaterialOffer {
  material: {
    id: string;
    title: string;
    description: string | null;
    quantity: number;
    unit: string;
    budget: number | null;
    location: string | null;
    deadline: string | null;
    status: string;
    client: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      avatar: string | null;
      city: string | null;
    };
  };
}

// Supplier Offers Hooks
export function useSupplierOffers(filters?: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  return useQuery({
    queryKey: ['supplierOffers', filters],
    queryFn: () => fetchApi<PaginatedResponse<SupplierOffer>>(`/api/offers?${params.toString()}`),
  });
}

export function useSupplierOffer(id: string) {
  return useQuery({
    queryKey: ['supplierOffer', id],
    queryFn: () => fetchApi<SupplierOffer>(`/api/offers/${id}`),
    enabled: !!id,
  });
}

export function useUpdateOffer(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { price?: number; notes?: string }) =>
      fetchApi<SupplierOffer>(`/api/offers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOffer', id] });
      queryClient.invalidateQueries({ queryKey: ['supplierOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useWithdrawOffer(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>(`/api/offers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOffers'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}
