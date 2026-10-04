/**
 * Stage WEEKLY — laporan ritme produksi.
 * Pertanyaan yang dijawab: apakah sistem ini benar-benar jalan satu video sehari?
 */
import fs from "node:fs";
import path from "node:path";
import {paths} from "../config.js";
import {exists, listFiles, readJson} from "../lib/fsx.js";
import {bacaSemuaIde} from "./write-script.js";

const statFile = (file) => {
  try {
    return fs.statSync(file);
  } catch {
    return null;
  }
};

export const laporanMingguan = () => {
  const ide = bacaSemuaIde();
  const videos = listFiles(paths.out, ".mp4");

  const detail = videos.map((file) => {
    const id = file.replace(/\.mp4$/, "");
    const stat = statFile(path.join(paths.out, file));
    const timelineFile = path.join(paths.timeline, `${id}.json`);
    const timeline = exists(timelineFile) ? readJson(timelineFile) : null;
    const tentang = ide.find((i) => i.id === id);
    return {
      id,
      judul: tentang?.judul ?? id,
      tag: tentang?.tag ?? [],
      dibuat: stat ? stat.mtime.toISOString() : null,
      ukuranMB: stat ? Number((stat.size / 1024 / 1024).toFixed(2)) : null,
      durasiDetik: timeline?.durasi?.totalDetik ?? null,
      jumlahKata: timeline?.jumlahKata ?? null,
    };
  });

  const perTag = {};
  for (const v of detail) {
    for (const t of v.tag) perTag[t] = (perTag[t] ?? 0) + 1;
  }

  const jumlahBelum = ide.filter((i) => !i.status || i.status === "ide").length;
  const rataDurasi = detail.length
    ? Number((detail.reduce((s, v) => s + (v.durasiDetik ?? 0), 0) / detail.length).toFixed(1))
    : 0;

  const laporan = {
    dibuat: new Date().toISOString(),
    ringkasan: {
      totalVideo: detail.length,
      sisaIdeSiapPakai: jumlahBelum,
      rataDurasiDetik: rataDurasi,
      tagTerbanyak: Object.entries(perTag)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, jumlah]) => ({tag, jumlah})),
    },
    detail,
  };

  console.log(`Total video    : ${laporan.ringkasan.totalVideo}`);
  console.log(
    `Ide tersisa    : ${laporan.ringkasan.sisaIdeSiapPakai} (cukup untuk ${laporan.ringkasan.sisaIdeSiapPakai} hari)`,
  );
  console.log(`Rata durasi    : ${laporan.ringkasan.rataDurasiDetik} detik`);
  console.log("Topik          :");
  for (const t of laporan.ringkasan.tagTerbanyak) console.log(`  - ${t.tag}: ${t.jumlah}`);

  if (detail.length) {
    console.log("\nRiwayat:");
    for (const v of detail) {
      console.log(`  ${v.id}  ${String(v.durasiDetik ?? "?").padStart(5)}s  ${v.ukuranMB ?? "?"}MB  ${v.judul}`);
    }
  }

  if (laporan.ringkasan.sisaIdeSiapPakai < 7) {
    console.log(
      `\nCatatan: sisa ide kurang dari 7. Jalankan prompt di prompts/01-daily-ideas.md ` +
        `sebelum kehabisan, supaya tidak ada hari kosong.`,
    );
  }

  return laporan;
};
