/* ==========================================================
   SANPY DOWNLOADER — public/app.js
   ==========================================================
   Frontend ini TIDAK menyimpan API key apa pun. Semua request
   dikirim ke backend sendiri (/api/download), yang kemudian
   meneruskannya ke SocialKit dengan key yang tersimpan aman
   di server (lihat server/index.js dan .env).
   ========================================================== */

const urlInput = document.getElementById("url-input");
const pasteBtn = document.getElementById("paste-btn");
const platformBadge = document.getElementById("platform-badge");
const statusLine = document.getElementById("status-line");
const resultCard = document.getElementById("result-card");
const resultThumb = document.getElementById("result-thumb");
const resultTitle = document.getElementById("result-title");
const resultMeta = document.getElementById("result-meta");
const resultDl = document.getElementById("result-dl");
const setupNote = document.getElementById("setup-note");

const fmtButtons = [
  document.getElementById("btn-mp4"),
  document.getElementById("btn-mp4hd"),
  document.getElementById("btn-mp3"),
];

const PLATFORM_ICONS = {
  tiktok: "TT",
  instagram: "IG",
  youtube: "YT",
};

const PLATFORM_LABELS = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

function detectPlatform(url) {
  const u = url.trim().toLowerCase();
  if (!u) return null;
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "unknown";
}

function updateBadge(platform) {
  platformBadge.classList.remove("active");
  platformBadge.removeAttribute("data-platform");
  if (!platform || platform === "unknown") {
    platformBadge.textContent = "🔗";
    return;
  }
  platformBadge.dataset.platform = platform;
  platformBadge.textContent = PLATFORM_ICONS[platform];
  platformBadge.classList.add("active");
}

function setStatus(text, kind) {
  statusLine.textContent = text;
  statusLine.classList.remove("error", "ok");
  if (kind) statusLine.classList.add(kind);
}

function setButtonsEnabled(enabled) {
  fmtButtons.forEach((b) => (b.disabled = !enabled));
}

function setButtonLoading(btn, loading) {
  btn.classList.toggle("loading", loading);
  fmtButtons.forEach((b) => {
    if (b !== btn) b.disabled = loading ? true : b.disabled;
  });
}

urlInput.addEventListener("input", () => {
  const platform = detectPlatform(urlInput.value);
  updateBadge(platform);
  resultCard.classList.remove("show");

  if (!urlInput.value.trim()) {
    setStatus("Menunggu link.");
    setButtonsEnabled(false);
    return;
  }
  if (platform === "unknown") {
    setStatus("Link belum dikenali. Gunakan link TikTok, Instagram, atau YouTube.", "error");
    setButtonsEnabled(false);
    return;
  }
  setStatus(`Terdeteksi: ${PLATFORM_LABELS[platform]}. Siap diunduh.`, "ok");
  setButtonsEnabled(true);
});

pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    urlInput.value = text;
    urlInput.dispatchEvent(new Event("input"));
  } catch (e) {
    setStatus("Tidak bisa mengakses clipboard. Tempel manual dengan Ctrl+V.", "error");
  }
});

async function fetchDownloadLinks(url, format, quality) {
  const res = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, format, quality: quality || undefined }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Gagal memproses link ini.");
  }
  return data.data;
}

function showResult(data) {
  resultThumb.src = data.thumbnail || "";
  resultThumb.style.visibility = data.thumbnail ? "visible" : "hidden";
  resultTitle.textContent = data.title || "Tanpa judul";
  const size = data.fileSizeMB ? `${data.fileSizeMB}` : "";
  const dur = data.duration ? `${data.duration}` : "";
  resultMeta.textContent = [dur, size].filter(Boolean).join(" · ") || "Siap diunduh";
  resultDl.href = data.downloadUrl || "#";
  resultCard.classList.add("show");
}

fmtButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const platform = detectPlatform(urlInput.value);
    if (!platform || platform === "unknown") return;

    const format = btn.dataset.fmt;
    const quality = btn.dataset.quality;

    setButtonLoading(btn, true);
    setStatus("Memproses link…");
    resultCard.classList.remove("show");

    try {
      const data = await fetchDownloadLinks(urlInput.value.trim(), format, quality);
      showResult(data);
      setStatus("Selesai. File siap diunduh.", "ok");
    } catch (err) {
      setStatus(err.message || "Terjadi kesalahan saat memproses link.", "error");
    } finally {
      setButtonLoading(btn, false);
      setButtonsEnabled(true);
    }
  });
});

// Cek status server saat halaman dibuka, supaya admin langsung tahu
// kalau access key belum diisi.
(async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (!data.keyConfigured) {
      setupNote.style.display = "block";
    }
  } catch (e) {
    // Server API belum jalan / masih dibuka sebagai file statis saja — abaikan.
  }
})();
