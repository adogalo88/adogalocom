import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
};

/**
 * Serve uploaded files from public/uploads.
 * Rewrite: /uploads/photos/xxx.png -> /api/serve-upload/photos/xxx.png
 * Path comes from URL segments, so no query encoding issues.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params;
    const parts = pathSegments ?? [];
    if (parts.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const normalized = parts.join('/');
    if (normalized.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const base = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(base, normalized);
    const resolved = path.resolve(filePath);
    const baseResolved = path.resolve(base);
    if (!resolved.startsWith(baseResolved)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    if (!existsSync(resolved)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const buffer = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('serve-upload error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
