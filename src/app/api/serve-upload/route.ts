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
 * Used so that /uploads/* works in dev and production (standalone may not serve dynamic files).
 * Rewrite: /uploads/photos/xxx.jpg -> /api/serve-upload?path=photos/xxx.jpg
 */
export async function GET(request: NextRequest) {
  try {
    let pathParam = request.nextUrl.searchParams.get('path');
    if (!pathParam) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    pathParam = decodeURIComponent(pathParam).replace(/\\/g, '/');
    if (pathParam.includes('..') || pathParam.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const normalized = pathParam;
    const base = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(base, normalized);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(base))) {
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
