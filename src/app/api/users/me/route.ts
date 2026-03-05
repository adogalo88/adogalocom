import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  cityId: z.string().optional().nullable(),
  postalCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  specialty: z.string().optional(),
  experience: z.number().optional(),
  materialCategoryIds: z.array(z.string()).optional(),
  verificationEntityType: z.enum(['PERORANGAN', 'BADAN_USAHA']).optional().nullable(),
  picName: z.string().optional().nullable(),
  picPhone: z.string().optional().nullable(),
  picKtpPhoto: z.string().optional().nullable(),
  nibDoc: z.string().optional().nullable(),
  npwpDoc: z.string().optional().nullable(),
  aktaPendirianDoc: z.string().optional().nullable(),
  siupDoc: z.string().optional().nullable(),
  // Verifikasi Tukang
  ktpPhoto: z.string().optional().nullable(),
  skckDoc: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = { ...validationResult.data };
    const materialCategoryIds = updateData.materialCategoryIds;
    delete (updateData as Record<string, unknown>).materialCategoryIds;

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const data: Parameters<typeof db.user.update>[0]['data'] = { ...updateData };
    if (currentUser.role === 'SUPPLIER' && Array.isArray(materialCategoryIds)) {
      data.materialCategories = { set: materialCategoryIds.map((id) => ({ id })) };
    }

    const user = await db.user.update({
      where: { id: currentUser.id },
      data,
    });

    // Return user without password
    const { password: _, ...safeUser } = user;
    
    return NextResponse.json({ 
      message: 'Profil berhasil diperbarui',
      user: safeUser 
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
