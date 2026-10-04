#!/usr/bin/env node
/**
 * Satu pintu masuk untuk seluruh pipeline.
 *
 *   node src/cli.js <perintah> [argumen] [opsi]
 *
 * Perintah: ideas, script, voice, host, plan, render, produce, daily,
 *           weekly, dashboard, doctor
 */
import fs from "node:fs";
import path from "node:path";
import {brand, paths, runtime} from "./config.js";
import {listFiles, readJson, writeText} from "./lib/fsx.js";
import {bacaSemuaIde, tulisScript} from "./stages/write-script.js";
import {planVideo} from "./stages/plan.js";
import {renderVideo} from "./stages/render.js";
import {produceVideo} from "./stages/produce.js";
import {jalankanHarian} from "./stages/daily.js";
import {laporanMingguan} from "./stages/weekly.js";
import {startDashboard} from "./stages/dashboard.js";
import {ideasToMarkdown} from "./lib/markdown.js";
import {doctor} from "./stages/doctor.js";
import {daftarScript} from "./stages/list.js";
import {synthesize} from "./lib/tts/index.js";
import {generateHost} from "./lib/host/index.js";

/* ---------------------------------------------------------------- */
/* Argumen                                                          */
/* ---------------------------------------------------------------- */

const argv = process.argv.slice(2);
const perintah = argv[0];
const positional = argv.slice(1).filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  argv
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v === undefined ? true : v];
    }),
);

/* ---------------------------------------------------------------- */
/* Bantuan                                                          */
/* ---------------------------------------------------------------- */

const bantuan = `
Sistem produksi video pendek ${brand.handle} — ${brand.tagline}

  npm run list                           daftar script + perkiraan durasi
  npm run ideas                          bank ide + prompt ide harian
  npm run ideas -- --print               cetak prompt ide apa adanya
  npm run ideas -- --md=content/ideas/2026-10-03.md   ekspor bank ide ke Markdown
  npm run script -- --idea v001          tulis script dari satu ide
  npm run voice -- v001 [--provider=...] hasilkan narasi TTS
  npm run host  -- v001 [--provider=...] siapkan visual host
  npm run plan  -- v001                  ukur durasi & susun subtitle
  npm run render -- v001                 render mp4 lewat Remotion
  npm run produce -- v001                voice + host + plan + render
  npm run daily [-- v004]                produksi otomatis ide berikutnya
  npm run weekly                         laporan ritme produksi
  npm run dashboard                      meja review di http://localhost:${runtime.port}
  npm run doctor                         periksa kesiapan lingkungan

Opsi umum:
  --provider=manual|openai|placeholder|pocket   pilih adapter (TTS/host)
  --no-render                                    berhenti setelah plan
  FORCE=1                                        timpa file yang sudah ada
`;

/* ---------------------------------------------------------------- */
/* Perintah                                                         */
/* ---------------------------------------------------------------- */

const daftarIde = () => {
  const ide = bacaSemuaIde();
  const belum = ide.filter((i) => !i.status || i.status === "ide");

  console.log(`${ide.length} ide di bank, ${belum.length} siap dikerjakan.\n`);
  for (const i of ide) {
    const status = i.status === "produced" ? "v" : i.status === "scripted" ? "-" : " ";
    console.log(`${status} ${i.id}  ${i.judul.padEnd(34)} ${(i.tag ?? []).join(", ")}`);
  }
  console.log(
    `\nMenambah ide baru: jalankan prompt di prompts/01-daily-ideas.md,\n` +
      `lalu simpan ke content/ideas/<tanggal>.json`,
  );
};

const perintahIdeas = () => {
  const prompT = fs.readFileSync(path.join(paths.root, "prompts", "01-daily-ideas.md"), "utf8");

  if (flags.print === true || flags.raw === true) {
    console.log(prompT);
    return;
  }

  // Ekspor bank ide ke Markdown supaya enak dibaca di dokumen/editor.
  if (typeof flags.md === "string") {
    const file = path.isAbsolute(flags.md) ? flags.md : path.join(paths.root, flags.md);
    const batchFiles = listFiles(paths.ideas, ".json");
    const isi = batchFiles
      .map((f) => ideasToMarkdown(readJson(path.join(paths.ideas, f))))
      .join("\n\n");
    writeText(file, isi);
    console.log(`Bank ide diekspor ke ${path.relative(paths.root, file)}`);
    return;
  }

  daftarIde();
  console.log(`\n${"-".repeat(72)}\n`);
  console.log(prompT.split("---")[1].trim());
};

