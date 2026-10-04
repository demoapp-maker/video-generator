/**
 * Format keluaran wajib:
 *   # Judul
 *   ## Script / ## Subtitle / ## Keyword Highlight / ## Thumbnail Text / ## CTA
 */
import {splitSentences} from "./text.js";

const denganTitik = (kalimat) => (/[.!?]$/.test(kalimat) ? kalimat : `${kalimat}.`);

export const scriptToMarkdown = (script) => {
  const narasi = script.segments.map((s) => denganTitik(s.narasi.trim())).join(" ");
  const subtitles = script.segments.flatMap((s) => splitSentences(s.narasi));
  const keyword = script.keyword ?? [];

  return [
    `# ${script.judul}`,
    "",
    "## Script",
    "",
    `[NARASI] ${narasi}`,
    "",
    "## Subtitle",
    "",
    ...subtitles.map((s) => `- ${s}`),
    "",
    "## Keyword Highlight",
    "",
    ...keyword.map((k) => `- ${k}`),
    "",
    "## Thumbnail Text",
    "",
    script.thumbnail,
    "",
    "## CTA",
    "",
    script.cta,
    "",
  ].join("\n");
};

export const timelineToSrt = (captions) => {
  const pad = (n, size = 2) => String(n).padStart(size, "0");
  const time = (seconds) => {
    const ms = Math.round((seconds % 1) * 1000);
    const total = Math.floor(seconds);
    return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)},${pad(ms, 3)}`;
  };

  return captions.map((c, i) => `${i + 1}\n${time(c.from)} --> ${time(c.to)}\n${c.text}\n`).join("\n");
};

export const timelineToText = (captions) => captions.map((c) => c.text).join("\n");

/** Bank ide → Markdown, supaya enak dibaca tanpa membuka JSON. */
export const ideasToMarkdown = (batch) => {
  const baris = (batch.ide ?? []).map((i, n) => {
    const status = i.status === "produced" ? "sudah diproduksi" : i.status === "scripted" ? "sudah ada script" : "siap dikerjakan";
    return [
      `## ${n + 1}. ${i.judul}`,
      "",
      `*${i.id} · ${(i.tag ?? []).join(", ")} · ${status}*`,
      "",
      `**Hook** — ${i.hook}`,
      "",
      `**Insight** — ${i.insight}`,
      "",
      `**Analogi** — ${i.analogi}`,
      "",
      `**Action** — ${i.action}`,
      "",
    ].join("\n");
  });

  return [
    `# Bank Ide ${batch.batch}`,
    "",
    batch.catatan ? `${batch.catatan}\n` : "",
    "Format tiap ide: Hook → Insight → Analogi → Action. Durasi maksimal 45 detik.",
    "Tanpa berita, tanpa hype. Semua topik di bawah ini evergreen.",
    "",
    ...baris,
    "---",
    "",
    "Menambah batch baru: jalankan prompt di `prompts/01-daily-ideas.md`,",
    "simpan hasilnya ke `content/ideas/<tanggal>.json`, lalu ekspor ulang ke Markdown.",
    "",
  ].join("\n");
};
