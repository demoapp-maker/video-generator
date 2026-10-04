/**
 * Stage LIST — daftar semua script beserta perkiraan durasi dan status produksi.
 *
 * Dipakai untuk memeriksa bank script dalam sekali lihat, tanpa menghasilkan
 * audio atau merender apa pun.
 *
 *   npm run list
 */
import path from "node:path";
import {brand, paths, videoConfig} from "../config.js";
import {exists, listFiles, readJson} from "../lib/fsx.js";
import {estimateSpeechSeconds, splitSentences, wordCount} from "../lib/text.js";
import {audioDirFor, listSegmentAudio} from "../lib/tts/index.js";
import {hostFileFor} from "../lib/host/index.js";
import {bacaSemuaIde} from "./write-script.js";

const GAP = 0.28;
const TAIL = 1.4;

export const daftarScript = () => {
  const files = listFiles(paths.scripts, ".json");
  const ide = bacaSemuaIde();
  const kataPerDetik = brand.tts?.kataSpeakPerDetik ?? 2.7;

  const baris = files.map((file) => {
    const script = readJson(path.join(paths.scripts, file));
    const id = script.id ?? file.replace(/\.json$/, "");
    const segmen = script.segments ?? [];

    // Perkiraan durasi: jumlah segmen + jeda antar segmen + ekor end card.
    const perSegmen = segmen.map((s) => estimateSpeechSeconds(s.narasi, kataPerDetik));
    const perkiraanDetik = perSegmen.reduce((a, b) => a + b, 0) + GAP * Math.max(0, segmen.length - 1) + TAIL;

    const jumlahKata = segmen.reduce((sum, s) => sum + wordCount(s.narasi), 0);
    const kalimatPanjang = segmen.flatMap((s) =>
      splitSentences(s.narasi).filter((k) => wordCount(k) > 14),
    ).length;

    const audioSiap = listSegmentAudio(id).length >= segmen.length;
    const timelineSiap = exists(path.join(paths.timeline, `${id}.json`));
    const videoSiap = exists(path.join(paths.out, `${id}.mp4`));
    const tentang = ide.find((i) => i.id === id);

    return {
      id,
      judul: script.judul,
      kata: jumlahKata,
      kalimatPanjang,
      perkiraanDetik: Number(perkiraanDetik.toFixed(1)),
      audio: listSegmentAudio(id).length,
      jumlahSegmen: segmen.length,
      audioSiap,
      host: Boolean(hostFileFor(id)),
      timelineSiap,
      videoSiap,
      tag: tentang?.tag ?? [],
    };
  });

  const lebar = (s, n) => String(s ?? "").padEnd(n).slice(0, n);

  console.log(
    `${lebar("ID", 6)}${lebar("Judul", 34)}${lebar("Kata", 6)}${lebar("Durasi", 8)}${lebar("Audio", 7)}${lebar("Host", 6)}${lebar("Video", 7)}Catatan`,
  );
  console.log("-".repeat(105));

  let catatanJumlah = 0;
  for (const b of baris) {
    const catatan = [];
    if (b.perkiraanDetik < videoConfig.minDurationDetik) catatan.push("terlalu pendek");
    if (b.perkiraanDetik > videoConfig.maxDurationDetik) catatan.push("terlalu panjang");
    if (b.kata > 130) catatan.push("narasi > 130 kata");
    if (b.kalimatPanjang) catatan.push(`${b.kalimatPanjang} kalimat panjang`);
    catatanJumlah += catatan.length;

    const tanda = b.videoSiap ? "v" : b.audioSiap ? "~" : " ";
    console.log(
      `${lebar(`${tanda}${b.id}`, 6)}${lebar(b.judul, 34)}${lebar(b.kata, 6)}${lebar(`${b.perkiraanDetik}s`, 8)}${lebar(
        `${b.audio}/${b.jumlahSegmen}`,
        7,
      )}${lebar(b.host ? "ada" : "-", 6)}${lebar(b.videoSiap ? "siap" : "-", 7)}${catatan.join(", ")}`,
    );
  }

  const siapProduksi = baris.filter((b) => b.audioSiap).length;
  console.log(
    `\n${baris.length} script · ${siapProduksi} siap diproduksi (audio lengkap) · ${catatanJumlah} catatan\n` +
      `Perkiraan durasi memakai ${kataPerDetik} kata/detik. Durasi sebenarnya diukur dari berkas audio saat \`npm run plan\`.`,
  );

  return baris;
};
