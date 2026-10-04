/**
 * Lint konten: memeriksa semua script di content/scripts terhadap aturan gaya.
 *
 * Uji ini bukan tentang kode, tapi tentang isi. Kalau salah satu script
 * melewati batas, `npm test` gagal sebelum video mahal dirender.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {chunkCaption, splitSentences, wordCount} from "../src/lib/text.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptDir = path.join(root, "content", "scripts");
const brand = JSON.parse(fs.readFileSync(path.join(root, "config", "brand.json"), "utf8"));

const {maxKarakterPerBaris, maxBaris} = brand.caption;

const bacaSemuaScript = () =>
  fs
    .readdirSync(scriptDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(scriptDir, f), "utf8")));

const semuaScript = bacaSemuaScript();

test("ada script untuk dilinting", () => {
  assert.ok(semuaScript.length >= 1, "content/scripts kosong");
});

test("setiap script punya empat bagian wajib", () => {
  for (const script of semuaScript) {
    const bagian = (script.segments ?? []).map((s) => s.bagian);
    for (const wajib of ["hook", "insight", "analogi", "action"]) {
      assert.ok(bagian.includes(wajib), `${script.id} tidak punya segmen ${wajib}`);
    }
  }
});

test("narasi tidak melebihi 130 kata", () => {
  for (const script of semuaScript) {
    const kata = (script.segments ?? []).reduce((sum, s) => sum + wordCount(s.narasi), 0);
    assert.ok(kata <= 130, `${script.id} narasi ${kata} kata`);
  }
});

test("setiap kalimat maksimal 14 kata", () => {
  for (const script of semuaScript) {
    for (const segmen of script.segments ?? []) {
      for (const kalimat of splitSentences(segmen.narasi)) {
        assert.ok(
          wordCount(kalimat) <= 14,
          `${script.id} (${segmen.bagian}) kalimat ${wordCount(kalimat)} kata: "${kalimat}"`,
        );
      }
    }
  }
});

test("setiap kalimat script bisa dipecah jadi caption maksimal 2 baris", () => {
  for (const script of semuaScript) {
    for (const segmen of script.segments ?? []) {
      for (const kalimat of splitSentences(segmen.narasi)) {
        const potongan = chunkCaption(kalimat, maxKarakterPerBaris, maxBaris);
        for (const p of potongan) {
          assert.ok(p.length <= maxBaris, `${script.id}: potongan ${p.length} baris — "${p.join(" / ")}"`);
          for (const line of p) {
            assert.ok(line.length <= maxKarakterPerBaris, `${script.id}: baris ${line.length} karakter — "${line}"`);
          }
        }
      }
    }
  }
});

test("kata kunci maksimal tiga dan tidak kosong", () => {
  for (const script of semuaScript) {
    const keyword = script.keyword ?? [];
    assert.ok(keyword.length >= 1 && keyword.length <= 3, `${script.id}: ${keyword.length} kata kunci`);
  }
});

test("judul dan thumbnail mengikuti batas kata", () => {
  for (const script of semuaScript) {
    assert.ok(wordCount(script.judul) <= 6, `${script.id}: judul ${wordCount(script.judul)} kata`);
    assert.ok(wordCount(script.thumbnail) <= 5, `${script.id}: thumbnail ${wordCount(script.thumbnail)} kata`);
    assert.ok(wordCount(script.cta) <= 14, `${script.id}: cta ${wordCount(script.cta)} kata`);
  }
});
