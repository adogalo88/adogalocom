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

### 5.1 Jalankan Migration
Di Railway dashboard, buka tab **"Settings"** → **"PRISMA"**:
```bash
npx prisma migrate deploy
```

Atau via CLI:
```bash
railway run npx prisma migrate deploy
```

### 5.2 Seed Data Awal
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
