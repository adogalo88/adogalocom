/**
 * Kirim email via Brevo (Transactional API v3).
 * Set BREVO_API_KEY di env. Opsional: BREVO_SENDER_EMAIL, BREVO_SENDER_NAME.
 * Docs: https://developers.brevo.com/reference/send-transac-email
 */
const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@adogalo.com';
const senderName = process.env.BREVO_SENDER_NAME ?? 'Adogalo';

export function isBrevoConfigured(): boolean {
  return Boolean(apiKey && apiKey.length > 0);
}

export async function sendProjectInviteEmail(
  toEmail: string,
  projectTitle: string,
  projectLink: string
): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY not set' };
  }

  const subject = `Undangan Proyek: ${projectTitle} | Adogalo`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color: #fd904c;">Adogalo</h2>
      <p>Anda diundang untuk mengikuti proyek:</p>
      <p style="font-size: 18px; font-weight: bold; color: #333;">${projectTitle}</p>
      <p style="margin-top: 20px;">
        <a href="${projectLink}" style="display: inline-block; padding: 12px 24px; background: #fd904c; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Lihat Detail Proyek
        </a>
      </p>
      <p style="color: #666; font-size: 14px; margin-top: 24px;">
        Klik tombol di atas untuk melihat detail proyek dan mengirim penawaran.
      </p>
    </div>
  `;
  const textContent = `Undangan proyek: ${projectTitle}. Lihat detail: ${projectLink}`;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
        textContent,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[Brevo] Send project invite error:', res.status, body);
      return { success: false, error: body || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Brevo] Send project invite failed:', message);
    return { success: false, error: message };
  }
}

export async function sendOTPEmail(
  toEmail: string,
  otpCode: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_VERIFICATION' = 'EMAIL_VERIFICATION'
): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY not set' };
  }

  const subject =
    type === 'EMAIL_VERIFICATION'
      ? 'Kode verifikasi pendaftaran Adogalo'
      : type === 'PASSWORD_RESET'
        ? 'Reset password - Kode OTP Adogalo'
        : 'Kode verifikasi login Adogalo';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #fd904c;">Adogalo</h2>
      <p>Kode verifikasi Anda:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #333;">${otpCode}</p>
      <p style="color: #666;">Kode ini berlaku 10 menit. Jangan bagikan kode ini ke siapa pun.</p>
      <p style="color: #999; font-size: 12px;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
    </div>
  `;

  const textContent = `Kode verifikasi Adogalo: ${otpCode}. Berlaku 10 menit. Jangan bagikan ke siapa pun.`;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
        textContent,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[Brevo] API error:', res.status, body);
      return { success: false, error: body || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Brevo] Send OTP email failed:', message);
    return { success: false, error: message };
  }
}
