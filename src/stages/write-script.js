/**
 * Stage SCRIPT.
 *
 * Dua mode:
 *   - dengan OPENAI_API_KEY → memakai prompts/02-script-writer.md lewat LLM
 *   - tanpa API key        → menyusun draft dari field ide (hook/insight/analogi/action)
 *
 * Mode kedua bukan pengganti penulis. Ia menjaga pipeline tetap jalan dan
 * memberi bahan mentah untuk diedit 5 menit, bukan memulai dari halaman kosong.
 */
import fs from "node:fs";
import path from "node:path";
import {paths, runtime} from "../config.js";
import {exists, listFiles, readJson, writeJson, writeText} from "../lib/fsx.js";
import {splitSentences, wordCount} from "../lib/text.js";
import {scriptToMarkdown} from "../lib/markdown.js";
import {tandaiStatus} from "./status.js";

const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "itu", "ini", "untuk", "dengan", "tidak", "bukan", "kamu",
  "kita", "saya", "aku", "ada", "adalah", "akan", "bisa", "sudah", "belum", "juga", "tapi",
  "atau", "pada", "saat", "kalau", "jadi", "lebih", "paling", "setiap", "satu", "dua",
  "orang", "banyak", "cuma", "hanya", "masih", "harus", "mau", "punya", "tanpa", "karena",
]);

/* ---------------- bank ide ---------------- */

export const bacaSemuaIde = () => {
  const batchFiles = listFiles(paths.ideas, ".json");
  const ide = [];
  for (const file of batchFiles) {
    const batch = readJson(path.join(paths.ideas, file));
    for (const item of batch.ide ?? []) ide.push({...item, batch: batch.batch, file});
  }
  return ide;
};

export const cariIde = (id) => {
  const ide = bacaSemuaIde().find((i) => i.id === id);
  if (!ide) throw new Error(`Ide ${id} tidak ditemukan di content/ideas/.`);
  return ide;
};

/* ---------------- ekstraksi kata kunci ---------------- */

const kataKunciDari = (ide, teks) => {
  const dariTag = (ide.tag ?? []).filter((t) => t === t.toUpperCase() || t.length <= 4);
  const frekuensi = new Map();
  for (const kata of teks.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/)) {
    if (!kata || kata.length < 4 || STOPWORDS.has(kata)) continue;
    frekuensi.set(kata, (frekuensi.get(kata) ?? 0) + 1);
  }
  const populer = [...frekuensi.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kata]) => kata)
    .filter((kata) => !dariTag.some((t) => t.toLowerCase() === kata));

  return [...new Set([...dariTag, ...populer])].slice(0, 3);
};

/* ---------------- draft dari ide ---------------- */

const draftDariIde = (ide) => {
  const kalimatInsight = splitSentences(ide.insight);
  const insight = kalimatInsight.length > 2 ? kalimatInsight.slice(0, 2).join(" ") : ide.insight;
  const narasi = [ide.hook, insight, ide.analogi, ide.action].join(" ");

  return {
    id: ide.id,
    judul: ide.judul,
    thumbnail: ide.judul.split(/\s+/).slice(0, 5).join(" "),
    keyword: kataKunciDari(ide, narasi),
    cta: "Menurutmu, kebiasaan mana yang paling sering kamu ulang?",
    catatanProduksi:
      "Draft otomatis dari bank ide (tanpa LLM). Periksa gaya bahasa dan panjang kalimat sebelum dipakai.",
    sumber: "bank-ide",
    segments: [
      {bagian: "hook", label: "HOOK", narasi: ide.hook},
      {bagian: "insight", label: "INSIGHT", narasi: insight},
      {bagian: "analogi", label: "ANALOGI", narasi: ide.analogi},
      {bagian: "action", label: "AKSI", narasi: ide.action},
    ],
  };
};

/* ---------------- draft lewat LLM ---------------- */

const PROMPT_FILE = "02-script-writer.md";

const draftDenganLlm = async (ide) => {
  const promptText = fs.readFileSync(path.join(paths.root, "prompts", PROMPT_FILE), "utf8");
  const instruksi = promptText
    .split("---")[1]
    .replaceAll("{{IDE}}", JSON.stringify(ide, null, 2))
    .replaceAll("{{ID}}", ide.id);

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await fetch(`${runtime.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      response_format: {type: "json_object"},
      messages: [
        {role: "system", content: "Kamu penulis script video pendek berbahasa Indonesia. Keluarkan JSON valid saja."},
        {role: "user", content: `${instruksi}\n\nBalas hanya dengan JSON.`},
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM gagal (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Jawaban LLM tidak berisi JSON.");

  const script = JSON.parse(match[0]);
  script.id = ide.id;
  script.sumber = `llm:${model}`;
  script.segments = (script.segments ?? []).map((s) => ({
    bagian: s.bagian,
    label: s.label ?? s.bagian.toUpperCase(),
    narasi: s.narasi,
  }));
  return script;
};

/* ---------------- API stage ---------------- */

/**
 * @param {{id?: string, pakaiLlm?: boolean}} params
 */
export const tulisScript = async ({id, pakaiLlm = true} = {}) => {
  if (!id) throw new Error("Sebutkan ide: npm run script -- --idea v001");

  const ide = cariIde(id);
  const targetJson = path.join(paths.scripts, `${id}.json`);

  if (exists(targetJson) && !process.env.FORCE) {
    console.log(`Script ${id} sudah ada (${path.relative(paths.root, targetJson)}). Pakai FORCE=1 untuk menimpa.`);
    return readJson(targetJson);
  }

  let script;
  if (pakaiLlm && runtime.openaiKey) {
    console.log(`Menulis script ${id} lewat LLM...`);
    script = await draftDenganLlm(ide);
  } else {
    console.log(
      `Menyusun draft ${id} dari bank ide (tanpa LLM)${pakaiLlm ? " — OPENAI_API_KEY belum diset" : ""}.`,
    );
    script = draftDariIde(ide);
  }

  const jumlahKata = script.segments.reduce((sum, s) => sum + wordCount(s.narasi), 0);
  if (jumlahKata > 130) {
    script.peringatan = `Narasi ${jumlahKata} kata, di atas batas 130 kata untuk 45 detik.`;
  }

  writeJson(targetJson, script);
  writeText(path.join(paths.scripts, `${id}.md`), scriptToMarkdown(script));
  tandaiStatus(id, "scripted");

  console.log(`Script : ${path.relative(paths.root, targetJson)}`);
  console.log(`Subtitle: ${path.relative(paths.root, path.join(paths.scripts, `${id}.md`))}`);
  if (script.peringatan) console.log(`Catatan: ${script.peringatan}`);

  return script;
};
