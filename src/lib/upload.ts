import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface MultiUploadResult {
  success: boolean;
  urls: string[];
  errors: string[];
}

/**
 * Save a file to the public/uploads directory
 */
export async function saveFile(
  file: File,
  folder: 'photos' | 'files' = 'files'
): Promise<UploadResult> {
  try {
    // Validate file size
    const maxSize = folder === 'photos' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return {
        success: false,
        error: `Ukuran file maksimal ${maxSize / 1024 / 1024}MB`,
      };
    }

    // Validate file type
    if (folder === 'photos') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
          success: false,
          error: 'Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP',
        };
      }
    } else {
      if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].includes(file.type)) {
        return {
          success: false,
          error: 'Tipe file tidak didukung',
        };
      }
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return public URL
    return {
      success: true,
      url: `/uploads/${folder}/${fileName}`,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Gagal menyimpan file',
    };
  }
}

/**
 * Save multiple files
 */
export async function saveFiles(
  files: File[],
  folder: 'photos' | 'files' = 'files'
): Promise<MultiUploadResult> {
  const urls: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = await saveFile(file, folder);
    if (result.success && result.url) {
      urls.push(result.url);
    } else if (result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    urls,
    errors,
  };
}

/**
 * Parse form data with files
 */
export async function parseFormData(request: Request): Promise<{
  fields: Record<string, string>;
  photos: File[];
  files: File[];
}> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  const photos: File[] = [];
  const files: File[] = [];

  formData.forEach((value, key) => {
    if (value instanceof File) {
      if (key === 'photos') {
        photos.push(value);
      } else if (key === 'files') {
        files.push(value);
      }
    } else {
      fields[key] = value;
    }
  });

  return { fields, photos, files };
}
