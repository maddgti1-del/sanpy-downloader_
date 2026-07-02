/**
 * SANPY DOWNLOADER — server/index.js
 * ============================================================
 * Backend proxy kecil. Tugasnya cuma satu: menerima link dari
 * halaman web, meneruskannya ke API SocialKit dengan access key
 * yang tersimpan aman di server (lewat .env), lalu mengembalikan
 * hasilnya ke browser pengunjung.
 *
 * Karena key disimpan di server (bukan di kode frontend), key
 * ini TIDAK bisa dilihat siapa pun lewat "View Source" browser.
 * ============================================================
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_KEY = process.env.SOCIALKIT_ACCESS_KEY;
const API_BASE = "https://api.socialkit.dev";
const RATE_LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR || 30);

if (!ACCESS_KEY || ACCESS_KEY === "isi_access_key_socialkit_anda_di_sini") {
  console.warn(
    "\n⚠️  SOCIALKIT_ACCESS_KEY belum diisi di file .env.\n" +
    "   Salin .env.example menjadi .env lalu isi key Anda.\n" +
    "   Server tetap berjalan, tapi permintaan download akan gagal.\n"
  );
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Batasi jumlah permintaan per IP supaya kuota API tidak jebol
// karena disalahgunakan orang lain.
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: RATE_LIMIT_PER_HOUR,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak permintaan dari alamat ini. Coba lagi dalam beberapa saat.",
  },
});

const PLATFORM_ROUTES = {
  tiktok: "tiktok",
  instagram: "instagram",
  youtube: "youtube",
};

function detectPlatform(url) {
  const u = (url || "").toLowerCase();
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return null;
}

// Link pendek (mis. vt.tiktok.com/xxxx, vm.tiktok.com/xxxx) perlu
// "dibentangkan" dulu jadi link penuh sebelum dikirim ke SocialKit,
// karena beberapa provider API tidak bisa membaca link pendek.
const SHORT_LINK_HOSTS = ["vt.tiktok.com", "vm.tiktok.com", "instagram.com/reel", "youtu.be"];

function looksShortened(url) {
  const u = url.toLowerCase();
  return (
    u.includes("vt.tiktok.com") ||
    u.includes("vm.tiktok.com") ||
    u.includes("youtu.be")
  );
}

async function resolveShortLink(url) {
  if (!looksShortened(url)) return url;
  try {
    // "manual" redirect supaya kita bisa baca header Location tanpa
    // ikut mengunduh isi halaman tujuannya.
    const res = await fetch(url, { method: "GET", redirect: "manual" });
    const location = res.headers.get("location");
    if (location) {
      // Beberapa link redirect berlapis (pendek -> pendek -> panjang),
      // jadi kita telusuri sekali lagi kalau hasilnya masih pendek.
      if (looksShortened(location)) {
        return await resolveShortLink(location);
      }
      return location;
    }
    return url;
  } catch (err) {
    console.warn("Gagal membentangkan link pendek, memakai link asli:", err.message);
    return url;
  }
}

/**
 * POST /api/download
 * body: { url: string, format: "mp4" | "mp3", quality?: string }
 */
app.post("/api/download", downloadLimiter, async (req, res) => {
  try {
    const { url: rawUrl, format, quality } = req.body || {};

    if (!rawUrl || typeof rawUrl !== "string") {
      return res.status(400).json({ success: false, message: "Link tidak boleh kosong." });
    }
    if (!["mp4", "mp3"].includes(format)) {
      return res.status(400).json({ success: false, message: "Format harus mp4 atau mp3." });
    }

    // Bentangkan dulu kalau ini link pendek (vt.tiktok.com, vm.tiktok.com, youtu.be)
    const url = await resolveShortLink(rawUrl.trim());

    const platform = detectPlatform(url);
    if (!platform) {
      return res.status(400).json({
        success: false,
        message: "Link tidak dikenali. Gunakan link TikTok, Instagram, atau YouTube.",
      });
    }

    if (!ACCESS_KEY || ACCESS_KEY === "isi_access_key_socialkit_anda_di_sini") {
      return res.status(500).json({
        success: false,
        message: "Server belum dikonfigurasi. Admin perlu mengisi SOCIALKIT_ACCESS_KEY di .env.",
      });
    }

    const endpoint = `${API_BASE}/${PLATFORM_ROUTES[platform]}/download`;
    const upstreamBody = {
      access_key: ACCESS_KEY,
      url,
      format,
    };
    if (quality) upstreamBody.quality = quality;

    const upstreamRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamBody),
    });

    const data = await upstreamRes.json();

    if (!upstreamRes.ok || !data.success) {
      return res.status(upstreamRes.status || 502).json({
        success: false,
        message: data.message || "Gagal memproses link ini. Coba lagi atau periksa link-nya.",
      });
    }

    return res.json({ success: true, data: data.data, platform });
  } catch (err) {
    console.error("Kesalahan /api/download:", err.message);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server. Coba lagi sebentar lagi.",
    });
  }
});

// Health check — berguna untuk memastikan server & key sudah siap
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    keyConfigured: Boolean(ACCESS_KEY && ACCESS_KEY !== "isi_access_key_socialkit_anda_di_sini"),
  });
});

// Semua rute lain kembali ke halaman utama (untuk SPA-style routing sederhana)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n✅ Sanpy Downloader berjalan di http://localhost:${PORT}\n`);
});
