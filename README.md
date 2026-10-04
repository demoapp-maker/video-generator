# video-generator — Sistem Produksi Video Pendek Rohadi

Satu video berkualitas per hari, tanpa drama, tanpa hype.

Repositori ini adalah **sistem produksi**, bukan kumpulan video lepas.

| Folder | Isi |
| --- | --- |
| `docs/` | Konteks brand, karakter, gaya bahasa, aturan konten, cara tayang |
| `prompts/` | Prompt siap pakai: ide harian, penulis script, host HyperFrame, pemeriksa script, review mingguan |
| `content/ideas/` | Bank ide video (evergreen) |
| `content/scripts/` | Script siap produksi (JSON + Markdown) |
| `content/timeline/` | Hasil ukur durasi, props Remotion, subtitle `.srt` |
| `assets/` | Font, gambar host, audio narasi |
| `src/` | Pipeline: IDE → SCRIPT → VOICE → HOST → PLAN → RENDER → DASHBOARD |
| `remotion/` | Komposisi video 9:16: subtitle, branding, progress bar, end card |
| `out/` | Hasil render (tidak di-commit) |

## Alur sistem

```
IDEA            prompts/01-daily-ideas.md    →  content/ideas/*.json
  ↓
SCRIPT          prompts/02-script-writer.md  →  content/scripts/*.json + *.md
  ↓
VOICE           Pocket TTS / TTS lain        →  assets/audio/<id>/s1..sN.(wav|mp3)
  ↓
HOST            prompts/03-hyperframe-host.md → assets/host/<id>.png|mp4
  ↓
PLAN            ukur durasi, susun timeline, cek 30–45 detik
  ↓
RENDER          Remotion: subtitle + branding + progress bar + end card
  ↓
OUTPUT          out/<id>.mp4 (1080x1920) → Shorts, Reels, TikTok
```

Tahap **SCRIPT** dan **HOST** bisa otomatis (lewat API) atau manual (tempel prompt ke GPT/HyperFrame). Pipeline tidak peduli — yang dibutuhkan hanya berkas yang rapi di tempat yang benar.

## Cara pakai cepat

```bash
npm install
npm run browser:ensure      # Chromium untuk render
npm run doctor              # periksa kesiapan lingkungan

npm run ideas               # bank ide + prompt ide harian
npm run ideas:md            # ekspor bank ide ke Markdown
npm run produce -- v001     # voice + host + plan + render
npm run dashboard           # meja review: http://localhost:3210
npm run daily               # produksi otomatis ide berikutnya
npm run weekly              # laporan ritme produksi
```

Kalau Pocket TTS belum siap, jalankan dulu untuk melatih timing:

```bash
npm run produce -- v001 --tts=placeholder
```

Hasilnya video lengkap dengan audio sintetis dan latar studio placeholder — cukup untuk menilai struktur, subtitle, dan ritme. Ganti audio dan host sungguhan, jalankan ulang perintah yang sama.

## Dokumentasi

- `docs/onboarding.md` — mulai dari nol, hari pertama
- `docs/pipeline.md` — kontrak tiap tahap + cara menangani kegagalan
- `docs/style-guide.md` — aturan kalimat, nada, analogi, visual
- `docs/publishing.md` — judul, deskripsi, cek sebelum unggah
- `docs/system-context.md` — peran, audiens, larangan keras

## Prinsip yang dipegang sistem ini

1. **Sederhana sebelum teknis.** Hook dulu, baru argumen.
2. **Analogi sebelum jargon.** Kalau tidak bisa dianalogikan, belum benar-benar paham.
3. **Praktis sebelum teori.** Setiap video berakhir dengan satu tindakan konkret.
4. **Tanpa hype, tanpa clickbait.** Judul boleh datar, isi harus berguna.
5. **Sistem > kesempurnaan.** Video yang selesai hari ini mengalahkan video sempurna minggu depan.

> Teknologi seharusnya mengurangi ketidakpastian, bukan menambah kompleksitas.
