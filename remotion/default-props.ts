import {ShortProps} from "./types";

/**
 * Placeholder supaya Remotion Studio tetap bisa dibuka tanpa props dari pipeline.
 * Nilai sebenarnya selalu datang dari content/timeline/<id>.props.json.
 */
export const defaultShortProps: ShortProps = {
  id: "preview",
  judul: "Belajar AI Tanpa Tujuan",
  handle: "@rohadi",
  tagline: "Catatan belajar teknologi",
  thumbnail: "Belajar AI Tanpa Tujuan",
  cta: "Minggu ini, masalah apa yang paling sering kamu ulang?",
  keywords: ["AI", "tujuan", "alat"],
  host: {type: "image", src: null},
  captions: [
    {from: 15, to: 130, text: "Ini contoh subtitle.", lines: ["Ini contoh subtitle."], segment: 0, keyword: false},
  ],
  segments: [],
  audio: [],
  totalFrames: 300,
  fps: 30,
  width: 1080,
  height: 1920,
  brand: {
    accent: "#F2B441",
    accentSoft: "rgba(242,180,65,0.16)",
    ink: "#0E0F13",
    paper: "#F7F4EE",
  },
};
