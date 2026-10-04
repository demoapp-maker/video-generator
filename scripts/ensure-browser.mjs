/**
 * ensure-browser.mjs — memastikan ada Chromium yang bisa dipakai Remotion.
 *
 * Urutan usaha:
 *   1. REMOTION_BROWSER_EXECUTABLE (env)  → pakai itu
 *   2. browser yang sudah dicache di .browser/executable-path.txt
 *   3. `remotion browser ensure` (butuh jaringan ke remotion.dev)
 *   4. fallback offline: ekstrak Chromium dari paket @sparticuz/chromium (npm)
 *
 * Hasil: menulis path executable ke .browser/executable-path.txt
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browserDir = path.join(root, ".browser");
const markerFile = path.join(browserDir, "executable-path.txt");

const untar = (tarBuffer, destDir) => {
  const tarFile = path.join(browserDir, "tmp.tar");
  fs.writeFileSync(tarFile, tarBuffer);
  execFileSync("tar", ["-xf", tarFile, "-C", destDir]);
  fs.unlinkSync(tarFile);
};

const tryRemotionEnsure = () => {
  try {
    execFileSync("npx", ["remotion", "browser", "ensure"], {cwd: root, stdio: "pipe"});
    const out = execFileSync(
      "node",
      [
        "-e",
        `import('@remotion/renderer').then(async (r) => {
           const p = await r.ensureBrowser();
           console.log(p.browserExecutable ?? p.executablePath ?? '');
         })`,
      ],
      {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]},
    );
    const p = out.trim().split("\n").pop().trim();
    return p && fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
};

const extractSparticuz = () => {
  const pkg = path.join(root, "node_modules", "@sparticuz", "chromium");
  if (!fs.existsSync(pkg)) {
    throw new Error(
      "Tidak ada Chromium. Jaringan ke remotion.dev gagal dan @sparticuz/chromium tidak terpasang.\n" +
        "Jalankan: npm install && npx remotion browser ensure",
    );
  }
  fs.mkdirSync(browserDir, {recursive: true});
  const binDir = path.join(browserDir, "bin");
  const libDir = path.join(browserDir, "lib");
  fs.mkdirSync(binDir, {recursive: true});
  fs.mkdirSync(libDir, {recursive: true});

  // Binari asli + wrapper. Wrapper dipakai Remotion supaya LD_LIBRARY_PATH
  // selalu benar, bahkan ketika Remotion dipanggil dari proses lain.
  const real = path.join(binDir, "chromium.real");
  const exec = path.join(binDir, "chromium");
  if (!fs.existsSync(real)) {
    const br = fs.readFileSync(path.join(pkg, "bin", "chromium.br"));
    fs.writeFileSync(real, zlib.brotliDecompressSync(br), {mode: 0o755});
  }
  if (!fs.existsSync(exec)) {
    fs.writeFileSync(
      exec,
      [
        "#!/bin/sh",
        "# Dibuat otomatis oleh scripts/ensure-browser.mjs — jangan diedit manual.",
        'DIR=$(cd "$(dirname "$0")" && pwd)',
        'export LD_LIBRARY_PATH="$DIR/../lib:${LD_LIBRARY_PATH}"',
        'exec "$DIR/chromium.real" "$@"',
        "",
      ].join("\n"),
      {mode: 0o755},
    );
  }

  const libsTar = path.join(pkg, "bin", "al2023.tar.br");
  if (fs.existsSync(libsTar) && fs.readdirSync(libDir).length === 0) {
    // Tar berisi folder "lib/" di dalamnya → ekstrak ke browserDir,
    // hasil akhirnya .browser/lib/*.so
    untar(zlib.brotliDecompressSync(fs.readFileSync(libsTar)), browserDir);
  }

  return exec;
};

const main = () => {
  fs.mkdirSync(browserDir, {recursive: true});

  const fromEnv = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (fromEnv && fs.existsSync(fromEnv)) return finish(fromEnv, "env");

  if (fs.existsSync(markerFile)) {
    const cached = fs.readFileSync(markerFile, "utf8").trim();
    if (cached && fs.existsSync(cached)) return finish(cached, "cache");
  }

  const fromRemotion = tryRemotionEnsure();
  if (fromRemotion) return finish(fromRemotion, "remotion browser ensure");

  const fromPkg = extractSparticuz();
  return finish(fromPkg, "@sparticuz/chromium (offline fallback)");
};

const finish = (execPath, source) => {
  fs.writeFileSync(markerFile, execPath, "utf8");
  console.log(`Chromium siap [${source}]: ${execPath}`);
  const libDir = path.join(browserDir, "lib");
  if (fs.existsSync(libDir) && fs.readdirSync(libDir).length > 0) {
    console.log(`Library tambahan: ${libDir}`);
  }
};

main();
