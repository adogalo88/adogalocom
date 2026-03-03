import { NextResponse } from 'next/server';

/**
 * Healthcheck endpoint untuk Railway (dan load balancer).
 * Tidak pakai DB/auth — hanya return 200 agar healthcheck lulus.
 * Railway memakai endpoint ini untuk memastikan deploy siap terima traffic.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 });
}
