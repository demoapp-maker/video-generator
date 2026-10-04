/**
 * Konfigurasi Remotion untuk CLI & Studio.
 * Pipeline lewat API (src/stages/render.js) menyetel hal yang sama secara eksplisit.
 */
import fs from "node:fs";
import path from "node:path";
import {Config} from "@remotion/cli/config";

// staticFile() harus menunjuk ke assets/, bukan folder public/ bawaan.
Config.setPublicDir("assets");

// Kalau Chromium lokal sudah disiapkan (scripts/ensure-browser.mjs), pakai itu.
// Berguna di server tanpa akses ke remotion.dev.
const marker = path.join(process.cwd(), ".browser", "executable-path.txt");
if (fs.existsSync(marker)) {
  Config.setBrowserExecutable(fs.readFileSync(marker, "utf8").trim());
}

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Server biasanya tanpa GPU → rendering berbasis CPU.
Config.setChromiumOpenGlRenderer("swiftshader");

// Concurrency sengaja tidak dipatok: Remotion menghitung sendiri dari jumlah core.
