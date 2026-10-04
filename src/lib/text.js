/**
 * src/lib/text.js — memotong narasi jadi subtitle, menghitung perkiraan durasi,
 * dan menyiapkan penanda kata kunci.
 */

/**
 * Pecah paragraf menjadi kalimat utuh.
 *
 * Dua hal yang sering salah di pemecah kalimat sederhana:
 *   1. singkatan ("dll.", "dsb.") yang bukan akhir kalimat, dan
 *   2. angka desimal ("3.5") yang titiknya bukan tanda baca.
 *
 * Angka desimal aman karena pemecahan mensyaratkan spasi setelah tanda baca.
 * Untuk singkatan, fragmen yang berakhir dengan singkatan digabung kembali ke
 * fragmen berikutnya — lebih aman daripada memotong kalimat di tengah.
 */
const SINGKATAN = [
  "dll", "dsb", "dst", "dkk", "yg", "no", "hal", "hlm", "jil", "ed", "vol",
  "sdr", "sdm", "jl", "kec", "kel", "kab", "prov", "thn", "bln", "spt", "a.n", "u.p",
];

const AKHIR_SINGKATAN = new RegExp(`(?:\\b(?:${SINGKATAN.join("|")})\\.|\\b[A-Z]\\.)$`, "i");

export const splitSentences = (text) => {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const fragmen = normalized.split(/(?<=[.!?])\s+/u);
  const hasil = [];

  for (const fragmen_ of fragmen) {
    const sebelumnya = hasil[hasil.length - 1];
    if (sebelumnya && AKHIR_SINGKATAN.test(sebelumnya.trim())) {
      hasil[hasil.length - 1] = `${sebelumnya} ${fragmen_}`;
    } else {
      hasil.push(fragmen_);
    }
  }

  return hasil.map((s) => s.trim()).filter(Boolean);
};

export const wordCount = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;

/** Perkiraan durasi bicara (detik) kalau audio belum diukur dari berkas. */
export const estimateSpeechSeconds = (text, kataPerDetik = 2.5) => {
  const words = wordCount(text);
  const sentences = splitSentences(text).length;
  return Number((words / kataPerDetik + sentences * 0.22).toFixed(2));
};

/**
 * Bungkus teks jadi baris-baris pendek.
 *
 * Ukurannya karakter, bukan jumlah kata, karena yang menentukan lebar di
 * layar 9:16 adalah panjang huruf — "mengotomatiskan" jauh lebih lebar
 * daripada "dan juga".
 */
export const packLines = (text, maxKarakterPerBaris = 26) => {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const calon = line ? `${line} ${word}` : word;
    if (calon.length <= maxKarakterPerBaris || !line) {
      line = calon;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/**
 * Ubah satu kalimat jadi potongan caption siap tampil: maksimal `maxBaris`
 * baris, tiap baris maksimal `maxKarakterPerBaris`. Kalimat panjang dipecah
 * jadi beberapa caption, bukan satu caption yang meluber keluar layar.
 */
export const chunkCaption = (text, maxKarakterPerBaris = 26, maxBaris = 2) => {
  const lines = packLines(text, maxKarakterPerBaris);
  const chunks = [];

  for (let i = 0; i < lines.length; i += maxBaris) {
    const isLast = i + maxBaris >= lines.length;
    const bagian = lines.slice(i, i + maxBaris);
    const sebelumnya = chunks[chunks.length - 1];

    // Baris sisa yang pendek lebih enak digabung ke potongan sebelumnya —
    // tapi hanya kalau potongan itu masih punya ruang. Tanpa pemeriksaan ini,
    // penggabungan bisa menghasilkan tiga baris di satu potongan.
    if (
      isLast &&
      bagian.length === 1 &&
      sebelumnya &&
      sebelumnya.length < maxBaris &&
      bagian[0].length <= maxKarakterPerBaris / 2
    ) {
      sebelumnya.push(bagian[0]);
      continue;
    }
    chunks.push(bagian);
  }

  return chunks.length ? chunks : [[String(text).trim()]];
};

/** Versi sederhana: hanya baris, tanpa pemecahan. */
export const wrapLines = (text, maxKarakterPerBaris = 26, maxBaris = 2) =>
  packLines(text, maxKarakterPerBaris).slice(0, maxBaris);

export const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Versi teks yang lebih aman untuk mesin TTS. */
export const ttsSafe = (text) =>
  String(text)
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/["""]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();

/** Deteksi potongan yang memuat kata kunci (untuk highlight subtitle). */
export const hasKeyword = (text, keywords = []) =>
  keywords.some((k) => k && new RegExp(`\\b${escapeRegex(k)}\\b`, "i").test(text));

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const totalWords = (segments = []) =>
  segments.reduce((sum, s) => sum + wordCount(s.narasi ?? s), 0);
