'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Mail, Lock, User, Phone, Building2, Wrench, Truck, UserCircle, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { validatePasswordStrength, PASSWORD_REQUIREMENTS_TEXT } from '@/lib/password-validation';

const roles = [
  {
    value: 'CLIENT',
    label: 'Klien',
    description: 'Pemilik proyek yang mencari vendor atau tukang',
    icon: UserCircle,
    color: 'from-purple-500 to-purple-600',
  },
  {
    value: 'VENDOR',
    label: 'Vendor',
    description: 'Kontraktor atau perusahaan jasa konstruksi',
    icon: Building2,
    color: 'from-blue-500 to-blue-600',
  },
  {
    value: 'TUKANG',
    label: 'Tukang',
    description: 'Pekerja lepas dengan keahlian khusus',
    icon: Wrench,
    color: 'from-orange-500 to-orange-600',
  },
  {
    value: 'SUPPLIER',
    label: 'Supplier',
    description: 'Penyedia material bangunan',
    icon: Truck,
    color: 'from-teal-500 to-teal-600',
  },
] as const;

type Step = 'form' | 'otp';

export default function RegisterPage() {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'VENDOR' | 'TUKANG' | 'SUPPLIER'>('CLIENT');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  
  // UI state
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  
  const { login } = useAuth();
  const router = useRouter();

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === 'otp') {
      setCanResend(true);
    }
  }, [countdown, step]);

  // OTP input handling
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setOtp(pastedData.split(''));
    }
  };

  // Handle OTP keydown for backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Send OTP
  const handleSendOTP = async () => {
    setError('');

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi tidak cocok');
      return;
    }

    const pwdValidation = validatePasswordStrength(password);
    if (!pwdValidation.valid) {
      setError('Password tidak memenuhi persyaratan keamanan: ' + pwdValidation.errors.join(', '));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'EMAIL_VERIFICATION',
          name,
          phone: phone || undefined,
          role,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim OTP');
      }

      // In development, show the OTP
      if (data.otpCode) {
        setDevOtp(data.otpCode);
      }

      setCountdown(60); // 60 seconds countdown
      setCanResend(false);
      setStep('otp');
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'EMAIL_VERIFICATION',
          name,
          phone: phone || undefined,
          role,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim ulang OTP');
      }

      if (data.otpCode) {
        setDevOtp(data.otpCode);
      }

      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim ulang OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and complete registration
  const handleVerifyOTP = async () => {
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Masukkan kode OTP lengkap');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: otpCode,
          type: 'EMAIL_VERIFICATION',
          name,
          phone: phone || undefined,
          role,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verifikasi gagal');
      }

      // Login the user
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi gagal');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to form
  const handleBack = () => {
    setStep('form');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setDevOtp(null);
  };

  // Render OTP step
  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fd904c]/10 via-background to-[#e57835]/10 p-4 py-8">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#fd904c]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#e57835]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <Card className="w-full max-w-md glass-card relative z-10">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-[#fd904c]/10">
                <ShieldCheck className="h-8 w-8 text-[#fd904c]" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
              Verifikasi Email
            </CardTitle>
            <CardDescription>
              Kode verifikasi telah dikirim ke<br />
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {devOtp && (
              <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <span className="font-medium">Dev Mode:</span> Kode OTP Anda adalah{' '}
                  <span className="font-bold text-lg">{devOtp}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* OTP Input */}
            <div className="space-y-2">
              <Label className="text-center block">Masukkan Kode OTP</Label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-14 text-center text-xl font-bold"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Timer and Resend */}
            <div className="text-center space-y-2">
              {countdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Kirim ulang kode dalam{' '}
                  <span className="font-medium text-foreground">{countdown}</span> detik
                </p>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOTP}
                  disabled={!canResend || isLoading}
                  className="text-[#fd904c]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Kirim Ulang Kode
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={handleVerifyOTP}
                className="w-full bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90"
                disabled={isLoading || otp.join('').length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  'Verifikasi & Daftar'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render form step
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fd904c]/10 via-background to-[#e57835]/10 p-4 py-8">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#fd904c]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#e57835]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <Card className="w-full max-w-lg glass-card relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Adogalo"
              width={50}
              height={50}
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
            Daftar Akun Baru
          </CardTitle>
          <CardDescription>
            Bergabung dengan marketplace konstruksi terpercaya
          </CardDescription>
        </CardHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSendOTP(); }}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Daftar Sebagai</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-left',
                      role === r.value
                        ? 'border-[#fd904c] bg-[#fd904c]/10'
                        : 'border-border hover:border-[#fd904c]/50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg bg-gradient-to-br text-white', r.color)}>
                      <r.icon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-sm">{r.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor HP (Opsional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 karakter, huruf besar+kecil, angka"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {PASSWORD_REQUIREMENTS_TEXT}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPassword ? 'Sembunyikan' : 'Tampilkan'} password
            </button>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim Kode...
                </>
              ) : (
                'Daftar Sekarang'
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-[#fd904c] hover:underline font-medium">
                Masuk di sini
              </Link>
            </p>

            <p className="text-xs text-center text-muted-foreground">
              Dengan mendaftar, Anda menyetujui{' '}
              <Link href="/terms" className="text-[#fd904c] hover:underline">
                Syarat & Ketentuan
              </Link>{' '}
              dan{' '}
              <Link href="/privacy" className="text-[#fd904c] hover:underline">
                Kebijakan Privasi
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
