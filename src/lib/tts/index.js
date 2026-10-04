/**
 * Adapter TTS.
 *
 * Kontrak: mengembalikan berkas audio per segmen (s1..sN) di assets/audio/<id>/.
 * Selama kontrak itu dipenuhi, sumber suaranya bebas:
 *   - pocket      → Pocket TTS (kyutai-labs/pocket-tts) lewat perintah CLI
 *   - openai      → OpenAI Audio Speech API
 *   - placeholder → WAV sintetis (hanya untuk mengukur timing subtitle)
 *   - manual      → tidak menghasilkan apa pun; berkas ditaruh sendiri oleh manusia
 */
import fs from "node:fs";
import path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {brand, paths, runtime} from "../../config.js";
import {ensureDir, findFirst, listFiles} from "../fsx.js";
import {ttsSafe} from "../text.js";
import {synthesizePlaceholder} from "./wav.js";

const execFileAsync = promisify(execFile);

export const AUDIO_EXT = [".wav", ".mp3", ".m4a", ".ogg", ".opus", ".flac", ".aac"];

export const audioDirFor = (id) => path.join(paths.audio, id);

/** Berkas audio yang sudah ada untuk sebuah segmen (1-based). */
export const findSegmentAudio = (id, index) =>
  findFirst(
    audioDirFor(id),
    AUDIO_EXT.map((ext) => `s${index}${ext}`),
  );

export const listSegmentAudio = (id) => listFiles(audioDirFor(id));

/* ---------------------------------------------------------------- */
/* Provider: Pocket TTS                                              */
/* ---------------------------------------------------------------- */

const pocket = {
  name: "pocket",
  async synthesize({id, segments}) {
    const cfg = brand.tts?.pocket ?? {};
    const template = cfg.command ?? "python -m pocket_tts.generate --text {text} --output {output}";
    const dir = ensureDir(audioDirFor(id));
    const results = [];

    for (const [i, segment] of segments.entries()) {
      const output = path.join(dir, `s${i + 1}.wav`);
      const command = template
        .replace("{text}", JSON.stringify(ttsSafe(segment.narasi)))
        .replace("{output}", JSON.stringify(output))
        .replace("{voice}", cfg.voice ?? "default");

      try {
        await execFileAsync("bash", ["-lc", command], {cwd: paths.root, timeout: 120000});
        results.push({index: i + 1, file: output, provider: "pocket"});
      } catch (err) {
        throw new Error(
          `Pocket TTS gagal pada segmen ${i + 1}.\n` +
            `Perintah: ${command}\n` +
            `Pesan: ${err.message}\n\n` +
            `Kalau Pocket TTS belum terpasang, pakai: npm run voice -- ${id} --provider=placeholder`,
        );
      }
    }
    return results;
  },
};

/* ---------------------------------------------------------------- */
/* Provider: OpenAI Speech                                          */
/* ---------------------------------------------------------------- */

const openai = {
  name: "openai",
  async synthesize({id, segments}) {
    if (!runtime.openaiKey) {
      throw new Error("OPENAI_API_KEY belum diset. Pakai --provider=placeholder untuk mengukur timing dulu.");
    }
    const dir = ensureDir(audioDirFor(id));
    const model = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
    const voice = process.env.OPENAI_TTS_VOICE ?? "alloy";
    const results = [];

    for (const [i, segment] of segments.entries()) {
      const output = path.join(dir, `s${i + 1}.mp3`);
      const response = await fetch(`${runtime.openaiBaseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${runtime.openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          voice,
          input: ttsSafe(segment.narasi),
          response_format: "mp3",
          instructions: brand.tts?.instruksi ?? undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS gagal (${response.status}): ${await response.text()}`);
      }
      fs.writeFileSync(output, Buffer.from(await response.arrayBuffer()));
      results.push({index: i + 1, file: output, provider: "openai"});
    }
    return results;
  },
};

/* ---------------------------------------------------------------- */
/* Provider: placeholder & manual                                   */
/* ---------------------------------------------------------------- */

const placeholder = {
  name: "placeholder",
  async synthesize({id, segments}) {
    const dir = ensureDir(audioDirFor(id));
    const kataPerDetik = brand.tts?.kataSpeakPerDetik ?? 2.7;
    return segments.map((segment, i) => {
      const output = path.join(dir, `s${i + 1}.wav`);
      const {duration} = synthesizePlaceholder(ttsSafe(segment.narasi), output, {kataPerDetik});
      return {index: i + 1, file: output, provider: "placeholder", duration};
    });
  },
};

const manual = {
  name: "manual",
  async synthesize({id, segments}) {
    const missing = segments.map((_, i) => i + 1).filter((i) => !findSegmentAudio(id, i));
    if (missing.length) {
      throw new Error(
        `Audio belum lengkap untuk ${id}. Segmen yang belum ada: ${missing.join(", ")}.\n` +
          `Taruh berkas di ${audioDirFor(id)} dengan nama s1..s${segments.length} ` +
          `(${AUDIO_EXT.join(", ")}).`,
      );
    }
    return segments.map((_, i) => ({
      index: i + 1,
      file: findSegmentAudio(id, i + 1),
      provider: "manual",
    }));
  },
};

const providers = {pocket, openai, placeholder, manual};

export const getProvider = (name) => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Provider TTS "${name}" tidak dikenal. Pilihan: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
};

/**
 * Memilih provider:
 *   1. yang diminta eksplisit,
 *   2. kalau semua berkas segmen sudah ada → manual (pakai yang ada, jangan timpa),
 *   3. kalau belum ada → provider default di config/brand.json.
 */
const pilihProvider = (id, segments, provider) => {
  if (provider) return provider;
  const lengkap = segments.every((_, i) => Boolean(findSegmentAudio(id, i + 1)));
  if (lengkap) return "manual";
  return brand.tts?.provider ?? "placeholder";
};

export const synthesize = async ({id, segments, provider}) => {
  const chosen = pilihProvider(id, segments, provider);
  return getProvider(chosen).synthesize({id, segments});
};
