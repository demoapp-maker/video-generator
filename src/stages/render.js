/**
 * Stage RENDER.
 *
 * Memakai API Remotion (bukan CLI) supaya:
 *   - props timeline bisa disuntik langsung,
 *   - Chromium lokal (.browser/) bisa dipakai di lingkungan tanpa internet,
 *   - progres render bisa dicatat oleh pipeline.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {renderMedia, renderStill, selectComposition} from "@remotion/renderer";
import {paths, runtime} from "../config.js";
import {ensureDir} from "../lib/fsx.js";
import {resolveBrowser} from "../browser.js";
import {loadTimeline} from "./plan.js";

const bundleDir = path.join(paths.root, ".cache", "remotion-bundle");

/**
 * Waktu perubahan terbaru di dalam sebuah folder (rekursif).
 * Remotion menyalin folder aset ke dalam bundel saat bundling, jadi kalau ada
 * berkas aset yang lebih baru daripada bundel, bundel itu sudah basi — audio
 * baru atau gambar host baru akan 404 walaupun berkasnya ada di disk.
 */
const waktuAsetTerbaru = (dir) => {
  if (!fs.existsSync(dir)) return 0;
  let terbaru = 0;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      terbaru = Math.max(terbaru, waktuAsetTerbaru(full));
    } else {
      terbaru = Math.max(terbaru, fs.statSync(full).mtimeMs);
    }
  }
  return terbaru;
};

const getServeUrl = async (force = false) => {
  const indexBundel = path.join(bundleDir, "index.html");
  const adaBundel = fs.existsSync(indexBundel);

  if (!force && adaBundel) {
    const waktuBundel = fs.statSync(indexBundel).mtimeMs;
    if (waktuAsetTerbaru(paths.assets) <= waktuBundel) return bundleDir;
    console.log("Aset lebih baru daripada bundel — menyusun ulang bundel Remotion...");
  } else {
    console.log("Menyusun bundel Remotion...");
  }

  return bundle({
    entryPoint: paths.remotionEntry,
    publicDir: paths.assets,
    outDir: bundleDir,
  });
};

let lastPersen = -1;
const logProgress = ({stitchStage, progress}) => {
  const persen = Math.floor(progress * 100);
  if (stitchStage === "encoding" && persen !== lastPersen) {
    lastPersen = persen;
    if (persen % 10 === 0) process.stdout.write(`\r  encoding ${persen}%   `);
  }
};

/**
 * @param {string} id
 * @param {{forceBundle?: boolean, thumbnail?: boolean, concurrency?: number}} [options]
 */
export const renderVideo = async (id, options = {}) => {
  const timeline = loadTimeline(id);
  const {browserExecutable, chromiumOptions, env} = resolveBrowser();
  Object.assign(process.env, env);

  const serveUrl = await getServeUrl(options.forceBundle);
  ensureDir(paths.out);

  const composition = await selectComposition({
    serveUrl,
    id: runtime.compositionId,
    inputProps: timeline.props,
    browserExecutable,
    chromiumOptions,
  });

  const outputLocation = path.join(paths.out, `${id}.mp4`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: timeline.props,
    browserExecutable,
    chromiumOptions,
    concurrency: options.concurrency ?? Math.max(1, Math.min(4, os.cpus().length - 1)),
    onProgress: logProgress,
  });
  process.stdout.write("\n");

  const hasil = {video: outputLocation, thumbnail: null, frames: composition.durationInFrames};

  if (options.thumbnail !== false) {
    const frame = Math.round(composition.durationInFrames * 0.2);
    const thumbnailFile = path.join(paths.out, `${id}-thumbnail.png`);
    await renderStill({
      composition,
      serveUrl,
      output: thumbnailFile,
      frame,
      inputProps: timeline.props,
      browserExecutable,
      chromiumOptions,
    });
    hasil.thumbnail = thumbnailFile;
  }

  console.log(`Video  : ${path.relative(paths.root, outputLocation)}`);
  if (hasil.thumbnail) console.log(`Thumb  : ${path.relative(paths.root, hasil.thumbnail)}`);
  console.log(`Frame  : ${hasil.frames} (${timeline.durasi.totalDetik} detik @ ${timeline.durasi.fps} fps)`);

  return hasil;
};
