# Mulai dari Nol (Hari Pertama)

Waktu yang dibutuhkan: sekitar 20 menit sampai video pertama jalan.

## 1. Perangkat

```bash
npm install
npm run browser:ensure     # unduh Chromium untuk render
npm run doctor             # periksa semua kebutuhan
```

Kalau `browser:ensure` gagal karena jaringan, fallback offline tetap tersedia:

```bash
npm install                # @sparticuz/chromium ikut terpasang
npm run browser:ensure     # memakai Chromium lokal sebagai cadangan
```

## 2. Lihat sistemnya hidup tanpa API key

```bash
npm run produce -- v001 --tts=placeholder
```

Yang terjadi: pipeline membuat audio sintetis (hanya untuk mengukur timing), memakai latar studio placeholder, menyusun subtitle, lalu merender `out/v001.mp4`. Hasilnya belum layak unggah, tapi **struktur videonya sudah bisa dinilai**.

## 3. Ubah menjadi layak unggah

Dua langkah, dua alat:

1. **Suara** — hasilkan narasi dengan Pocket TTS (atau TTS lain), simpan sebagai
   `assets/audio/v001/s1.wav` … `s4.wav`.
2. **Host** — jalankan prompt di `prompts/03-hyperframe-host.md`, simpan hasilnya sebagai
   `assets/host/v001.png` (atau `.mp4` kalau berupa video).

Lalu:

```bash
npm run produce -- v001 --tts=manual --host=manual
```

## 4. Kebiasaan harian

| Waktu | Tindakan | Perintah |
| --- | --- | --- |
| Pagi | Lihat ide berikutnya | `npm run ideas` |
| Pagi | Produksi satu video | `npm run daily` |
| Siang | Review & unggah | `npm run dashboard` |
| Jumat | Lihat ritme seminggu | `npm run weekly` |
| Minggu | Tambah 10 ide baru | prompt `01-daily-ideas.md` |

## 5. Kalau macet

| Gejala | Tindakan |
| --- | --- |
| Tidak ada ide baru | Jalankan prompt `01-daily-ideas.md`, tambah 10 ide sekaligus |
| Script terasa kaku | Tulis ulang kalimat pertama; hook yang lemah membuat sisanya terasa berat |
| TTS belum siap | Sementara pakai `--tts=placeholder` untuk melatih ritme, jangan untuk diunggah |
| Render lambat | Render 1080x1920 30fps sekitar 1–4 menit di laptop biasa |
| Host berubah-ubah | Selalu pakai gambar referensi yang sama + prompt yang sama |

## Aturan satu-satunya

Jangan mengejar video yang terlihat paling canggih. Kejar sistem yang bisa menghasilkan satu video berkualitas setiap hari selama satu tahun.
