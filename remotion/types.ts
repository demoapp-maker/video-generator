/**
 * Bentuk props yang diterima komposisi Remotion.
 * Dihasilkan oleh `npm run plan -- <id>` (src/stages/plan.js).
 */

export type TimelineSegment = {
  index: number;
  bagian: string;
  label: string;
  from: number;
  to: number;
  audio: string | null;
  narration: string;
};

export type TimelineCaption = {
  from: number;
  to: number;
  text: string;
  lines: string[];
  segment: number;
  keyword: boolean;
};

export type ShortProps = {
  id: string;
  judul: string;
  handle: string;
  tagline: string;
  thumbnail: string;
  cta: string;
  keywords: string[];
  host: {
    type: "image" | "video";
    src: string | null;
  };
  captions: TimelineCaption[];
  segments: TimelineSegment[];
  audio: {src: string; from: number; durationInFrames: number}[];
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  brand: {
    accent: string;
    accentSoft: string;
    ink: string;
    paper: string;
  };
};
