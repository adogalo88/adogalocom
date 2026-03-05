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
    
    // Get files from form data (support 'photos', 'files', and 'file' for single file)
    const photoFiles = (formData.getAll('photos') as File[]).filter(f => f && f.size > 0);
    let docFiles = (formData.getAll('files') as File[]).filter(f => f && f.size > 0);
    const singleFiles = (formData.getAll('file') as File[]).filter(f => f && f.size > 0);
    docFiles = [...docFiles, ...singleFiles];

    const result = {
      photos: [] as string[],
      files: [] as string[],
      urls: [] as string[],
      errors: [] as string[],
    };

    // Upload photos (images only, validated by saveFiles with folder 'photos')
    if (photoFiles.length > 0) {
      const photoResult = await saveFiles(photoFiles, 'photos');
      result.photos = photoResult.urls;
      result.errors.push(...photoResult.errors);
    }

    // Upload documents (images + PDF etc.)
    if (docFiles.length > 0) {
      const docResult = await saveFiles(docFiles, 'files');
      result.files = docResult.urls;
      result.errors.push(...docResult.errors);
    }

    if (photoFiles.length === 0 && docFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada file yang diupload' },
        { status: 400 }
      );
    }

    result.urls = [...result.photos, ...result.files];

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
