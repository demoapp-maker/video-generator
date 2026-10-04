/**
 * src/config.js — konfigurasi tunggal untuk seluruh pipeline.
 * Nilai default ada di config/brand.json; bisa ditimpa lewat variabel lingkungan.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const configPath = path.join(root, "config", "brand.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`config/brand.json tidak ditemukan di ${configPath}`);
}

export const brand = JSON.parse(fs.readFileSync(configPath, "utf8"));

export const paths = {
  root,
  content: path.join(root, "content"),
  ideas: path.join(root, "content", "ideas"),
  scripts: path.join(root, "content", "scripts"),
  timeline: path.join(root, "content", "timeline"),
  assets: path.join(root, "assets"),
  audio: path.join(root, "assets", "audio"),
  host: path.join(root, "assets", "host"),
  out: path.join(root, "out"),
  remotionEntry: path.join(root, "remotion", "index.ts"),
};

export const runtime = {
  /** Direktori publik Remotion. Semua staticFile() relatif ke sini. */
  publicDir: paths.assets,
  compositionId: "RohadiShort",
  openaiKey: process.env.OPENAI_API_KEY ?? null,
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  // Remotion memakai port 3000 untuk server aset saat render, jadi meja review
  // ditaruh di port terpisah supaya keduanya bisa jalan bersamaan.
  port: Number(process.env.DASHBOARD_PORT ?? 3210),
};

export const videoConfig = brand.video;
export const captionConfig = brand.caption;
