/**
 * Stage DAILY — produksi satu video, dari ide sampai mp4.
 *
 *   npm run daily            → ambil ide berikutnya yang belum dikerjakan
 *   npm run daily -- v004    → paksa id tertentu
 *
 * Inilah perintah yang dijalankan sekali sehari. Kalau tidak ada ide baru,
 * pipeline memberi tahu untuk menjalankan prompts/01-daily-ideas.md.
 */
import {produceVideo} from "./produce.js";
import {bacaSemuaIde, tulisScript} from "./write-script.js";

const ideBerikutnya = () => {
  const ide = bacaSemuaIde();
  return ide.find((i) => !i.status || i.status === "ide") ?? null;
};

/**
 * @param {{id?: string, tts?: string, host?: string, render?: boolean, pakaiLlm?: boolean}} [options]
 */
export const jalankanHarian = async (options = {}) => {
  let target = options.id;

  if (!target) {
    const berikutnya = ideBerikutnya();
    if (!berikutnya) {
      console.log(
        "Semua ide di bank sudah diproduksi.\n" +
          "Jalankan prompt di prompts/01-daily-ideas.md untuk menambah 10 ide baru,\n" +
          "lalu simpan hasilnya ke content/ideas/<tanggal>.json.",
      );
      return null;
    }
    target = berikutnya.id;
    console.log(`Ide berikutnya: ${target} — ${berikutnya.judul}`);
  }

  await tulisScript({id: target, pakaiLlm: options.pakaiLlm !== false});
  return produceVideo(target, options);
};
