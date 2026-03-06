import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser, toSafeUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  withAuth,
  createNotification,
} from '@/lib/api-utils';
import { ProjectStatus, ProjectType, UserRole, ApplicationStatus } from '@prisma/client';

// Validation schema for PATCH
const projectUpdateSchema = z.object({
  title: z.string().min(5, 'Judul proyek minimal 5 karakter').max(200, 'Judul proyek maksimal 200 karakter').optional(),
  description: z.string().min(20, 'Deskripsi proyek minimal 20 karakter').max(5000, 'Deskripsi proyek maksimal 5000 karakter').optional(),
  type: z.enum(['TENDER', 'HARIAN']).optional(),
  budget: z.number().positive('Budget harus lebih dari 0').optional().nullable(),
  location: z.string().max(500, 'Lokasi maksimal 500 karakter').optional().nullable(),
  workerNeeded: z.number().int().positive('Jumlah pekerja harus lebih dari 0').optional().nullable(),
  requirements: z.string().max(5000, 'Persyaratan maksimal 5000 karakter').optional().nullable(),
  startDate: z.string().datetime().optional().nullable().transform(val => val ? new Date(val) : null),
  endDate: z.string().datetime().optional().nullable().transform(val => val ? new Date(val) : null),
  categoryId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING_VERIFICATION', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED']).optional(),
  vendorId: z.string().optional().nullable(),
});

// Helper to format project response with full details
function formatProjectResponse(project: any, userApplication?: any) {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    type: project.type,
    status: project.status,
    budget: project.budget,
    location: project.location,
    workerNeeded: project.workerNeeded,
    requirements: project.requirements,
    startDate: project.startDate,
    endDate: project.endDate,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    acceptedAt: project.acceptedAt,
    completedAt: project.completedAt,
    client: project.client ? {
      id: project.client.id,
      name: project.client.name,
      email: project.client.email,
      phone: project.client.phone,
      avatar: project.client.avatar,
      rating: project.client.rating,
      totalReviews: project.client.totalReviews,
      isVerified: project.client.isVerified,
    } : null,
    vendor: project.vendor ? {
      id: project.vendor.id,
      name: project.vendor.name,
      email: project.vendor.email,
      phone: project.vendor.phone,
      avatar: project.vendor.avatar,
      rating: project.vendor.rating,
      totalReviews: project.vendor.totalReviews,
      isVerified: project.vendor.isVerified,
      specialty: project.vendor.specialty,
      experience: project.vendor.experience,
    } : null,
    category: project.category ? {
      id: project.category.id,
      name: project.category.name,
      description: project.category.description,
      icon: project.category.icon,
    } : null,
    skills: project.skills?.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) || [],
    applications: project.applications?.map((app: any) => ({
      id: app.id,
      coverLetter: app.coverLetter,
      proposedBudget: app.proposedBudget,
      status: app.status,
      createdAt: app.createdAt,
      user: {
        id: app.user.id,
        name: app.user.name,
        email: app.user.email,
        avatar: app.user.avatar,
        role: app.user.role,
        rating: app.user.rating,
        totalReviews: app.user.totalReviews,
        isVerified: app.user.isVerified,
        specialty: app.user.specialty,
        experience: app.user.experience,
      },
    })) || [],
    teamMembers: project.teamMembers?.map((member: any) => ({
      id: member.id,
      role: member.role,
      salaryType: member.salaryType,
      salaryAmount: member.salaryAmount,
      startDate: member.startDate,
      endDate: member.endDate,
      isActive: member.isActive,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        specialty: member.user.specialty,
        experience: member.user.experience,
      },
    })) || [],
    _count: {
      applications: project._count?.applications || 0,
      teamMembers: project._count?.teamMembers || 0,
    },
    userApplication: userApplication ? {
      id: userApplication.id,
      coverLetter: userApplication.coverLetter,
      proposedBudget: userApplication.proposedBudget,
      status: userApplication.status,
      createdAt: userApplication.createdAt,
    } : null,
  };
}

