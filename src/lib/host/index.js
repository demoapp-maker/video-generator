/**
 * Adapter HOST (tahap HyperFrame).
 *
 * Kontrak: menghasilkan salah satu dari:
 *   - assets/host/<id>.png  → host diam; Remotion menambahkan gerakan halus
 *   - assets/host/<id>.mp4  → host bergerak (loop atau klip penuh)
 *
 * Provider:
 *   - manual      → pakai berkas yang sudah kamu buat di HyperFrame (default)
 *   - openai      → pembuatan gambar dengan referensi karakter
 *   - placeholder → latar studio polos, untuk review subtitle tanpa host
 */
import fs from "node:fs";
import path from "node:path";
import {brand, paths, runtime} from "../../config.js";
import {ensureDir, exists, findFirst} from "../fsx.js";
import {generateStudioBackground} from "./image.js";
import {PROMPT_INTI} from "./prompt.js";

export const HOST_EXT = [".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg", ".webp"];

export const hostFileFor = (id) => findFirst(paths.host, HOST_EXT.map((ext) => `${id}${ext}`));

export const studioBackgroundFile = () => path.join(paths.host, "studio-background.png");

export const ensureStudioBackground = () => {
  const file = studioBackgroundFile();
  if (!exists(file)) generateStudioBackground(file);
  return file;
};

const manual = {
  name: "manual",
  async generate({id}) {
    const file = hostFileFor(id);
    if (file) return {file, provider: "manual"};

    const fallback = ensureStudioBackground();
    console.log(
      `Catatan: assets/host/${id}.png belum ada.\n` +
        `Render memakai latar studio placeholder: ${fallback}\n` +
        `Buat host dengan prompt di prompts/03-hyperframe-host.md, lalu simpan sebagai assets/host/${id}.png`,
    );
    return {file: fallback, provider: "placeholder", isPlaceholder: true};
  },
};

const openaiImage = {
  name: "openai",
  async generate({id}) {
    if (!runtime.openaiKey) {
      throw new Error("OPENAI_API_KEY belum diset — tidak bisa membuat gambar host otomatis.");
    }

    const cfg = brand.host?.image ?? {};
    const reference = brand.host?.reference;
    const refPath = reference ? path.join(paths.root, reference) : null;
    const prompt = `${PROMPT_INTI}\n\nKonsisten dengan karakter pada gambar referensi.`;

    const form = new FormData();
    form.append("model", cfg.model ?? "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", cfg.size ?? "1024x1536");
    if (refPath && exists(refPath)) {
      form.append("image[]", new Blob([fs.readFileSync(refPath)], {type: "image/png"}), "reference.png");
    }

    const response = await fetch(`${runtime.openaiBaseUrl}/images/generations`, {
      method: "POST",
      headers: {Authorization: `Bearer ${runtime.openaiKey}`},
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Pembuatan gambar host gagal (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error("Respons gambar tidak berisi b64_json.");

    const dir = ensureDir(paths.host);
    const file = path.join(dir, `${id}.png`);
    fs.writeFileSync(file, Buffer.from(b64, "base64"));
    return {file, provider: "openai"};
  },
};

const placeholder = {
  name: "placeholder",
  async generate() {
    return {file: ensureStudioBackground(), provider: "placeholder", isPlaceholder: true};
  },
};

const providers = {manual, openai: openaiImage, placeholder};

export const getHostProvider = (name) => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Provider host "${name}" tidak dikenal. Pilihan: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
};

export const generateHost = async ({id, provider}) => {
  const chosen = provider ?? brand.host?.provider ?? "manual";
  return getHostProvider(chosen).generate({id});
};
