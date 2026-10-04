/**
 * Latar studio placeholder.
 *
 * Bukan pengganti host sungguhan. Dipakai supaya subtitle, timing, dan
 * branding bisa direview sebelum HyperFrame menghasilkan karakter Rohadi.
 */
import path from "node:path";
import {ensureDir} from "../fsx.js";
import {writePng} from "../png.js";

const WIDTH = 1080;
const HEIGHT = 1920;

const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const blobs = [
  // [x, y, radius, intensitas, warna]
  [0.18, 0.16, 420, 0.55, [242, 180, 65]],
  [0.86, 0.3, 300, 0.35, [255, 214, 140]],
  [0.7, 0.82, 520, 0.22, [90, 120, 160]],
  [0.1, 0.7, 360, 0.18, [200, 130, 80]],
];

export const generateStudioBackground = (outputFile) => {
  ensureDir(path.dirname(outputFile));

  return writePng(outputFile, WIDTH, HEIGHT, (x, y) => {
    const nx = x / WIDTH;
    const ny = y / HEIGHT;

    // Dasar: ruangan gelap hangat, lebih terang di belakang subjek.
    const radial = smoothstep(0.95, 0.05, Math.hypot(nx - 0.5, ny - 0.42) * 1.5);
    let r = 22 + 34 * radial;
    let g = 20 + 27 * radial;
    let b = 18 + 22 * radial;

    // Lampu praktis (bokeh) di latar belakang.
    for (const [bx, by, radius, strength, color] of blobs) {
      const d = Math.hypot((nx - bx) * WIDTH, (ny - by) * HEIGHT);
      const falloff = Math.max(0, 1 - d / radius) ** 2.2;
      const amount = falloff * strength;
      r += color[0] * amount * 0.55;
      g += color[1] * amount * 0.55;
      b += color[2] * amount * 0.55;
    }

    // Vignette bawah: memberi ruang bersih untuk subtitle.
    const bottom = smoothstep(0.55, 1, ny);
    r *= 1 - bottom * 0.45;
    g *= 1 - bottom * 0.45;
    b *= 1 - bottom * 0.45;

    // Noise halus supaya tidak terlihat seperti gradien digital sempurna.
    const noise = ((x * 131 + y * 197) % 13) / 13 - 0.5;
    return [r + noise * 4, g + noise * 4, b + noise * 4];
  });
};
