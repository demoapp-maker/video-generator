# Prompt 03 — HyperFrame: Host Rohadi

Prompt ini dipakai untuk menghasilkan bagian **VIDEO HOST**: karakter Rohadi di studio podcast. Satu prompt untuk semua video, supaya karakternya konsisten.

## Prompt inti (gambar / image-to-video)

```
Character: Indonesian man, early 30s, semi-anime professional illustration style.
Wavy black hair, thin short beard, calm friendly expression, confident but not flashy.
Wearing a grey hoodie under a cream jacket.

Scene: he sits at a modern podcast studio desk, medium shot, chest-up framing,
facing the camera directly as if explaining to one person.

Props: condenser microphone slightly out of focus, headphones on the desk,
a notebook and pen, a mug. A softly blurred monitor behind him.

Lighting: warm key light on the face, soft fill, subtle rim light,
warm amber practical lights blurred in the background.

Camera: 85mm look, shallow depth of field, eye level, medium shot,
leaving empty space at the bottom third for subtitles.

Mood: calm educational, friendly, natural micro-movement, subtle breathing,
occasional small head tilt. No exaggerated gestures. No shouting.
No dramatic zoom. No text, no watermark, no logo.

Aspect: vertical 9:16, 1080x1920, subject centered slightly above middle.
```

## Varian gerakan (kalau HyperFrame mendukung image-to-video)

Tambahkan salah satu baris berikut di akhir prompt:

- `Motion: gentle natural talking motion, subtle head nods, lips moving as if speaking Indonesian, blink occasionally, continuous loop.`
- `Motion: slow push-in from medium shot to medium close-up, no head movement, background bokeh gently shifting.`

Hasil ideal: **loop 8–20 detik** tanpa potongan kamera. Kalau lebih panjang, Remotion akan memakainya sebagai klip penuh.

## Aturan konsistensi karakter

1. Selalu pakai gambar referensi `assets/host/rohadi-reference.png` sebagai input image-to-video.
2. Jangan menambah atau mengurangi atribut (jaket, hoodie, jenggot) antar video.
3. Background studio tetap sama sepanjang satu musim. Ganti hanya kalau ada alasan jelas.
4. Jangan pakai gaya photorealistic, jangan chibi, jangan bayangan yang berlebihan.

## Variasi pose

Satu karakter, tiga pose. Semuanya dibuat dari gambar referensi yang sama supaya wajah dan pakaiannya tidak berubah.

| Pose | Berkas | Kapan dipakai |
| --- | --- | --- |
| Netral | `assets/host/pose/netral.png` | video bernarasi datar, tanpa ajakan kuat |
| Menjelaskan | `assets/host/pose/menjelaskan.png` | video yang isinya analogi atau penjelasan teknis |
| Mendengarkan | `assets/host/pose/mendengarkan.png` | video bergaya tanya-jawab, topik keputusan |
| Menutup | `assets/host/pose/menutup.png` | video yang berakhir dengan ajakan bertindak |

Cara memakainya:

```bash
npm run host -- v003 --pose=mendengarkan
npm run produce -- v003 --pose=menjelaskan
```

Aturan rotasi supaya tidak monoton:

1. Jangan pakai pose yang sama dua video berturut-turut.
2. Pilih pose berdasarkan isi, bukan urutan. Video yang bertanya banyak memakai pose **mendengarkan**; video yang banyak menjelaskan memakai pose **menjelaskan**.
3. Kalau hanya punya satu pose, pakai konsisten. Karakter yang konsisten lebih baik daripada pose yang berubah-ubah tanpa alasan.

## Checklist sebelum render

- [ ] Wajah menghadap kamera, mata terlihat jelas
- [ ] Ruang kosong di sepertiga bawah untuk subtitle
- [ ] Tidak ada teks atau watermark di gambar
- [ ] Pencahayaan hangat, tidak ada highlight yang meledak di wajah
- [ ] Rasio 9:16

## Catatan teknis

Remotion menempatkan host dengan `object-fit: cover` dan `object-position: 50% 38%`. Artinya, bagian yang tetap terlihat pada layar 9:16 adalah bagian tengah-atas gambar. Kalau host berupa gambar landscape, wajah harus berada di bagian tengah-atas supaya tidak terpotong.
