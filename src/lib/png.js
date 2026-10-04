/**
 * Penulis PNG minimal (RGB 8-bit, tanpa dependensi).
 * Dipakai untuk membuat latar studio placeholder tanpa ffmpeg / ImageMagick.
 */
import fs from "node:fs";
import zlib from "node:zlib";

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
};

/**
 * @param {number} width
 * @param {number} height
 * @param {(x:number, y:number) => [number, number, number]} shader
 */
export const renderPng = (width, height, shader) => {
  const raw = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = shader(x, y);
      const p = rowStart + 1 + x * 3;
      raw[p] = Math.max(0, Math.min(255, Math.round(r)));
      raw[p + 1] = Math.max(0, Math.min(255, Math.round(g)));
      raw[p + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // kedalaman bit
  ihdr[9] = 2; // truecolor

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, {level: 9})),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

export const writePng = (file, width, height, shader) => {
  fs.writeFileSync(file, renderPng(width, height, shader));
  return file;
};
