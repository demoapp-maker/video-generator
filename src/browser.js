/**
 * src/browser.js — jembatan ke Chromium untuk Remotion.
 *
 * Remotion butuh browser untuk merender. Di lingkungan yang tidak bisa
 * mengunduh dari remotion.dev, pipeline memakai Chromium lokal (.browser/)
 * hasil `node scripts/ensure-browser.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const browserDir = path.join(projectRoot, ".browser");
const markerFile = path.join(browserDir, "executable-path.txt");

/**
 * @returns {{browserExecutable: string|null, chromiumOptions: object, env: object}}
 */
export const resolveBrowser = () => {
  if (!fs.existsSync(markerFile)) {
    try {
      execFileSync("node", [path.join(projectRoot, "scripts", "ensure-browser.mjs")], {
        cwd: projectRoot,
        stdio: "inherit",
      });
    } catch {
      console.warn("Peringatan: penyiapan Chromium gagal — Remotion akan mencoba caranya sendiri.");
    }
  }

  const browserExecutable = fs.existsSync(markerFile)
    ? fs.readFileSync(markerFile, "utf8").trim()
    : null;

  // Pustaka pendukung (libnss3, libnspr4, ...) untuk Chromium fallback.
  const libDir = path.join(browserDir, "lib");
  const env = {...process.env};
  if (fs.existsSync(libDir) && fs.readdirSync(libDir).length > 0) {
    env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${libDir}:${env.LD_LIBRARY_PATH}` : libDir;
  }
  for (const [k, v] of Object.entries(env)) process.env[k] = v;

  return {
    browserExecutable,
    env,
    chromiumOptions: {
      // swiftshader: rendering berbasis CPU, aman di server tanpa GPU.
      gl: "swiftshader",
      enableMultiProcessOnLinux: true,
    },
  };
};
