/**
 * Stage PLAN.
 *
 * Mengubah script + berkas audio menjadi satu timeline deterministik:
 *   content/timeline/<id>.json        → timeline + laporan durasi & peringatan
 *   content/timeline/<id>.props.json  → props untuk komposisi Remotion
 *   content/timeline/<id>.srt / .txt  → subtitle untuk platform
 *
 * Di sinilah durasi 30–45 detik ditegakkan, bukan di tahap render.
 */
import path from "node:path";
import {parseFile} from "music-metadata";
import {brand, captionConfig, paths, videoConfig} from "../config.js";
import {exists, findFirst, readJson, rel, writeJson, writeText} from "../lib/fsx.js";
import {chunkCaption, estimateSpeechSeconds, hasKeyword, splitSentences, wordCount} from "../lib/text.js";
import {audioDirFor, findSegmentAudio} from "../lib/tts/index.js";
import {ensureStudioBackground, hostFileFor} from "../lib/host/index.js";
import {scriptToMarkdown, timelineToSrt, timelineToText} from "../lib/markdown.js";

const EXT_VIDEO = [".mp4", ".webm", ".mov"];

const measureDuration = async (file, fallbackText) => {
  try {
    const {format} = await parseFile(file);
    if (format.duration && Number.isFinite(format.duration)) return format.duration;
  } catch {
    // jatuh ke perkiraan di bawah
  }
  return estimateSpeechSeconds(fallbackText, brand.tts?.kataSpeakPerDetik ?? 2.7);
};

/**
 * @param {string} id
 * @param {{gapDetik?: number, tailDetik?: number, write?: boolean}} [options]
 */
