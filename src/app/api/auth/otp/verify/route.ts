import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength, generateToken, setAuthCookie } from '@/lib/auth';

const verifyOTPSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  code: z.string().length(6, 'Kode OTP harus 6 digit'),
  type: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'LOGIN_VERIFICATION']).default('EMAIL_VERIFICATION'),
  // For registration, pass these fields
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'VENDOR', 'TUKANG', 'SUPPLIER']).optional(),
  password: z.string().min(8).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = verifyOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, code, type, name, phone, role, password } = validationResult.data;

    // Find the OTP record
    const otpRecord = await db.oTP.findFirst({
      where: {
        email: email.toLowerCase(),
        type,
        usedAt: null, // Not yet used
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Kode OTP tidak ditemukan atau sudah kadaluarsa' },
        { status: 400 }
      );
    }

    // Verify the code
    if (otpRecord.code !== code) {
      return NextResponse.json(
        { error: 'Kode OTP tidak valid' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await db.oTP.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Handle different OTP types
    if (type === 'EMAIL_VERIFICATION') {
      // For registration, create the user
      if (!name || !password || !role) {
        return NextResponse.json(
          { error: 'Data registrasi tidak lengkap' },
          { status: 400 }
        );
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: 'Password tidak memenuhi persyaratan keamanan', details: passwordValidation.errors },
          { status: 400 }
        );
      }

      // Check if user already exists (shouldn't happen but just in case)
      const existingUser = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        // If user exists but not verified, update status
        if (existingUser.status === 'PENDING_VERIFICATION') {
          const updatedUser = await db.user.update({
            where: { id: existingUser.id },
            data: {
              status: 'ACTIVE',
              isVerified: true,
              verifiedAt: new Date(),
            },
          });

          // Generate JWT token
          const token = await generateToken({
            userId: updatedUser.id,
            email: updatedUser.email,
            role: updatedUser.role,
            name: updatedUser.name,
          });

          await setAuthCookie(token);

          return NextResponse.json({
            message: 'Email berhasil diverifikasi',
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              status: updatedUser.status,
            },
          });
        }

        return NextResponse.json(
          { error: 'Email sudah terdaftar' },
          { status: 409 }
        );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await db.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          phone: phone || null,
          role,
          status: 'ACTIVE', // Email verified, so active
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // Generate JWT token
      const token = await generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      await setAuthCookie(token);

      return NextResponse.json({
        message: 'Registrasi berhasil',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      }, { status: 201 });
    }

    if (type === 'PASSWORD_RESET') {
      // For password reset, return success and let frontend handle the next step
      return NextResponse.json({
        message: 'OTP berhasil diverifikasi',
        verified: true,
        email: email.toLowerCase(),
      });
    }

    if (type === 'LOGIN_VERIFICATION') {
      // For login verification, check if user exists and log them in
      const user = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User tidak ditemukan' },
          { status: 404 }
        );
      }

      // Generate JWT token
      const token = await generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      await setAuthCookie(token);

      return NextResponse.json({
        message: 'Login berhasil',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });
    }

    return NextResponse.json({ error: 'Tipe OTP tidak valid' }, { status: 400 });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
