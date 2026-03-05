import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { validateEmail, validatePasswordStrength } from '@/lib/auth';
import { isBrevoConfigured, sendOTPEmail } from '@/lib/email';

const sendOTPSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  type: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_VERIFICATION']).default('EMAIL_VERIFICATION'),
  name: z.string().optional(), // For registration, store name temporarily
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'VENDOR', 'TUKANG', 'SUPPLIER']).optional(),
  password: z.string().optional(), // For registration, store password temporarily
});

// Rate limiting for OTP
const otpRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const OTP_RATE_LIMIT = 3; // 3 requests per 5 minutes
const OTP_RATE_WINDOW = 5 * 60 * 1000; // 5 minutes

function checkOTPRateLimit(email: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const entry = otpRateLimitMap.get(email);
  
  if (!entry || now > entry.resetTime) {
    otpRateLimitMap.set(email, { count: 1, resetTime: now + OTP_RATE_WINDOW });
    return { allowed: true };
  }
  
  if (entry.count >= OTP_RATE_LIMIT) {
    return { allowed: false, remainingTime: Math.ceil((entry.resetTime - now) / 1000) };
  }
  
  entry.count++;
  return { allowed: true };
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = sendOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, type, name, phone, role, password } = validationResult.data;

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateCheck = checkOTPRateLimit(email);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rateCheck.remainingTime} detik.` },
        { status: 429 }
      );
    }

    // For EMAIL_VERIFICATION (registration), validasi password sebelum kirim OTP
    if (type === 'EMAIL_VERIFICATION' && password) {
      const pwdCheck = validatePasswordStrength(password);
      if (!pwdCheck.valid) {
        return NextResponse.json(
          { error: 'Password tidak memenuhi persyaratan keamanan. ' + pwdCheck.errors.join(', ') },
          { status: 400 }
        );
      }
    }

    // For EMAIL_VERIFICATION (registration), check if email already registered and verified
    if (type === 'EMAIL_VERIFICATION') {
      const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser && existingUser.status === 'ACTIVE') {
        return NextResponse.json(
          { error: 'Email sudah terdaftar dan terverifikasi' },
          { status: 409 }
        );
      }
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Delete any existing OTP for this email and type
    await db.oTP.deleteMany({
      where: {
        email: email.toLowerCase(),
        type,
      },
    });

    // Create new OTP
    await db.oTP.create({
      data: {
        email: email.toLowerCase(),
        code: otpCode,
        type,
        expiresAt,
      },
    });

    // For registration, store temporary user data
    // In production, you might want to use Redis or similar for this
    if (type === 'EMAIL_VERIFICATION' && name && password) {
      // Store pending registration data (this is a simplified approach)
      // In production, use Redis or similar temporary storage
      const pendingData = {
        email: email.toLowerCase(),
        name,
        phone: phone || null,
        role: role || 'CLIENT',
        password, // Will be hashed when creating user
        createdAt: new Date(),
      };
      
      // Store in OTP record's metadata (we'll use a separate table or Redis in production)
      // For now, we'll pass this data through the verification step
    }

    // Kirim email via Brevo jika BREVO_API_KEY di-set; dev fallback: return OTP di response
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isBrevoConfigured()) {
      const result = await sendOTPEmail(email.toLowerCase(), otpCode, type);
      if (!result.success) {
        console.error('[OTP] Brevo send failed:', result.error);
        return NextResponse.json(
          { error: 'Gagal mengirim email. Coba lagi atau hubungi admin.' },
          { status: 502 }
        );
      }
    } else {
      console.log(`[OTP] Code: ${otpCode} sent to ${email} (type: ${type}) — set BREVO_API_KEY to send real email`);
    }

    return NextResponse.json({
      message: 'Kode OTP telah dikirim ke email Anda',
      expiresIn: 600, // 10 minutes in seconds
      ...(isDevelopment && !isBrevoConfigured() && { otpCode }), // Hanya di development tanpa Brevo
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