export const planVideo = async (id, options = {}) => {
  const gap = options.gapDetik ?? 0.28;
  const tail = options.tailDetik ?? 1.4;
  const fps = videoConfig.fps;

  const scriptFile = path.join(paths.scripts, `${id}.json`);
  if (!exists(scriptFile)) {
    throw new Error(
      `Script ${id} tidak ditemukan di content/scripts/.\n` +
        `Buat dulu: npm run script -- --idea ${id}\n` +
        `atau tulis manual mengikuti skema di docs/pipeline.md.`,
    );
  }
  const script = readJson(scriptFile);
  const segments = script.segments ?? [];

  if (!segments.length) throw new Error(`Script ${id} tidak punya segmen.`);

  /* ---------------- audio ---------------- */
  const missing = segments.map((_, i) => i + 1).filter((i) => !findSegmentAudio(id, i));
  if (missing.length) {
    throw new Error(
      `Audio segmen ${missing.join(", ")} belum ada di ${audioDirFor(id)}.\n` +
        `Jalankan: npm run voice -- ${id} --provider=placeholder  (timing saja)\n` +
        `atau taruh hasil Pocket TTS dengan nama s1..s${segments.length}.`,
    );
  }

  const durations = [];
  for (const [i, segment] of segments.entries()) {
    const file = findSegmentAudio(id, i + 1);
    durations.push(await measureDuration(file, segment.narasi));
  }

  /* ---------------- timeline segmen ---------------- */
  let cursor = 0;
  const timelineSegments = [];
  const captions = [];

  for (const [i, segment] of segments.entries()) {
    const durasi = durations[i];
    const from = cursor;
    const to = cursor + durasi;
    const audioFile = findSegmentAudio(id, i + 1);

    timelineSegments.push({
      index: i,
      bagian: segment.bagian,
      label: segment.label ?? segment.bagian.toUpperCase(),
      from,
      to,
      audio: rel(paths.assets, audioFile),
      narration: segment.narasi,
    });

    // Subtitle: tiap kalimat dipecah jadi potongan yang muat di layar,
    // lalu durasi segmen dibagi proporsional menurut jumlah karakter.
    const kalimat = splitSentences(segment.narasi);
    const potongan = kalimat.flatMap((s) =>
      chunkCaption(s, captionConfig.maxKarakterPerBaris, captionConfig.maxBaris).map((lines) => ({
        text: lines.join(" "),
        lines,
      })),
    );
    const totalKarakter = potongan.reduce((sum, p) => sum + p.text.length, 0) || 1;
    let potonganCursor = from;

    for (const bagian of potongan) {
      const porsi = (bagian.text.length / totalKarakter) * durasi;
      captions.push({
        from: potonganCursor,
        to: Math.min(to, potonganCursor + porsi),
        text: bagian.text,
        lines: bagian.lines,
        segment: i,
        keyword: hasKeyword(bagian.text, script.keyword ?? []),
      });
      potonganCursor += porsi;
    }

    cursor = to + gap;
  }

  const durasiNarasi = cursor - gap;
  const durasiTotal = durasiNarasi + tail;

  /* ---------------- host ---------------- */
  const hostAsli = hostFileFor(id);
  const hostFile = hostAsli ?? ensureStudioBackground();
  const hostType = EXT_VIDEO.includes(path.extname(hostFile).toLowerCase()) ? "video" : "image";

  /* ---------------- props Remotion ---------------- */
  const props = {
    id,
    judul: script.judul,
    handle: brand.handle,
    tagline: brand.tagline,
    thumbnail: script.thumbnail,
    cta: script.cta,
    keywords: script.keyword ?? [],
    host: {type: hostType, src: rel(paths.assets, hostFile)},
    captions: captions.map((c) => ({
      from: Math.round(c.from * fps),
      to: Math.max(Math.round(c.from * fps) + 8, Math.round(c.to * fps)),
      text: c.text,
      lines: c.lines,
      segment: c.segment,
      keyword: c.keyword,
    })),
    segments: timelineSegments.map((s) => ({
      index: s.index,
      bagian: s.bagian,
      label: s.label,
      from: Math.round(s.from * fps),
      to: Math.round(s.to * fps),
      audio: s.audio,
      narration: s.narration,
    })),
    audio: timelineSegments.map((s, i) => ({
      src: s.audio,
      from: Math.round(s.from * fps),
      durationInFrames: Math.max(1, Math.round(durations[i] * fps)),
    })),
    totalFrames: Math.round(durasiTotal * fps),
    fps,
    width: videoConfig.width,
    height: videoConfig.height,
    brand: brand.brand,
  };

  /* ---------------- validasi ---------------- */
  const peringatan = [];
  if (durasiNarasi > videoConfig.maxDurationDetik) {
    peringatan.push(
      `Durasi narasi ${durasiNarasi.toFixed(1)} detik, melewati batas ${videoConfig.maxDurationDetik} detik. ` +
        `Potong kalimat di bagian insight atau analogi, bukan di action.`,
    );
  }
  if (durasiTotal < videoConfig.minDurationDetik) {
    peringatan.push(
      `Durasi total ${durasiTotal.toFixed(1)} detik, di bawah ${videoConfig.minDurationDetik} detik. ` +
        `Tambahkan satu kalimat pada bagian analogi.`,
    );
  }
  for (const c of captions) {
    if (c.to - c.from < 0.6) {
      peringatan.push(`Subtitle terlalu cepat: "${c.text}" (${(c.to - c.from).toFixed(2)} detik).`);
    }
    if (c.lines.length > captionConfig.maxBaris) {
      peringatan.push(`Subtitle lebih dari ${captionConfig.maxBaris} baris: "${c.text}"`);
    }
  }

  const timeline = {
    id,
    dibuat: new Date().toISOString(),
    script: rel(paths.root, scriptFile),
    durasi: {
      narasiDetik: Number(durasiNarasi.toFixed(2)),
      totalDetik: Number(durasiTotal.toFixed(2)),
      perSegmen: durations.map((d) => Number(d.toFixed(2))),
      fps,
      totalFrames: props.totalFrames,
    },
    jumlahKata: segments.reduce((sum, s) => sum + wordCount(s.narasi), 0),
    peringatan,
    props,
  };

  if (options.write !== false) {
    writeJson(path.join(paths.timeline, `${id}.json`), timeline);
    // Props terpisah supaya Remotion Studio / CLI bisa memakainya langsung:
    //   npx remotion studio remotion/index.ts --props=content/timeline/v001.props.json
    writeJson(path.join(paths.timeline, `${id}.props.json`), props);
    writeText(
      path.join(paths.timeline, `${id}.srt`),
      timelineToSrt(captions.map((c) => ({from: c.from, to: c.to, text: c.text}))),
    );
    writeText(path.join(paths.timeline, `${id}.txt`), timelineToText(captions));
    writeText(path.join(paths.scripts, `${id}.md`), scriptToMarkdown(script));
  }

  return timeline;
};

export const loadTimeline = (id) => {
  const file = findFirst(paths.timeline, [`${id}.json`]);
  if (!file) throw new Error(`Timeline ${id} belum ada. Jalankan dulu: npm run plan -- ${id}`);
  return readJson(file);
};
