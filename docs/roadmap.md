# Peta Jalan Sistem

Prinsipnya satu: **jangan mengejar video yang terlihat paling canggih.** Kejar sistem yang bisa menghasilkan satu video berkualitas setiap hari selama satu tahun.

Peta ini disusun supaya setiap tahap bisa berhenti di titik yang sudah berguna. Kalau waktu habis di tengah, sistem tetap jalan.

## Tahap 1 — Pipeline lengkap (selesai)

Semua bagian sudah bisa dijalankan dari satu repositori.

- [x] Bank ide evergreen (10 topik siap pakai + prompt batch berikutnya)
- [x] Penulis script (otomatis lewat LLM atau manual dari template)
- [x] Adapter suara: Pocket TTS, OpenAI Speech, manual, placeholder
- [x] Adapter host: HyperFrame manual, pembuatan gambar lewat API, placeholder
- [x] Ukur durasi + validasi 30–45 detik
- [x] Remotion: subtitle per kalimat, highlight kata kunci, chip bagian, branding, progress bar, end card CTA
- [x] Dashboard review lokal dengan penanda draft/siap unggah
- [x] Laporan mingguan ritme produksi

## Tahap 2 — Suara sungguhan (1–2 hari)

- [ ] Pasang Pocket TTS di mesin yang dipakai produksi
- [ ] Tetapkan satu suara tetap untuk Rohadi, simpan nama voice di `config/brand.json`
- [ ] Rekam satu narasi pembanding dan bandingkan dengan placeholder

Kriteria selesai: `npm run voice -- v001 --provider=pocket` menghasilkan empat berkas narasi yang enak didengar.

## Tahap 3 — Host sungguhan (2–3 hari)

- [ ] Jalankan `prompts/03-hyperframe-host.md` sampai dapat satu loop 8–20 detik
- [ ] Simpan sebagai `assets/host/v001.mp4` (9:16)
- [ ] Uji tiga video berturut-turut: wajah, pakaian, dan studio harus sama
- [ ] Simpan variasi pose (bicara, mendengarkan, tersenyum) untuk video-video berikutnya

Kriteria selesai: tiga video berturut-turut terlihat seperti orang yang sama di ruangan yang sama.

## Tahap 4 — Ritme harian (minggu 1–4)

- [ ] Satu video per hari, lima hari kerja, dua hari untuk istirahat atau batch ide
- [ ] Catat tiga data per video: ditonton habis atau tidak, pertanyaan di komentar, topik yang diminta
- [ ] Jangan mengubah gaya sebelum 20 video terkumpul

Kriteria selesai: 20 video dalam 4 minggu tanpa melewati satu minggu pun.

## Tahap 5 — Perbaikan yang didasarkan data (bulan 2–3)

- [ ] Tentukan tiga bentuk hook yang paling sering ditonton sampai habis
- [ ] Standarkan panjang video pada durasi yang paling sering selesai ditonton
- [ ] Buat batch ide kedua dan ketiga (masing-masing 10 topik)
- [ ] Tambahkan satu format pendamping kalau perlu (misalnya seri 60 detik)

## Yang sengaja belum dikerjakan

Ditunda bukan karena sulit, tapi karena belum ada datanya:

| Ditunda | Alasan |
| --- | --- |
| Unggah otomatis ke Shorts/TikTok/Reels | Menambah titik gagal sebelum gaya dan hook terbukti |
| Musik latar | Dengan narasi edukasi tenang, musik sering mengganggu; tunggu kalau memang diminta penonton |
| Bumper dan animasi logo | Tiga detik pertama terlalu berharga untuk dibuang |
| Lip-sync presisi | Analoji, insight, dan subtitle lebih menentukan retensi daripada gerak bibir |
| A/B judul otomatis | Butuh data tontonan yang belum ada |
| Multi-bahasa | Fokus dulu pada satu audiens sampai ritmenya stabil |

## Rambu-rambu ketika sistem mulai berat

1. Kalau satu video butuh lebih dari 45 menit kerja manual, yang salah bukan semangat — ada tahap yang belum diotomatiskan.
2. Kalau seminggu terlewat, jangan mengejar dengan menambah tiga video sehari. Lanjut saja dari ide berikutnya.
3. Kalau ragu antara menambah video atau memperbaiki satu bagian, perbaiki bagiannya.
4. Setiap ide baru harus lulus satu pertanyaan: apakah ini mengurangi ketidakpastian penonton?
