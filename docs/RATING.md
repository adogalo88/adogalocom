# Cara Kerja Rating di Website

## Rating dengan Metrik Dimensi

Rating di website ini **menggunakan fungsi matematika rata-rata** untuk menghitung nilai akhir.

### Contoh

Jika pengguna memberikan rating per metrik:

- Kualitas pekerjaan: 5
- Ketepatan waktu: 5
- Komunikasi: 5
- Profesionalitas: 4
- Kesesuaian hasil dengan spesifikasi: 5

**Perhitungan:**
```
Rata-rata = (5 + 5 + 5 + 4 + 5) / 5 = 24 / 5 = 4.8
```

**Nilai yang disimpan:**
- `Review.rating`: dibulatkan ke integer terdekat → **5** (untuk display bintang)
- Rata-rata mentah 4.8 digunakan untuk memastikan nilai dalam rentang 1–5 sebelum dibulatkan

### Implementasi (API)

Di `src/app/api/reviews/route.ts`:
```typescript
finalRating = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
// Contoh: 4.8
data.rating = Math.round(finalRating); // 5 → disimpan di Review.rating (integer 1–5)
```

### Rating User (Profil)

Rating yang tampil di profil vendor/client adalah **rata-rata dari semua review** yang diterima:

```typescript
avgRating = totalRating / totalReviews
// Dibulatkan 2 desimal
rating = Math.round(avgRating * 100) / 100
```
