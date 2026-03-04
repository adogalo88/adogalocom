# 🚀 ADOGALO MARKETPLACE - DEPLOYMENT GUIDE

## Panduan Deploy ke Railway dengan PostgreSQL

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Sudah Siap
- [x] 35 Dashboard Pages - Semua fungsional
- [x] 62 API Endpoints - Semua berfungsi
- [x] 25 Database Models - Relasi proper
- [x] 5 Role Access - Terimplementasi
- [x] Location Taxonomy - Province/City terintegrasi
- [x] OTP Email Verification - Terimplementasi
- [x] Authentication & Authorization - Secure

### ⚠️ Perlu Konfigurasi di Railway
- [ ] PostgreSQL Database
- [ ] Environment Variables
- [ ] Domain/URL

---

## 🛠️ STEP 1: PERSIAPAN RAILWAY

### 1.1 Buat Akun Railway
1. Kunjungi [railway.app](https://railway.app)
2. Login dengan GitHub
3. Verify akun Anda

### 1.2 Install Railway CLI (Opsional)
```bash
npm install -g @railway/cli
railway login
```

---

## 🗄️ STEP 2: SETUP POSTGRESQL

### 2.1 Buat Project Baru di Railway
1. Klik **"New Project"**
2. Pilih **"Provision PostgreSQL"**
3. Tunggu hingga database aktif

### 2.2 Dapatkan Database URL
1. Buka PostgreSQL service di Railway
2. Klik tab **"Variables"**
3. Copy nilai `DATABASE_URL`
4. Format: `postgresql://user:password@host:port/railway?schema=public`

---

## ⚙️ STEP 3: KONFIGURASI ENVIRONMENT VARIABLES

### 3.1 Tambahkan Service Web
1. Di project yang sama, klik **"New"**
2. Pilih **"GitHub Repo"**
3. Pilih repository Adogalo

### 3.2 Cara Setup Variables di Railway (Langkah Detail)

1. **Buka project** Anda di [railway.app](https://railway.app) → pilih project Adogalo.
2. **Klik service Web** (bukan service PostgreSQL) di panel kiri.
3. **Buka tab "Variables"** (atau **"Settings"** → **Variables**).
4. Klik **"+ New Variable"** atau **"Add Variable"** / **"RAW Editor"**.
5. **Tambahkan variable satu per satu** (atau paste di RAW Editor jika tersedia):

| Variable         | Nilai / Cara dapat |
|------------------|--------------------|
| `DATABASE_URL`   | Dari service PostgreSQL: klik service **Postgres** → tab **Variables** → copy `DATABASE_URL`. Atau di service Web pilih **Reference** → pilih `Postgres` → pilih `DATABASE_URL`. |
| `JWT_SECRET`     | Generate: `openssl rand -base64 32` di terminal, paste hasilnya. |
| `NEXTAUTH_SECRET`| Generate: `openssl rand -base64 32` di terminal, paste hasilnya. |
| `NEXTAUTH_URL`   | URL app Anda, contoh: `https://nama-app-anda.up.railway.app` (sesuaikan setelah Generate Domain). |
| `NODE_ENV`       | `production` |
| `HOSTNAME`       | `0.0.0.0` (agar server bisa dijangkau healthcheck Railway). |
| `BREVO_API_KEY`  | Untuk kirim OTP email: dapatkan dari [Brevo](https://app.brevo.com) → Settings → SMTP & API → API Keys. Lihat **[Panduan Brevo](#-panduan-setup-brevo-otp-email)** di bawah. |
| `BREVO_SENDER_EMAIL` | (Opsional) Email pengirim, contoh: `noreply@domainanda.com`. Default: `noreply@adogalo.com`. |
| `BREVO_SENDER_NAME`  | (Opsional) Nama pengirim, contoh: `Adogalo`. Default: `Adogalo`. |

6. **Reference dari Postgres (untuk DATABASE_URL):**
   - Di form variable, pilih **"Add Reference"** atau **"Reference Variable"**.
   - Pilih service **Postgres** (atau nama service database Anda).
   - Pilih variable **DATABASE_URL**.
   - Railway akan isi otomatis dengan nilai dari database.

7. **Simpan** — Railway akan redeploy otomatis setelah variables berubah.

### 3.3 Set Environment Variables (Ringkas)
Di service Web, pastikan variables berikut ada:

```env
# Database (reference dari PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Authentication - GANTI DENGAN NILAI SECURE!
JWT_SECRET=generate-dengan-openssl-rand-base64-32
NEXTAUTH_SECRET=generate-dengan-openssl-rand-base64-32

# URL Production (sesuaikan dengan domain Anda)
NEXTAUTH_URL=https://nama-app-anda.up.railway.app

# Wajib agar healthcheck bisa akses server
HOSTNAME=0.0.0.0
NODE_ENV=production

# OTP email (Brevo) — wajib agar registrasi kirim OTP ke inbox
BREVO_API_KEY=xkeysib-xxxx...
# Opsional:
# BREVO_SENDER_EMAIL=noreply@domainanda.com
# BREVO_SENDER_NAME=Adogalo
```

### 3.4 Generate Secure Secrets
**Linux / Mac / Git Bash:**
```bash
openssl rand -base64 32   # jalankan 2x untuk JWT_SECRET dan NEXTAUTH_SECRET
```

**Windows (tanpa OpenSSL):** Jalankan script di project:
```bash
node scripts/generate-secrets.js
# atau
bun scripts/generate-secrets.js
```
Script akan mencetak dua baris (JWT_SECRET=... dan NEXTAUTH_SECRET=...) — copy masing-masing ke Railway.

**Alternatif (PowerShell):** satu secret per baris:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## 📧 PANDUAN SETUP BREVO (OTP EMAIL)

Agar kode OTP benar-benar terkirim ke email user saat registrasi, konfigurasi Brevo (gratis 300 email/hari).

### 1. Akun Brevo
1. Daftar/login di **[app.brevo.com](https://app.brevo.com)** (gratis).
2. Verifikasi email jika diminta.

### 2. Ambil API Key
1. Di dashboard Brevo, klik **ikon profil** (kanan atas) → **Settings** (Pengaturan).
2. Di menu kiri: **SMTP & API** → **API Keys & MCP**  
   (atau buka langsung: [app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)).
3. Klik **"Generate a new API key"** / **"Buat API key baru"**.
4. Beri nama (mis. `Adogalo Production`), lalu **Generate**.
5. **Copy API key** (format `xkeysib-...`) dan simpan. Nilai ini **hanya tampil sekali**; kalau hilang, buat key baru.

### 3. Sender email (penting)
Brevo hanya mengirim dari alamat yang sudah diverifikasi:
1. Di Brevo: **Settings** → **Senders & IP** (atau **Senders, Domains & Dedicated IPs**).
2. Tambah **Sender** (email + nama), lalu **verifikasi** email tersebut (Brevo kirim link verifikasi ke inbox).
3. Gunakan email yang sudah diverifikasi sebagai pengirim. Di Railway set variable **`BREVO_SENDER_EMAIL`** = email itu (opsional; default di kode: `noreply@adogalo.com` — harus ada sender yang diverifikasi dengan domain/email itu di Brevo).

### 4. Variable di Railway
Di service **Web** → **Variables**, tambah:
- **`BREVO_API_KEY`** = API key yang Anda copy (wajib).
- **`BREVO_SENDER_EMAIL`** = email pengirim yang sudah diverifikasi di Brevo (opsional).
- **`BREVO_SENDER_NAME`** = nama pengirim, mis. `Adogalo` (opsional).

Simpan lalu redeploy. Setelah itu, registrasi akan mengirim OTP ke inbox user.

---

## 📤 STEP 4: DEPLOY

### Option A: Deploy via Railway Dashboard
1. Railway akan otomatis detect Next.js
2. Klik **"Deploy"**
3. Tunggu build selesai

### Option B: Deploy via CLI
```bash
# Link ke project Railway
railway link

# Deploy
railway up

# Atau dari branch tertentu
railway up --branch main
```

---

## 🌱 STEP 5: SEED DATABASE

### 5.1 Buat Tabel di Production (wajib sekali jalan)
Project ini belum punya file di `prisma/migrations`. Jadi **`migrate deploy` tidak membuat tabel**. Wajib jalankan **`db push`** sekali ke database production supaya semua tabel (termasuk `otps` untuk registrasi) terbentuk.

**Opsi A – Railway CLI (dari folder project, sudah `railway link`):**
```bash
railway run npx prisma db push --schema=prisma/schema.production.prisma
```

**Opsi B – Dari PC (tanpa CLI):**  
Copy **DATABASE_URL_PUBLIC** dari service Postgres (bukan DATABASE_URL internal). Lalu di folder project:
```bash
set DATABASE_URL=postgresql://...paste_url_public...
npx prisma db push --schema=prisma/schema.production.prisma
```
(PowerShell: `$env:DATABASE_URL="postgresql://..."` lalu jalankan perintah yang sama.)

Setelah itu, registrasi (OTP) dan fitur lain yang pakai DB akan jalan. Tidak perlu dijalankan lagi kecuali Anda mengubah schema.

### 5.2 Jalankan Migration (kalau nanti pakai migrate)
Kalau nanti Anda punya migration files:
```bash
railway run npx prisma migrate deploy --schema=prisma/schema.production.prisma
```

### 5.3 Seed Data Awal (opsional)
```bash
# Seed admin dan data dasar
railway run bun prisma/seed.ts

# Seed lokasi Indonesia (38 provinsi, 395 kota)
railway run bun prisma/seed-locations.ts
```

---

## 🔧 STEP 6: VERIFIKASI DEPLOYMENT

### 6.1 Check Health
- Buka URL production
- Verify login page muncul
- Test register dengan OTP

### 6.2 Test Fitur Utama
1. ✅ Register dengan OTP
2. ✅ Login sebagai berbagai role
3. ✅ Create Project (CLIENT)
4. ✅ View Projects (VENDOR/TUKANG)
5. ✅ Material Request
6. ✅ Location Filter

---

## 🌐 STEP 7: CUSTOM DOMAIN (OPTIONAL)

### 7.1 Setup Custom Domain
1. Buka **Settings** → **Domains**
2. Klik **"Generate Domain"** untuk subdomain Railway
3. Atau **"Custom Domain"** untuk domain sendiri

### 7.2 Update NEXTAUTH_URL
Setelah domain dikonfigurasi, update:
```env
NEXTAUTH_URL=https://your-custom-domain.com
```

---

## 📊 POST-DEPLOYMENT

### Monitor Logs
```bash
railway logs
```

### Check Status
```bash
railway status
```

### Scale Resources
- Default: 512MB RAM, 1 vCPU
- Upgrade jika diperlukan di **Settings** → **Resources**

---

## 🔒 SECURITY CHECKLIST

- [x] JWT_SECRET menggunakan nilai random 32+ chars
- [x] NEXTAUTH_SECRET menggunakan nilai random 32+ chars
- [x] NEXTAUTH_URL menggunakan HTTPS
- [x] NODE_ENV=production
- [x] Password di-hash dengan bcrypt
- [x] Cookies httpOnly, secure, sameSite
- [ ] Rate limiting di auth endpoints (recommended)
- [ ] Email service untuk OTP (recommended)

---

## 📝 TROUBLESHOOTING

### Healthcheck Gagal / "Service Unavailable"
1. **Pastikan variables sudah di-set** (terutama `DATABASE_URL`, `HOSTNAME=0.0.0.0`). Tanpa `DATABASE_URL`, `prisma migrate deploy` bisa gagal dan server tidak pernah jalan.
2. **Cek runtime logs** (bukan hanya build log):
   - Di Railway: klik service **Web** → tab **"Deployments"** → klik deployment terakhir → **"View Logs"** (atau **"Logs"**).
   - Atau tab **"Logs"** di sisi kiri untuk log real-time.
   - Cari error saat start (misalnya "Prisma", "ECONNREFUSED", "DATABASE_URL").
3. **Cek `railway.toml`** sudah commit & push (termasuk `HOSTNAME=0.0.0.0` di start command).

### Build Error: Prisma Client
```bash
# Tambahkan di build command
prisma generate && next build
```

### Error: "the URL must start with the protocol `postgresql://` or `postgres://`"
Artinya **DATABASE_URL** di service **Web** belum sampai ke container atau nilainya salah saat runtime.

**Bukan karena file .env di repo:**  
File `.env` di project Anda ada di `.gitignore`, jadi tidak ikut ke Git dan tidak dipakai Railway. Yang dipakai Railway hanya **Variables** yang Anda set di dashboard service **Web**. Jadi masalah ada di konfigurasi variable di Railway, bukan di .env lokal.

**Perbaikan (coba berurutan):**

1. **Variable harus di service Web**  
   Pastikan **DATABASE_URL** ditambahkan di service **Web** (aplikasi Next.js), bukan hanya di service Postgres.

2. **Coba isi langsung (tanpa Reference)**  
   Kadang Reference ke service lain tidak ter-resolve saat container jalan.  
   - Buka service **Postgres** → **Variables** → copy **nilai penuh** `DATABASE_URL` (bentuk: `postgresql://user:pass@host:port/railway`).  
   - Buka service **Web** → **Variables** → buat/edit variable **DATABASE_URL** → paste nilai tadi (bukan teks seperti `${{Postgres.DATABASE_URL}}`).  
   - Simpan dan deploy ulang.

3. **Kalau pakai Reference**  
   Pastikan memilih **"Add Reference"** / **"Reference Variable"** lalu pilih service Postgres dan variable **DATABASE_URL**. Jangan ketik manual `${{...}}`.

4. **Cek nilai di deploy**  
   Setelah deploy, di service Web buka **Deployments** → deployment terakhir → **View Logs**. Jika error Prisma masih muncul, kemungkinan DATABASE_URL tetap kosong/salah di environment container.

Setelah diperbaiki, trigger deploy ulang.

### Database Connection Error
```bash
# Check DATABASE_URL format
postgresql://user:password@host:port/database?schema=public

# Test connection
railway run npx prisma db pull
```

### Migration Error
```bash
# Reset dan fresh migrate
railway run npx prisma migrate reset --force
railway run npx prisma migrate deploy
```

### OTP Not Working
- Pastikan email service dikonfigurasi
- Atau check console untuk development OTP

---

## 💰 ESTIMASI BIAYA RAILWAY

| Resource | Starter | Pro |
|----------|---------|-----|
| Database | $5/bulan | $10+/bulan |
| Web Service | $5/bulan | $10+/bulan |
| Total | **~$10/bulan** | **$20+/bulan** |

---

## 🎯 FITUR MVP YANG TERSEDIA

### Client Features
- ✅ Create Project (Tender/Harian)
- ✅ Material Request (Simple/RFQ/PDF)
- ✅ Search Vendor & Tukang by Location
- ✅ View Public Profiles
- ✅ Review System

### Vendor Features
- ✅ View Available Projects
- ✅ Submit Offers/Applications
- ✅ Team Management
- ✅ Attendance System
- ✅ Portfolio

### Tukang Features
- ✅ View Jobs by Location
- ✅ Apply to Projects
- ✅ Daily Attendance
- ✅ Portfolio

### Supplier Features
- ✅ View Material Requests by Location
- ✅ Submit Offers
- ✅ Delivery Confirmation

### Admin Features
- ✅ User Management
- ✅ Verification Workflow
- ✅ Location Management (Province/City)
- ✅ Category Management
- ✅ Reports & Analytics
- ✅ Platform Settings

---

## 📞 SUPPORT

Jika ada masalah saat deployment, cek:
1. Railway Logs di Dashboard
2. Database connection string
3. Environment variables
4. Prisma migration status

---

**Adogalo Marketplace v1.0.0**
*Home Improvement Marketplace Indonesia*
