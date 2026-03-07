import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendProjectInviteEmail } from '@/lib/email';

/**
 * POST /api/projects/[id]/invite-vendor
 * Invite a vendor to a project. Client/admin only.
 * Body: { vendorId: string }
 * Sends email + creates notification.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Anda harus login' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const vendorId = body?.vendorId;

    if (!vendorId || typeof vendorId !== 'string') {
      return NextResponse.json(
        { error: 'vendorId wajib diisi' },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    }

    const isClient = project.clientId === currentUser.id;
    const isAdmin = currentUser.role === 'ADMIN';
    if (!isClient && !isAdmin) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengundang vendor ke proyek ini' },
        { status: 403 }
      );
    }

    const vendor = await db.user.findUnique({
      where: { id: vendorId, role: 'VENDOR' },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor tidak ditemukan' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'http://localhost:3000';
    const projectLink = `${baseUrl}/dashboard/projects/${projectId}`;

    await db.notification.create({
      data: {
        userId: vendorId,
        type: 'PROJECT_INVITE',
        title: 'Undangan Proyek',
        message: `${project.client.name} mengundang Anda ke proyek: ${project.title}`,
        data: JSON.stringify({ projectId, projectTitle: project.title }),
      },
    });

    const emailResult = await sendProjectInviteEmail(
      vendor.email,
      project.title,
      projectLink
    );

    if (!emailResult.success) {
      console.error('[InviteVendor] Email failed:', emailResult.error);
      // Still return success - notification was created
    }

    return NextResponse.json({
      success: true,
      message: 'Undangan berhasil dikirim ke vendor',
    });
  } catch (error) {
    console.error('Invite vendor error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
