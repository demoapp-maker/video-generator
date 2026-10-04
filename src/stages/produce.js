/**
 * Stage PRODUCE — orkestrasi harian:
 * VOICE → HOST → PLAN → RENDER
 *
 * Tujuannya satu perintah, satu video. Kalau ada tahap yang belum siap,
 * prosesnya berhenti dengan pesan yang menjelaskan langkah berikutnya.
 */
import path from "node:path";
import {paths} from "../config.js";
import {exists, readJson, writeJson} from "../lib/fsx.js";
import {synthesize} from "../lib/tts/index.js";
import {generateHost} from "../lib/host/index.js";
import {planVideo} from "./plan.js";
import {renderVideo} from "./render.js";
import {tandaiStatus} from "./status.js";

/**
 * @param {string} id
 * @param {{tts?: string, host?: string, render?: boolean, forceBundle?: boolean}} [options]
 */
export const produceVideo = async (id, options = {}) => {
  const scriptFile = path.join(paths.scripts, `${id}.json`);
  if (!exists(scriptFile)) {
    throw new Error(`Script ${id} belum ada.\nLangkah berikutnya: npm run script -- --idea ${id}`);
  }

  const script = readJson(scriptFile);
  const hasil = {id, judul: script.judul, tts: null, host: null, timeline: null, render: null};

  /* 1. VOICE */
  console.log(`\n[1/4] VOICE — menyiapkan ${script.segments.length} berkas narasi`);
  const audio = await synthesize({id, segments: script.segments, provider: options.tts});
  hasil.tts = {provider: audio[0]?.provider ?? options.tts, files: audio.length};
  if (hasil.tts.provider === "placeholder") {
    console.log("      Audio placeholder (untuk timing). Ganti dengan Pocket TTS sebelum unggah.");
  }

  /* 2. HOST */
  console.log(`\n[2/4] HOST — menyiapkan visual pembicara`);
  const host = await generateHost({id, provider: options.host});
  hasil.host = {provider: host.provider, file: path.relative(paths.root, host.file)};
  if (host.isPlaceholder) {
    console.log("      Memakai latar studio placeholder. Buat host HyperFrame untuk hasil final.");
  }

  /* 3. PLAN */
  console.log(`\n[3/4] PLAN — mengukur durasi & menyusun subtitle`);
  const timeline = await planVideo(id, {});
  hasil.timeline = timeline.durasi;
  console.log(
    `      Narasi ${timeline.durasi.narasiDetik}s · total ${timeline.durasi.totalDetik}s · ` +
      `${timeline.props.captions.length} subtitle`,
  );
  for (const p of timeline.peringatan) console.log(`      Peringatan: ${p}`);

  /* 4. RENDER */
  if (options.render === false) {
    console.log("\n[4/4] RENDER — dilewati (--no-render)");
  } else {
    console.log(`\n[4/4] RENDER — Remotion`);
    const render = await renderVideo(id, {forceBundle: options.forceBundle});
    hasil.render = {
      video: path.relative(paths.root, render.video),
      thumbnail: render.thumbnail ? path.relative(paths.root, render.thumbnail) : null,
    };
  }

  tandaiStatus(id, "produced");
  writeJson(path.join(paths.out, `${id}.produksi.json`), {...hasil, waktu: new Date().toISOString()});

  console.log("\nSelesai.");
  return hasil;
};
