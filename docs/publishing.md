# Publikasi Harian

Satu video selesai belum sama dengan satu video tayang. Bagian ini menjaga bagian "tayang" tetap sependek mungkin.

## Urutan unggah

1. Buka `npm run dashboard` → tonton penuh sekali tanpa suara (cek subtitle) dan sekali dengan suara (cek timing).
2. Kalau lolos, unggah `out/<id>.mp4` ke YouTube Shorts, lalu TikTok, lalu Instagram Reels.
3. Pakai judul, deskripsi, dan tagar di bawah ini. Jangan memutuskan ulang setiap hari.

## Judul

Gunakan `judul` dari script (maksimal 6 kata). Jangan tambahkan klik-umpan; kalau judul perlu diubah supaya menarik, berarti scriptnya belum tajam.

Contoh: `Belajar AI Tanpa Tujuan`

## Deskripsi (template)

```
<ringkasan satu kalimat dari insight>

Pertanyaan untukmu: <cta>

Catatan harian belajar teknologi. Sederhana dulu, teknis kemudian.
#BelajarAI #DataAnalytics #Teknologi
```

## Tagar tetap

`#BelajarAI #DataAnalytics #Teknologi #SistemBerpikir #KeputusanTeknis #BelajarSambilKerja`

Pakai 3–5 saja. Tagar bukan pengganti kejelasan hook.

## Cek sebelum unggah

- [ ] Durasi 30–45 detik (lihat `out/<id>.produksi.json`)
- [ ] Subtitle sinkron, maksimal 2 baris, tidak terpotong UI platform
- [ ] Kata kunci ter-highlight
- [ ] Audio bukan placeholder (`provider` pada `out/<id>.produksi.json` bukan `placeholder`)
- [ ] Host bukan latar studio placeholder
- [ ] CTA muncul minimal 2 detik dan bisa dibaca
- [ ] Tidak ada klaim angka tanpa sumber
- [ ] Thumbnail text maksimal 5 kata

## Kenapa urutannya Shorts → TikTok → Reels

Shorts paling pemaaf untuk video edukasi vertikal. TikTok paling cepat mengembalikan umpan balik. Reels punya area aman paling ketat, jadi paling enak dikerjakan terakhir setelah caption terbukti.

Urutan sebaliknya juga tidak masalah — yang penting **urutannya tetap** supaya jadi kebiasaan, bukan keputusan baru tiap hari.

## Setelah tayang (10 menit kerja)

Buka `npm run weekly`. Catat tiga hal saja per video: ditonton sampai habis atau tidak, komentar yang berupa pertanyaan, dan topik yang paling banyak diminta. Tiga data ini cukup untuk menentukan batch ide berikutnya. Jangan membuka analitik lebih dari sekali sehari.