const perintahVoice = async () => {
  const id = positional[0];
  if (!id) throw new Error("Sebutkan id video: npm run voice -- v001");
  const script = readJson(path.join(paths.scripts, `${id}.json`));
  const provider = flags.provider ?? brand.tts?.provider;
  console.log(`Narasi ${id} lewat provider "${provider}"...`);
  const hasil = await synthesize({id, segments: script.segments, provider});
  for (const f of hasil) {
    console.log(`  s${f.index}: ${path.relative(paths.root, f.file)}${f.duration ? ` (${f.duration}s)` : ""}`);
  }
};

const perintahHost = async () => {
  const id = positional[0];
  if (!id) throw new Error("Sebutkan id video: npm run host -- v001");
  const hasil = await generateHost({id, provider: flags.provider});
  console.log(`Host ${id}: ${path.relative(paths.root, hasil.file)} (provider: ${hasil.provider})`);
};

const perintahPlan = async () => {
  const id = positional[0];
  if (!id) throw new Error("Sebutkan id video: npm run plan -- v001");
  const timeline = await planVideo(id, {
    gapDetik: flags.gap ? Number(flags.gap) : undefined,
    tailDetik: flags.tail ? Number(flags.tail) : undefined,
  });

  console.log(`Timeline ${id}`);
  console.log(`  narasi : ${timeline.durasi.narasiDetik} detik`);
  console.log(`  total  : ${timeline.durasi.totalDetik} detik (${timeline.durasi.totalFrames} frame)`);
  console.log(`  kata   : ${timeline.jumlahKata}`);
  console.log(
    `  segmen : ${timeline.props.segments
      .map((s) => `${s.bagian} ${((s.to - s.from) / timeline.durasi.fps).toFixed(1)}s`)
      .join(" · ")}`,
  );
  console.log(`  subtitle: ${timeline.props.captions.length} potongan`);
  for (const p of timeline.peringatan) console.log(`  Peringatan: ${p}`);
  console.log(`\n  data   : content/timeline/${id}.json`);
};

const perintahRender = async () => {
  const id = positional[0];
  if (!id) throw new Error("Sebutkan id video: npm run render -- v001");
  await renderVideo(id, {forceBundle: flags["force-bundle"] === true});
};

const perintahProduce = async () => {
  const id = positional[0];
  if (!id) throw new Error("Sebutkan id video: npm run produce -- v001");
  await produceVideo(id, {
    tts: typeof flags.tts === "string" ? flags.tts : undefined,
    host: typeof flags.host === "string" ? flags.host : undefined,
    render: flags["no-render"] !== true,
    forceBundle: flags["force-bundle"] === true,
  });
};

const perintahDaily = async () => {
  await jalankanHarian({
    id: positional[0],
    tts: typeof flags.tts === "string" ? flags.tts : undefined,
    host: typeof flags.host === "string" ? flags.host : undefined,
    render: flags["no-render"] !== true,
    pakaiLlm: flags.llm !== "off",
  });
};

const perintahDashboard = () => {
  startDashboard({port: flags.port ? Number(flags.port) : runtime.port});
};

/* ---------------------------------------------------------------- */
/* Dispatch                                                         */
/* ---------------------------------------------------------------- */

const perintahTersedia = {
  ideas: perintahIdeas,
  script: () => tulisScript({id: positional[0] ?? flags.idea}),
  voice: perintahVoice,
  host: perintahHost,
  plan: perintahPlan,
  render: perintahRender,
  produce: perintahProduce,
  daily: perintahDaily,
  weekly: laporanMingguan,
  dashboard: perintahDashboard,
  list: daftarScript,
  doctor,
  help: () => console.log(bantuan),
};

const main = async () => {
  if (!perintah || !perintahTersedia[perintah]) {
    console.log(bantuan);
    if (perintah) process.exitCode = 1;
    return;
  }
  await perintahTersedia[perintah]();
};

main().catch((err) => {
  console.error(`\nGagal: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exitCode = 1;
});
