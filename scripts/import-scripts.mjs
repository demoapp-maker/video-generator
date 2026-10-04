/**
 * import-scripts.mjs — memecah satu berkas batch script menjadi berkas per video.
 *
 * Dipakai kalau kamu menulis banyak script sekaligus (misalnya hasil GPT),
 * atau mengisi sisa bank ide dalam satu duduk.
 *
 *   node scripts/import-scripts.mjs content/blueprint/batch-01.json
 *
 * Berkas batch: array script, atau { "scripts": [ ... ] }.
 * Tiap script mengikuti skema di docs/pipeline.md.
 *
 * Yang dilakukan:
 *   1. memvalidasi aturan gaya (jumlah kata, panjang kalimat, kata kunci),
 *   2. menulis content/scripts/<id>.json dan <id>.md,
 *   3. menandai ide terkait sebagai "scripted" di bank ide,
 *   4. melaporkan pelanggaran tanpa menghentikan proses.
 */
import path from "node:path";
import {paths} from "../src/config.js";
import {exists, readJson, writeJson, writeText} from "../src/lib/fsx.js";
import {splitSentences, wordCount} from "../src/lib/text.js";
import {scriptToMarkdown} from "../src/lib/markdown.js";
import {tandaiStatus} from "../src/stages/status.js";

const BATAS = {
  kata: 130,
  kataPerKalimat: 14,
  kataThumbnail: 5,
  kataCta: 14,
  keyword: 3,
};

const BAGIAN_WAJIB = ["hook", "insight", "analogi", "action"];

const periksa = (script) => {
  const masalah = [];
  const segmen = script.segments ?? [];

  if (!script.id) masalah.push("tidak ada id");
  if (!script.judul) masalah.push("tidak ada judul");
  if (!script.cta) masalah.push("tidak ada cta");
  if (wordCount(script.thumbnail ?? "") > BATAS.kataThumbnail) {
    masalah.push(`thumbnail ${wordCount(script.thumbnail)} kata, maksimal ${BATAS.kataThumbnail}`);
  }
  if (wordCount(script.cta ?? "") > BATAS.kataCta) {
    masalah.push(`cta ${wordCount(script.cta)} kata, maksimal ${BATAS.kataCta}`);
  }

  const bagian = segmen.map((s) => s.bagian);
  for (const wajib of BAGIAN_WAJIB) {
    if (!bagian.includes(wajib)) masalah.push(`segmen "${wajib}" belum ada`);
  }

  const totalKata = segmen.reduce((sum, s) => sum + wordCount(s.narasi ?? ""), 0);
  if (totalKata > BATAS.kata) masalah.push(`narasi ${totalKata} kata, maksimal ${BATAS.kata}`);

  for (const segmen_ of segmen) {
    for (const kalimat of splitSentences(segmen_.narasi ?? "")) {
      if (wordCount(kalimat) > BATAS.kataPerKalimat) {
        masalah.push(`kalimat ${wordCount(kalimat)} kata (${segmen_.bagian}): "${kalimat}"`);
      }
    }
  }

  const keyword = script.keyword ?? [];
  if (!keyword.length) masalah.push("kata kunci belum ada");
  if (keyword.length > BATAS.keyword) masalah.push(`${keyword.length} kata kunci, maksimal ${BATAS.keyword}`);

  return {totalKata, masalah};
};

const main = () => {
  const input = process.argv[2];
  if (!input) {
    console.error("Pakai: node scripts/import-scripts.mjs content/blueprint/batch-01.json");
    process.exitCode = 1;
    return;
  }

  const file = path.isAbsolute(input) ? input : path.join(paths.root, input);
  if (!exists(file)) {
    console.error(`Berkas tidak ditemukan: ${file}`);
    process.exitCode = 1;
    return;
  }

  const isi = readJson(file);
  const daftar = Array.isArray(isi) ? isi : (isi.scripts ?? []);
  if (!daftar.length) {
    console.error("Tidak ada script di berkas itu.");
    process.exitCode = 1;
    return;
  }

  console.log(`Mengimpor ${daftar.length} script dari ${path.relative(paths.root, file)}\n`);

  let jumlahMasalah = 0;
  for (const script of daftar) {
    const {totalKata, masalah} = periksa(script);
    const targetJson = path.join(paths.scripts, `${script.id}.json`);

    if (exists(targetJson) && !process.env.FORCE) {
      console.log(`- ${script.id}  dilewati (sudah ada). Pakai FORCE=1 untuk menimpa.`);
      continue;
    }

    writeJson(targetJson, script);
    writeText(path.join(paths.scripts, `${script.id}.md`), scriptToMarkdown(script));
    tandaiStatus(script.id, "scripted");

    const status = masalah.length ? `${masalah.length} catatan` : "lolos semua aturan";
    console.log(`+ ${script.id}  ${String(totalKata).padStart(3)} kata  ${script.judul}`);
    console.log(`   ${status}`);
    for (const m of masalah) {
      console.log(`     - ${m}`);
      jumlahMasalah++;
    }
  }

  console.log(
    `\nSelesai. ${daftar.length} script diproses, ${jumlahMasalah} catatan gaya.\n` +
      `Langkah berikutnya per video: siapkan audio di assets/audio/<id>/, lalu npm run produce -- <id>`,
  );
};

main();
