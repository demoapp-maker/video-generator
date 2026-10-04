/**
 * Uji perilaku pemotongan subtitle.
 * Jalankan: npm test
 *
 * Bagian ini yang paling sering rusak diam-diam: kalimat panjang bikin
 * subtitle meluber, dan kata kunci pendek seperti "AI" salah menangkap "mulai".
 */
import assert from "node:assert/strict";
import {test} from "node:test";
import {chunkCaption, estimateSpeechSeconds, hasKeyword, packLines, splitSentences} from "../src/lib/text.js";

test("splitSentences tidak memotong kalimat di tengah singkatan", () => {
  const kalimat = splitSentences("Saya beli gergaji, bor, dll. lalu simpan di kotak. Besok dipakai lagi.");
  assert.equal(kalimat.length, 2);
  assert.equal(kalimat[0], "Saya beli gergaji, bor, dll. lalu simpan di kotak.");
});

test("splitSentences tidak memotong di angka desimal", () => {
  const kalimat = splitSentences("Angka 3.5 naik bulan ini. Itu saja.");
  assert.equal(kalimat.length, 2);
  assert.equal(kalimat[0], "Angka 3.5 naik bulan ini.");
});

test("packLines tidak melewati batas karakter", () => {
  const lines = packLines("Mengotomatiskan proses yang belum rapi itu seperti memberi remote", 26);
  for (const line of lines) assert.ok(line.length <= 26, `baris terlalu panjang: ${line}`);
});

test("chunkCaption memecah kalimat panjang jadi potongan maksimal 2 baris", () => {
  const potongan = chunkCaption("Masalahnya, belum ada satu masalah nyata yang sedang kamu coba selesaikan.", 26, 2);
  assert.ok(potongan.length >= 2);
  for (const p of potongan) {
    assert.ok(p.length <= 2, "potongan tidak boleh lebih dari 2 baris");
    for (const line of p) assert.ok(line.length <= 26);
  }
});

test("chunkCaption menggabungkan baris sisa yang pendek", () => {
  const potongan = chunkCaption("Pilih satu masalah yang kamu ulang setiap minggu, lalu cari alatnya.", 26, 2);
  assert.ok(potongan.every((p) => p.length <= 2));
  assert.ok(potongan[potongan.length - 1].length <= 2);
});

test("hasKeyword memakai batas kata, bukan potongan huruf", () => {
  assert.equal(hasKeyword("lalu cari satu alat AI", ["AI"]), true);
  assert.equal(hasKeyword("bingung harus mulai dari mana", ["AI"]), false);
  assert.equal(hasKeyword("mulai dari sebaliknya", ["mulai"]), true);
});

test("estimateSpeechSeconds masuk akal untuk bahasa Indonesia", () => {
  const detik = estimateSpeechSeconds("Banyak orang belajar AI setiap hari, tapi tetap bingung harus mulai dari mana.");
  assert.ok(detik > 3 && detik < 7, `perkiraan tidak wajar: ${detik}`);
});
