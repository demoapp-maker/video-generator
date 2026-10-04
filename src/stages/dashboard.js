/**
 * Stage DASHBOARD — meja review harian.
 * Menyajikan out/ dan status tiap video di http://<host>:<port>
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {brand, paths, runtime} from "../config.js";
import {exists, listFiles, readJson} from "../lib/fsx.js";
import {bacaSemuaIde} from "./write-script.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".srt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".ttf": "font/ttf",
};

const statusUntuk = (id) => {
  const script = exists(path.join(paths.scripts, `${id}.json`));
  const timeline = exists(path.join(paths.timeline, `${id}.json`));
  const video = exists(path.join(paths.out, `${id}.mp4`));
  const audioDir = path.join(paths.audio, id);
  const audio = exists(audioDir) ? listFiles(audioDir).length : 0;
  return {script, timeline, video, audio};
};

const halaman = () => {
  const ide = bacaSemuaIde();
  const videos = listFiles(paths.out, ".mp4");

  const kartuVideo = videos
    .map((file) => {
      const id = file.replace(/\.mp4$/, "");
      const scriptFile = path.join(paths.scripts, `${id}.json`);
      const script = exists(scriptFile) ? readJson(scriptFile) : null;
      const produksi = exists(path.join(paths.out, `${id}.produksi.json`))
        ? readJson(path.join(paths.out, `${id}.produksi.json`))
        : null;
      const siapUnggah = produksi?.tts?.provider !== "placeholder" && produksi?.host?.provider !== "placeholder";
      return `
      <article class="kartu">
        <video src="/out/${file}" controls preload="metadata"></video>
        <div class="isi">
          <div class="baris"><h3>${script?.judul ?? id}</h3><span class="badge ${siapUnggah ? "ok" : "draft"}">${siapUnggah ? "siap unggah" : "draft"}</span></div>
          <p class="meta">${id} · ${siapUnggah ? `${produksi.tts?.provider} + ${produksi.host?.provider}` : "audio/host placeholder"} · ${script ? `${script.segments.length} segmen` : "script tidak ditemukan"}</p>
          ${script?.cta ? `<p class="cta">${script.cta}</p>` : ""}
          <p class="tautan">
            <a href="/out/${file}" download>unduh mp4</a>
            <a href="/out/${id}-thumbnail.png" target="_blank">thumbnail</a>
            <a href="/scripts/${id}.md" target="_blank">script</a>
            ${exists(path.join(paths.timeline, `${id}.srt`)) ? `<a href="/timeline/${id}.srt" target="_blank">srt</a>` : ""}
          </p>
        </div>
      </article>`;
    })
    .join("\n");

  const barisIde = ide
    .map((i) => {
      const s = statusUntuk(i.id);
      const langkah = [
        s.script ? "script" : null,
        s.audio ? `${s.audio} audio` : null,
        s.timeline ? "timeline" : null,
        s.video ? "video" : null,
      ].filter(Boolean);
      return `
      <tr>
        <td class="mono">${i.id}</td>
        <td>${i.judul}</td>
        <td class="tag">${(i.tag ?? []).join(", ")}</td>
        <td>${i.status ?? "—"}</td>
        <td class="langkah">${langkah.length ? langkah.join(" → ") : "belum dikerjakan"}</td>
      </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Meja Produksi ${brand.handle}</title>
<style>
  :root {
    --ink: ${brand.brand.ink};
    --paper: ${brand.brand.paper};
    --accent: ${brand.brand.accent};
    --muted: rgba(247,244,238,0.6);
    --line: rgba(247,244,238,0.12);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ink); color: var(--paper);
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    padding: 48px 32px 96px;
  }
  header { max-width: 1180px; margin: 0 auto 40px; }
  h1 { font-size: 34px; margin: 0 0 8px; letter-spacing: -0.5px; }
  h1 span { color: var(--accent); }
  p.sub { color: var(--muted); margin: 0; font-size: 16px; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); margin: 56px 0 18px; max-width: 1180px; margin-left: auto; margin-right: auto; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; max-width: 1180px; margin: 0 auto; }
  .kartu { background: rgba(247,244,238,0.04); border: 1px solid var(--line); border-radius: 18px; overflow: hidden; }
  .kartu video { width: 100%; display: block; background: #000; aspect-ratio: 9 / 16; object-fit: cover; }
  .isi { padding: 18px 20px 22px; }
  .baris { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h3 { margin: 0 0 6px; font-size: 19px; }
  .badge { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .badge.ok { background: var(--accent); color: #12100c; }
  .badge.draft { border: 1px solid var(--line); color: var(--muted); }
  .meta { margin: 0 0 10px; color: var(--muted); font-size: 13px; }
  .cta { margin: 0 0 14px; font-size: 14px; color: rgba(247,244,238,0.8); font-style: italic; }
  .tautan a { color: var(--accent); font-size: 13px; margin-right: 14px; text-decoration: none; border-bottom: 1px solid transparent; }
  .tautan a:hover { border-bottom-color: var(--accent); }
  table { width: 100%; max-width: 1180px; margin: 0 auto; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .mono { font-family: ui-monospace, monospace; color: var(--accent); }
  .tag { color: var(--muted); font-size: 12px; }
  .langkah { color: rgba(247,244,238,0.75); font-size: 12px; }
  .kosong { color: var(--muted); max-width: 1180px; margin: 0 auto; padding: 40px 0; }
  code { background: rgba(247,244,238,0.08); padding: 2px 6px; border-radius: 6px; font-size: 13px; }
</style>
</head>
<body>
  <header>
    <h1>Meja Produksi <span>${brand.handle}</span></h1>
    <p class="sub">${brand.tagline} · satu video sehari, tanpa hype. ${videos.length} video dirender.</p>
  </header>

  <h2>Hasil render</h2>
  ${videos.length ? `<div class="grid">${kartuVideo}</div>` : `<p class="kosong">Belum ada video. Jalankan <code>npm run produce -- v001</code>.</p>`}

  <h2>Status bank ide</h2>
  <table>
    <thead><tr><th>ID</th><th>Judul</th><th>Tag</th><th>Status</th><th>Progres</th></tr></thead>
    <tbody>${barisIde}</tbody>
  </table>
</body>
</html>`;
};

export const startDashboard = ({port = runtime.port, host = "0.0.0.0"} = {}) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") {
      res.writeHead(200, {"Content-Type": MIME[".html"]});
      res.end(halaman());
      return;
    }

    const roots = {
      "/out/": paths.out,
      "/scripts/": paths.scripts,
      "/timeline/": paths.timeline,
      "/assets/": paths.assets,
    };
    const match = Object.keys(roots).find((prefix) => pathname.startsWith(prefix));

    if (!match) {
      res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
      res.end("Tidak ditemukan.");
      return;
    }

    const file = path.join(roots[match], pathname.slice(match.length));

    // Cegah keluar dari folder yang diizinkan.
    if (!file.startsWith(roots[match]) || !exists(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
      res.end("Tidak ditemukan.");
      return;
    }

    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(file).pipe(res);
  });

  server.listen(port, host, () => {
    console.log(`Meja produksi siap di http://localhost:${port}`);
    console.log(`Folder hasil: ${path.relative(paths.root, paths.out)}/`);
  });

  return server;
};
