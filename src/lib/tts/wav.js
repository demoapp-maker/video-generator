/**
 * Penulis WAV sederhana (PCM 16-bit mono) + synth placeholder.
 *
 * Placeholder ini bukan suara manusia. Fungsinya:
 *   1. mengukur durasi sehingga subtitle bisa diperiksa sebelum TTS asli siap,
 *   2. menjaga pipeline tetap bisa dijalankan tanpa layanan eksternal.
 * Begitu Pocket TTS tersedia, cukup ganti berkas di assets/audio/<id>/.
 */
import fs from "node:fs";
import {estimateSpeechSeconds} from "../text.js";

const SAMPLE_RATE = 22050;

const writeHeader = (buffer, dataLength) => {
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
};

/**
 * Sintesis placeholder: pola mirip suku kata dengan nada dasar manusia (sekitar
 * 140 Hz), beberapa harmonik, dan envelope per suku kata supaya ritmenya
 * terasa seperti kalimat yang dibacakan.
 */
export const synthesizePlaceholder = (text, outputFile, {kataPerDetik = 2.7} = {}) => {
  const duration = Math.max(1.2, estimateSpeechSeconds(text, kataPerDetik));
  const totalSamples = Math.floor(duration * SAMPLE_RATE);
  const dataLength = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  writeHeader(buffer, dataLength);

  const kataCount = Math.max(1, text.trim().split(/\s+/).length);
  const samplesPerKata = totalSamples / kataCount;

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const kataIndex = Math.floor(i / samplesPerKata);

    // Nada dasar bergerak pelan supaya terdengar seperti kalimat, bukan alarm.
    const pitch = 132 + 16 * Math.sin(kataIndex * 0.9) + 6 * Math.sin(t * 1.7);
    const syllableRate = 3.6 + (kataIndex % 3) * 0.4;
    const syllablePhase = (t * syllableRate) % 1;

    // Envelope: naik cepat, tahan, turun — meniru suku kata.
    const env = Math.min(1, syllablePhase / 0.12) * Math.min(1, (1 - syllablePhase) / 0.25) * 0.9;

    phase += (2 * Math.PI * pitch) / SAMPLE_RATE;
    const harmonic =
      Math.sin(phase) * 0.6 +
      Math.sin(phase * 2) * 0.22 +
      Math.sin(phase * 3) * 0.12 +
      Math.sin(phase * 5) * 0.05;

    const value = Math.max(-1, Math.min(1, harmonic * 0.26 * env));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }

  fs.writeFileSync(outputFile, buffer);
  return {file: outputFile, duration: Number(duration.toFixed(3))};
};