// Check if user can view project
function canViewProject(user: any, project: any): boolean {
  switch (user.role) {
    case UserRole.ADMIN:
      return true;
    case UserRole.CLIENT:
      // Can view own projects or published projects
      return project.clientId === user.id || project.status === 'PUBLISHED';
    case UserRole.VENDOR:
      // Can view published projects
      return project.status === 'PUBLISHED';
    case UserRole.TUKANG:
      // Can view published projects with workers needed
      return project.status === 'PUBLISHED' && project.workerNeeded > 0;
    case UserRole.SUPPLIER:
      // Can view published projects
      return project.status === 'PUBLISHED';
    default:
      return false;
  }
}

// Hanya admin yang boleh edit/hapus proyek. Client tidak bisa edit.
function canModifyProject(user: any, project: any): boolean {
  return user.role === UserRole.ADMIN;
}

// GET - Get single project
export const GET = withAuth(async (user, request: NextRequest, context) => {
  try {
    const projectId = context?.params?.id as string;
    
    if (!projectId) {
      return apiError('ID proyek tidak valid', 400);
    }
    
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
            specialty: true,
            experience: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          },
        },
        skills: {
          select: { id: true, name: true },
        },
        applications: {
          select: {
            id: true,
            coverLetter: true,
            proposedBudget: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true,
                rating: true,
                totalReviews: true,
                isVerified: true,
                specialty: true,
                experience: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        teamMembers: {
          select: {
            id: true,
            role: true,
            salaryType: true,
            salaryAmount: true,
            startDate: true,
            endDate: true,
            isActive: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                specialty: true,
                experience: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            teamMembers: true,
          },
        },
      },
    });
    
    if (!project) {
      return apiNotFound('Proyek tidak ditemukan');
    }
    
    // Check access permission
    if (!canViewProject(user, project)) {
      return apiForbidden('Anda tidak memiliki akses untuk melihat proyek ini');
    }
    
    // Get user's application if exists (for VENDOR/TUKANG)
    let userApplication = null;
    if (user.role === UserRole.VENDOR || user.role === UserRole.TUKANG) {
      userApplication = await db.application.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: user.id,
          },
        },
      });
    }
    
    // Hide applications details for non-owners
    let responseData = project;
    if (user.role !== UserRole.ADMIN && project.clientId !== user.id) {
      responseData = {
        ...project,
        applications: undefined, // Hide applications for non-owners
      };
    }
    
    return apiSuccess({ project: formatProjectResponse(responseData, userApplication) });
    
  } catch (error) {
    console.error('Get project error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// PATCH - Update project
export const PATCH = withAuth(async (user, request: NextRequest, context) => {
  try {
    const projectId = context?.params?.id as string;
    
    if (!projectId) {
      return apiError('ID proyek tidak valid', 400);
    }
    
    const existingProject = await db.project.findUnique({
      where: { id: projectId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
        },
      },
    });
    
    if (!existingProject) {
      return apiNotFound('Proyek tidak ditemukan');
    }
    
    // Check permission
    if (!canModifyProject(user, existingProject)) {
      return apiForbidden('Anda tidak memiliki akses untuk mengubah proyek ini');
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = projectUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validasi gagal', 400, validationResult.error.flatten());
    }
    
    const data = validationResult.data;
    
    // Validate category if provided
    if (data.categoryId) {
      const category = await db.category.findUnique({
        where: { id: data.categoryId },
      });
      
      if (!category) {
        return apiError('Kategori tidak ditemukan', 404);
      }
    }
    
    // Validate dates if provided
    const startDate = data.startDate !== undefined ? data.startDate : existingProject.startDate;
    const endDate = data.endDate !== undefined ? data.endDate : existingProject.endDate;
    
    if (startDate && endDate && startDate >= endDate) {
      return apiError('Tanggal selesai harus setelah tanggal mulai', 400);
    }
    
    // Check status transitions (admin dapat mengubah ke status apa pun)
    if (data.status && user.role !== UserRole.ADMIN) {
      const currentStatus = existingProject.status;
      const newStatus = data.status as ProjectStatus;
      const allowedTransitions: Record<string, string[]> = {
        DRAFT: ['PUBLISHED', 'CANCELLED'],
        PUBLISHED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
      };
      if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
        return apiError(`Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus}`, 400);
      }
    }
    
    // Validate vendor assignment
    if (data.vendorId !== undefined) {
      if (data.vendorId !== null) {
        const vendor = await db.user.findUnique({
          where: { id: data.vendorId },
        });
        
        if (!vendor || vendor.role !== UserRole.VENDOR) {
          return apiError('Vendor tidak ditemukan atau bukan vendor valid', 404);
        }
      }
    }
    
    // Build update data
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.workerNeeded !== undefined) updateData.workerNeeded = data.workerNeeded;
    if (data.requirements !== undefined) updateData.requirements = data.requirements;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.vendorId !== undefined) updateData.vendorId = data.vendorId;
    
    // Handle status changes
    if (data.status) {
      updateData.status = data.status;
      
      if (data.status === 'IN_PROGRESS') {
        updateData.acceptedAt = new Date();
        
        // Notify the assigned vendor
        const vendorId = data.vendorId || existingProject.vendorId;
        if (vendorId) {
          await createNotification(
            vendorId,
            'PROJECT_ACCEPTED',
            'Proyek Diterima',
            `Anda telah dipilih untuk proyek "${existingProject.title}". Proyek sekarang dalam progres.`,
            { projectId }
          );
        }
      }
      
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        
        // Notify vendor and team members
        const vendorId = data.vendorId || existingProject.vendorId;
        if (vendorId) {
          await createNotification(
            vendorId,
            'PROJECT_COMPLETED',
            'Proyek Selesai',
            `Proyek "${existingProject.title}" telah ditandai selesai.`,
            { projectId }
          );
        }
      }
      
      if (data.status === 'PUBLISHED' && existingProject.status === 'DRAFT') {
        // Notify vendors and tukangs about newly published project
        const vendors = await db.user.findMany({
          where: { role: UserRole.VENDOR, status: 'ACTIVE' },
          select: { id: true },
        });
        
        for (const vendor of vendors) {
          await createNotification(
            vendor.id,
            'PROJECT_NEW',
            'Proyek Baru Tersedia',
            `Proyek "${existingProject.title}" baru saja dipublikasikan.`,
            { projectId }
          );
        }
        
        if (existingProject.workerNeeded && existingProject.workerNeeded > 0) {
          const tukangs = await db.user.findMany({
            where: { role: UserRole.TUKANG, status: 'ACTIVE' },
            select: { id: true },
          });
          
          for (const tukang of tukangs) {
            await createNotification(
              tukang.id,
              'PROJECT_NEW',
              'Lowongan Pekerja Baru',
              `Dibutuhkan pekerja untuk proyek "${existingProject.title}".`,
              { projectId }
            );
          }
        }
      }
    }
    
    // Update project
    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            rating: true,
            totalReviews: true,
            isVerified: true,
            specialty: true,
            experience: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
          },
        },
        _count: {
          select: {
            applications: true,
            teamMembers: true,
          },
        },
      },
    });
    
    return apiSuccess({
      message: 'Proyek berhasil diperbarui',
      project: formatProjectResponse(updatedProject),
    });
    
  } catch (error) {
    console.error('Update project error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});

// DELETE - Delete project
export const DELETE = withAuth(async (user, request: NextRequest, context) => {
  try {
    const projectId = context?.params?.id as string;
    
    if (!projectId) {
      return apiError('ID proyek tidak valid', 400);
    }
    
    const existingProject = await db.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            applications: true,
            teamMembers: true,
          },
        },
      },
    });
    
    if (!existingProject) {
      return apiNotFound('Proyek tidak ditemukan');
    }
    
    // Check permission
    if (!canModifyProject(user, existingProject)) {
      return apiForbidden('Anda tidak memiliki akses untuk menghapus proyek ini');
    }
    
    // Check if project can be deleted
    if (existingProject.status === 'IN_PROGRESS' || existingProject.status === 'COMPLETED') {
      return apiError('Proyek yang sedang berjalan atau selesai tidak dapat dihapus', 400);
    }
    
    // Delete project (cascade will handle related data)
    await db.project.delete({
      where: { id: projectId },
    });
    
    return apiSuccess({ message: 'Proyek berhasil dihapus' });
    
  } catch (error) {
    console.error('Delete project error:', error);
    return apiError('Terjadi kesalahan pada server', 500);
  }
});
