/** Memeriksa kesiapan lingkungan produksi. Jalankan sebelum hari pertama. */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {brand, paths, runtime} from "../config.js";
import {exists, listFiles} from "../lib/fsx.js";

const tanda = (ok) => (ok ? "OK  " : "    ");
const cek = (label, ok, catatan = "") => {
  console.log(`${tanda(ok)} ${label.padEnd(38)} ${catatan}`);
  return ok;
};

export const doctor = () => {
  console.log(`Memeriksa lingkungan produksi ${brand.handle}\n`);
  const hasil = [];

  const major = Number(process.versions.node.split(".")[0]);
  hasil.push(cek("Node.js >= 20", major >= 20, `v${process.versions.node}`));

  const modul = ["remotion", "@remotion/renderer", "@remotion/cli", "react", "music-metadata"];
  const hilang = modul.filter((m) => !exists(path.join(paths.root, "node_modules", m)));
  hasil.push(cek("Dependensi npm terpasang", hilang.length === 0, hilang.length ? `hilang: ${hilang.join(", ")}` : ""));

  const browserMarker = path.join(paths.root, ".browser", "executable-path.txt");
  const browserEnv = process.env.REMOTION_BROWSER_EXECUTABLE;
  const browserPath = browserEnv ?? (exists(browserMarker) ? fs.readFileSync(browserMarker, "utf8").trim() : null);
  hasil.push(
    cek(
      "Chromium untuk render",
      Boolean(browserPath && exists(browserPath)),
      browserPath ? path.relative(paths.root, browserPath) : "jalankan: npm run browser:ensure",
    ),
  );

  const fontDir = path.join(paths.assets, "fonts");
  const fontCount = listFiles(fontDir, ".ttf").length;
  hasil.push(cek("Font subtitle", fontCount >= 2, `${fontCount} berkas di assets/fonts/`));

  const studio = path.join(paths.host, "studio-background.png");
  hasil.push(cek("Latar studio placeholder", exists(studio), exists(studio) ? "siap" : "dibuat otomatis saat produce"));

  const referensi = brand.host?.reference;
  const refAda = referensi ? exists(path.join(paths.root, referensi)) : false;
  hasil.push(cek("Referensi karakter Rohadi", refAda, refAda ? referensi : "belum ada — lihat prompts/03-hyperframe-host.md"));

  hasil.push(cek("OPENAI_API_KEY (script & TTS)", Boolean(runtime.openaiKey), runtime.openaiKey ? "tersedia" : "opsional"));

  let ffprobe = false;
  try {
    execFileSync("ffprobe", ["-version"], {stdio: "pipe"});
    ffprobe = true;
  } catch {
    /* ffprobe tidak wajib */
  }
  hasil.push(cek("ffprobe (opsional)", ffprobe, ffprobe ? "ada" : "dipakai hanya untuk memeriksa hasil"));

  hasil.push(cek("Script contoh v001", exists(path.join(paths.scripts, "v001.json"))));

  const selesai = hasil.filter(Boolean).length;
  console.log(`\n${selesai}/${hasil.length} pemeriksaan lolos.`);
  if (!browserPath || !exists(browserPath)) console.log("Jalankan: npm run browser:ensure");
  if (fontCount < 2) console.log("Font subtitle belum lengkap — subtitle akan memakai font sistem.");

  return hasil;
};
