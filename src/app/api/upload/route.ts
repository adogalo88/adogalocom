import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveFiles } from '@/lib/upload';

// =====================
// POST: Upload Files
// =====================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengupload file' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Get files from form data
    const photoFiles = formData.getAll('photos') as File[];
    const docFiles = formData.getAll('files') as File[];

    // Filter out empty files
    const validPhotoFiles = photoFiles.filter(f => f && f.size > 0);
    const validDocFiles = docFiles.filter(f => f && f.size > 0);

    const result = {
      photos: [] as string[],
      files: [] as string[],
      errors: [] as string[],
    };

    // Upload photos
    if (validPhotoFiles.length > 0) {
      const photoResult = await saveFiles(validPhotoFiles, 'photos');
      result.photos = photoResult.urls;
      result.errors.push(...photoResult.errors);
    }

    // Upload documents
    if (validDocFiles.length > 0) {
      const docResult = await saveFiles(validDocFiles, 'files');
      result.files = docResult.urls;
      result.errors.push(...docResult.errors);
    }

    // If no files were uploaded
    if (validPhotoFiles.length === 0 && validDocFiles.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada file yang diupload' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File berhasil diupload',
      data: result,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupload file' },
      { status: 500 }
    );
  }
}
