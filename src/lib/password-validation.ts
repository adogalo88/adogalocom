/**
 * Validasi kekuatan password (sinkron dengan backend auth.ts).
 * File ini aman dipakai di client (tanpa dependency server).
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Minimal 8 karakter');
  }

  if (password.length > 128) {
    errors.push('Maksimal 128 karakter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Harus ada huruf kecil (a-z)');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Harus ada huruf besar (A-Z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Harus ada angka');
  }

  const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'user'];
  if (commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))) {
    errors.push('Jangan gunakan pola umum (mis. password, 123456)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Teks petunjuk persyaratan password untuk ditampilkan di form */
export const PASSWORD_REQUIREMENTS_TEXT =
  'Password harus: minimal 8 karakter, mengandung huruf kecil, huruf besar, angka, dan bukan pola umum (mis. password, 123456).';
