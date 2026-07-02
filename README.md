# Sanpy Downloader

Web untuk mengunduh video (MP4 / MP4 HD) dan audio (MP3) dari **TikTok**, **Instagram**, dan **YouTube**. Cukup tempel link postingan, pilih format, unduh.

Terdiri dari dua bagian:
- **`public/`** — halaman web yang dilihat pengunjung (HTML/CSS/JS biasa)
- **`server/`** — backend kecil (Node.js/Express) yang menyimpan API key dengan aman dan meneruskan permintaan ke penyedia API (SocialKit)

Kenapa perlu backend? Supaya API key **tidak pernah terlihat** oleh pengunjung lewat "View Source" di browser mereka.

---

## 1. Persiapan

Pastikan sudah terpasang **Node.js versi 18 ke atas**. Cek dengan:

```bash
node -v
```

Kalau belum ada, unduh di [nodejs.org](https://nodejs.org).

---

## 2. Dapatkan API key gratis

1. Buka [socialkit.dev](https://www.socialkit.dev) dan daftar (gratis, tanpa kartu kredit).
2. Masuk ke dashboard, salin **access key** Anda.
3. Paket gratis memberi 20 permintaan/bulan — cukup untuk mencoba. Kalau butuh lebih banyak, tinggal upgrade paket dari dashboard yang sama, tanpa perlu ubah kode.

---

## 3. Instalasi

Buka folder project ini lewat terminal, lalu jalankan:

```bash
npm install
```

Ini akan mengunduh semua library yang dibutuhkan (Express, dll).

---

## 4. Konfigurasi API key

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka `.env`, isi baris berikut dengan key dari langkah 2:

```
SOCIALKIT_ACCESS_KEY=tempel_access_key_anda_di_sini
```

Simpan file.

---

## 5. Jalankan

```bash
npm start
```

Kalau berhasil, akan muncul:

```
✅ Sanpy Downloader berjalan di http://localhost:3000
```

Buka `http://localhost:3000` di browser. Web sudah siap dipakai.

---

## 6. Deploy ke internet (opsional)

Web ini bisa di-hosting di layanan mana pun yang mendukung Node.js, misalnya **Render**, **Railway**, **Fly.io**, atau **VPS** biasa. Langkah umum:

1. Upload seluruh folder project (kecuali `node_modules` dan `.env` — sudah otomatis diabaikan lewat `.gitignore`).
2. Di dashboard hosting, atur environment variable `SOCIALKIT_ACCESS_KEY` dengan key Anda (jangan taruh di file `.env` yang ikut ter-upload ke Git publik).
3. Set start command: `npm start`.
4. Selesai — hosting akan otomatis menjalankan `npm install` lalu `npm start`.

---

## Struktur folder

```
sanpy-downloader/
├── package.json          daftar dependency & perintah start
├── .env.example           contoh isi file konfigurasi (salin jadi .env)
├── .gitignore
├── server/
│   └── index.js           backend: terima request, panggil SocialKit, kembalikan hasil
└── public/
    ├── index.html          tampilan halaman
    └── app.js              logika tombol, deteksi platform, panggil backend
```

---

## Cara kerja singkat

1. Pengunjung tempel link di halaman web.
2. `public/app.js` mendeteksi platform (TikTok/Instagram/YouTube) dari bentuk link-nya, lalu menampilkan badge yang sesuai.
3. Saat tombol MP4 / MP4 HD / MP3 diklik, `app.js` mengirim link tersebut ke `POST /api/download` di server sendiri.
4. `server/index.js` menerima permintaan itu, menambahkan API key dari `.env`, lalu meneruskannya ke SocialKit.
5. Hasilnya (link file yang bisa diunduh, judul, thumbnail, durasi) dikirim balik ke halaman web dan ditampilkan.

---

## Mengganti penyedia API

Kalau ingin memakai provider lain (misalnya dari RapidAPI), cukup ubah bagian ini di `server/index.js`:

- `API_BASE` — alamat dasar API provider
- Bentuk `endpoint` dan `upstreamBody` di dalam `app.post("/api/download", ...)` — sesuaikan dengan format request provider yang dipakai
- Nama environment variable di `.env` kalau perlu

Frontend (`public/`) tidak perlu diubah sama sekali karena selalu bicara ke backend sendiri (`/api/download`), bukan langsung ke provider luar.

---

## Batasan & catatan penting

- Endpoint `/api/download` dibatasi (default 30 permintaan/jam per pengunjung) lewat `express-rate-limit`, supaya kuota API tidak cepat habis karena disalahgunakan. Atur lewat `RATE_LIMIT_PER_HOUR` di `.env`.
- Layanan seperti TikTok, Instagram, dan YouTube punya aturan penggunaan (Terms of Service) masing-masing terkait pengunduhan konten. Gunakan alat ini untuk konten yang memang berhak Anda unduh (milik sendiri, izin eksplisit, atau lisensi yang mengizinkan).
- Provider API pihak ketiga (SocialKit atau lainnya) bisa berubah format responsnya sewaktu-waktu. Kalau tiba-tiba error, cek dokumentasi terbaru provider tersebut.
