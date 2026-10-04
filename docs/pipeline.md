# Pipeline Produksi

## Diagram

```
                        ┌─────────────────┐
   prompts/01-ideas ───→│  IDEA BANK      │ content/ideas/*.json
                        └────────┬────────┘
                                 ↓
                        ┌─────────────────┐
   prompts/02-script ──→ │  SCRIPT WRITER  │ content/scripts/<id>.json + .md
                        └────────┬────────┘
                                 ↓
                        ┌─────────────────┐
   Pocket TTS / TTS ───→│  VOICE          │ assets/audio/<id>/s1..sN.(wav|mp3)
                        └────────┬────────┘
                                 ↓
                        ┌─────────────────┐
   HyperFrame prompt ──→│  VIDEO HOST     │ assets/host/<id>.png|mp4
                        └────────┬────────┘
                                 ↓
                        ┌─────────────────┐
                        │  PLAN           │ ukur durasi audio → timeline + props
                        └────────┬────────┘
                                 ↓
                        ┌─────────────────┐
   remotion/ ──────────→│  RENDER         │ out/<id>.mp4 (1080x1920, subtitle+branding)
                        └────────┬────────┘
                                 ↓
                        ┌─────────────────┐
                        │  DASHBOARD      │ out/index.html (review + unduh)
                        └─────────────────┘
```

## Aturan tiap tahap

### 1. IDEA
Bank ide adalah JSON, satu berkas per batch. Tiap ide punya `id`, `judul`, `hook`, `insight`, `analogi`, `action`, `tag`, `evergreen`.
Berita tidak masuk bank ide. Kalau sebuah ide hanya relevan minggu ini, buang.

### 2. SCRIPT
Satu script = satu berkas JSON:

```json
{
  "id": "v001",
  "judul": "...",
  "thumbnail": "...",
  "keyword": ["AI", "Tujuan"],
  "cta": "...",
  "segments": [
    { "bagian": "hook",    "narasi": "...", "label": "HOOK" },
    { "bagian": "insight", "narasi": "..." },
    { "bagian": "analogi", "narasi": "..." },
    { "bagian": "action",  "narasi": "..." }
  ]
}
```

`narasi` dipotong per kalimat oleh pipeline untuk subtitle. Jangan menulis singkatan aneh yang tidak enak dibaca TTS.

### 3. VOICE
Satu berkas audio **per segmen** (4 berkas), bukan satu berkas panjang. Alasannya:

- timing subtitle jadi tepat per segmen,
- tidak perlu menggabungkan audio,
- kalau satu segmen salah, cukup ulangi segmen itu.

Penamaan: `assets/audio/<id>/s1.wav` … `s4.wav` (urutan mengikuti urutan segmen).

| Provider | Cara | Catatan |
| --- | --- | --- |
| `placeholder` (default) | `npm run voice -- <id> --provider=placeholder` | WAV sintetis, hanya untuk mengukur timing |
| `manual` | taruh berkas sendiri | Pocket TTS, notebook lokal, rekaman manusia |
| `pocket` | `npm run voice -- <id> --provider=pocket` | menjalankan Pocket TTS lewat perintah di `config/brand.json` |
| `openai` | `OPENAI_API_KEY=... npm run voice -- <id> --provider=openai` | butuh kunci API |

Pipeline memilih `manual` otomatis kalau semua berkas segmen sudah ada, supaya audio hasil Pocket TTS tidak tertimpa placeholder.

Contoh memanggil Pocket TTS untuk satu segmen:

```bash
python -m pocket_tts.generate \
  --text "$(node -e "console.log(require('./content/scripts/v001.json').segments[0].narasi)")" \
  --output assets/audio/v001/s1.wav
```

### 4. HOST (HyperFrame)
Dua mode didukung:

- **still** → `assets/host/<id>.png` (9:16). Remotion menambahkan gerakan halus: push-in, napas, denyut bicara.
- **video** → `assets/host/<id>.mp4` (9:16, boleh loop pendek). Dipakai langsung sebagai host bergerak.

Prompt host ada di `prompts/03-hyperframe-host.md`. Karakter harus identik di semua video; simpan referensinya di `assets/host/rohadi-reference.png`.

### 5. PLAN
`npm run plan -- <id>` mengukur durasi tiap berkas audio, menyusun timeline, memecah narasi jadi potongan subtitle, dan memvalidasi durasi 30–45 detik.

Keluaran: `content/timeline/<id>.json` (timeline + peringatan), `<id>.props.json` (props Remotion), `<id>.srt`, `<id>.txt`.

### 6. RENDER
`npm run render -- <id>` memanggil Remotion. Elemen yang ditambahkan:

- subtitle per potongan kalimat, maksimal 2 baris, highlight kata kunci,
- chip label bagian (HOOK / INSIGHT / ANALOGI / AKSI),
- branding: handle + tagline di atas, progress bar di bawah,
- end card CTA sekitar 2,2 detik terakhir,
- safe area 9:16 untuk Shorts/Reels/TikTok.

### 7. DASHBOARD
`npm run dashboard` menyajikan `out/` di `http://localhost:3210` untuk review cepat sebelum unggah. Video dari placeholder ditandai **draft**, bukan **siap unggah**.

## Kalau ada yang gagal

| Gejala | Perbaikan |
| --- | --- |
| Durasi > 45 s | potong kalimat di segmen insight, bukan di action |
| Subtitle terlalu panjang | pecah kalimat di script, bukan di render |
| Audio tidak sinkron | cek urutan penamaan `s1..sN` |
| Karakter berubah tiap video | selalu pakai gambar referensi + prompt yang sama |
| Render gagal: browser tidak ditemukan | `npm run browser:ensure` |
| Semua ide habis | jalankan prompt `prompts/01-daily-ideas.md` |
