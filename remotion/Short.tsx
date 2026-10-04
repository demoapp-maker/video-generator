import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {ShortProps, TimelineCaption} from "./types";

/* ------------------------------------------------------------------ */
/* Font                                                               */
/* ------------------------------------------------------------------ */

const FontLoader: React.FC = () => {
  const faces = [
    {weight: 500, file: "fonts/PlusJakartaSans-Medium.ttf"},
    {weight: 700, file: "fonts/PlusJakartaSans-Bold.ttf"},
    {weight: 800, file: "fonts/PlusJakartaSans-ExtraBold.ttf"},
  ];
  const css = faces
    .map(
      (f) =>
        `@font-face{font-family:'Jakarta';font-style:normal;font-weight:${f.weight};src:url('${staticFile(
          f.file,
        )}') format('truetype');font-display:block;}`,
    )
    .join("");
  return <style dangerouslySetInnerHTML={{__html: css}} />;
};

const FONT = "'Jakarta', system-ui, -apple-system, 'Segoe UI', sans-serif";

/* ------------------------------------------------------------------ */
/* Helper                                                             */
/* ------------------------------------------------------------------ */

const clamp = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/* ------------------------------------------------------------------ */
/* Layer 1 — host                                                     */
/* ------------------------------------------------------------------ */

const HostLayer: React.FC<{props: ShortProps}> = ({props}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  // Push-in pelan sepanjang video: memberi kesan kamera hidup tanpa goyang.
  const pushIn = interpolate(frame, [0, durationInFrames], [1.03, 1.11], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Napas: ayunan vertikal halus, siklus sekitar 4 detik.
  const breathe = Math.sin((frame / (fps * 4)) * Math.PI * 2) * 7;

  // Denyut bicara: hanya saat ada subtitle aktif.
  const speaking = props.captions.some((c) => frame >= c.from && frame < c.to);
  const pulse = speaking ? Math.sin((frame / fps) * Math.PI * 5.2) * 0.006 : 0;

  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "50% 38%",
    transform: `translateY(${breathe}px) scale(${pushIn + pulse})`,
  };

  const src = props.host?.src;

  if (src && props.host.type === "video") {
    return (
      <AbsoluteFill>
        <OffthreadVideo src={staticFile(src)} muted style={style} />
      </AbsoluteFill>
    );
  }

  if (src) {
    return (
      <AbsoluteFill>
        <Img src={staticFile(src)} style={style} />
      </AbsoluteFill>
    );
  }

  // Fallback kalau host belum disiapkan: tetap render supaya subtitle bisa direview.
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(120% 90% at 50% 18%, #3A2E22 0%, #191410 55%, #0E0F13 100%)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 700,
          color: "rgba(247,244,238,0.42)",
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 420,
        }}
      >
        host belum tersedia
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Layer 2 — scrim & tekstur                                          */
/* ------------------------------------------------------------------ */

const Scrims: React.FC<{paper: string}> = ({paper}) => (
  <>
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(14,15,19,0.86) 0%, rgba(14,15,19,0.12) 26%, rgba(14,15,19,0) 44%)",
      }}
    />
    <AbsoluteFill
      style={{
        background: "linear-gradient(0deg, rgba(14,15,19,0.94) 0%, rgba(14,15,19,0.62) 18%, rgba(14,15,19,0) 42%)",
      }}
    />
    {/* vignette tipis supaya mata fokus ke tengah */}
    <AbsoluteFill style={{boxShadow: "inset 0 0 240px rgba(0,0,0,0.55)"}} />
    <AbsoluteFill
      style={{opacity: 0.035, background: `radial-gradient(circle at 50% 50%, ${paper} 0%, transparent 70%)`}}
    />
  </>
);

/* ------------------------------------------------------------------ */
/* Layer 3 — branding atas                                            */
/* ------------------------------------------------------------------ */

const TopBrand: React.FC<{props: ShortProps}> = ({props}) => {
  const frame = useCurrentFrame();
  const enter = spring({frame, fps: 30, config: {damping: 200}, durationInFrames: 24});
  const y = interpolate(enter, [0, 1], [-26, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 108,
        left: 88,
        right: 88,
        transform: `translateY(${y}px)`,
        opacity: enter,
        fontFamily: FONT,
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 16}}>
        <div style={{width: 16, height: 16, borderRadius: 8, backgroundColor: props.brand.accent}} />
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: props.brand.paper,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {props.handle}
        </div>
        <div style={{flex: 1, height: 2, backgroundColor: "rgba(247,244,238,0.16)"}} />
      </div>
      <div style={{marginTop: 18, fontSize: 30, fontWeight: 500, color: "rgba(247,244,238,0.66)", letterSpacing: 0.5}}>
        {props.tagline}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Layer 4 — chip bagian (HOOK / INSIGHT / ANALOGI / AKSI)            */
/* ------------------------------------------------------------------ */

const SegmentChip: React.FC<{props: ShortProps}> = ({props}) => {
  const frame = useCurrentFrame();
  const active = props.segments?.find((s) => frame >= s.from && frame < s.to);
  if (!active) return null;

  const local = frame - active.from;
  const len = Math.max(1, active.to - active.from);
  const opacity = Math.min(clamp(local, 0, 12), clamp(len - local, 0, 12));

  return (
    <div
      style={{
        position: "absolute",
        top: 108,
        right: 88,
        opacity: opacity * 0.96,
        fontFamily: FONT,
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: props.brand.accent,
        border: `2px solid ${props.brand.accent}`,
        backgroundColor: "rgba(14,15,19,0.55)",
        padding: "12px 22px",
        borderRadius: 999,
      }}
    >
      {active.label}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Layer 5 — subtitle                                                 */
/* ------------------------------------------------------------------ */

const HighlightedLine: React.FC<{
  text: string;
  keywords: string[];
  accent: string;
  paper: string;
}> = ({text, keywords, accent, paper}) => {
  if (!keywords.length) return <span style={{color: paper}}>{text}</span>;

  // \b di kedua sisi: "AI" tidak boleh menangkap "mulai".
  const pattern = new RegExp(
    `\\b(${keywords
      .filter(Boolean)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})\\b`,
    "gi",
  );
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const isKeyword = keywords.some((k) => k.toLowerCase() === part.toLowerCase());
        return isKeyword ? (
          <span
            key={i}
            style={{
              color: "#12100C",
              backgroundColor: accent,
              borderRadius: 12,
              padding: "2px 14px 6px",
              margin: "0 2px",
              display: "inline-block",
            }}
          >
            {part}
          </span>
        ) : (
          <span key={i} style={{color: paper}}>
            {part}
          </span>
        );
      })}
    </>
  );
};

const Caption: React.FC<{caption: TimelineCaption; props: ShortProps}> = ({caption, props}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: {damping: 16, stiffness: 190, mass: 0.6},
    durationInFrames: 18,
  });
  const y = interpolate(enter, [0, 1], [26, 0]);
  const scale = interpolate(enter, [0, 1], [0.97, 1]);

  return (
    <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", paddingBottom: 420}}>
      {/* Pelat gelap lembut supaya subtitle tetap terbaca di atas bagian
          gambar yang terang (meja kayu, jaket krem). */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(120% 78% at 50% 96%, rgba(14,15,19,0.86) 0%, rgba(14,15,19,0) 72%)",
          opacity: enter,
        }}
      />
      <div
        style={{
          transform: `translateY(${y}px) scale(${scale})`,
          opacity: enter,
          maxWidth: 940,
          textAlign: "center",
          fontFamily: FONT,
          fontSize: 58,
          lineHeight: 1.18,
          fontWeight: 800,
          letterSpacing: -0.5,
          textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          padding: "0 24px",
        }}
      >
        {caption.lines.map((line, i) => (
          <div key={i} style={{marginTop: i === 0 ? 0 : 6}}>
            <HighlightedLine text={line} keywords={props.keywords} accent={props.brand.accent} paper={props.brand.paper} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Subtitles: React.FC<{props: ShortProps}> = ({props}) => (
  <>
    {props.captions.map((caption, i) => (
      <Sequence key={i} from={caption.from} durationInFrames={Math.max(1, caption.to - caption.from)} layout="none">
        <Caption caption={caption} props={props} />
      </Sequence>
    ))}
  </>
);

/* ------------------------------------------------------------------ */
/* Layer 6 — progress bar                                             */
/* ------------------------------------------------------------------ */

const ProgressBar: React.FC<{props: ShortProps}> = ({props}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = clamp(frame, 0, Math.max(1, durationInFrames - 1));

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 12,
        backgroundColor: "rgba(247,244,238,0.14)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          backgroundColor: props.brand.accent,
          borderTopRightRadius: 6,
          borderBottomRightRadius: 6,
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Layer 7 — end card (CTA)                                           */
/* ------------------------------------------------------------------ */

const EndCard: React.FC<{props: ShortProps}> = ({props}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({frame, fps, config: {damping: 18, stiffness: 150}, durationInFrames: 22});
  const y = interpolate(enter, [0, 1], [34, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(14,15,19,${0.72 * enter})`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 96px",
        fontFamily: FONT,
      }}
    >
      <div style={{transform: `translateY(${y}px)`, opacity: enter, textAlign: "center"}}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: props.brand.accent,
            marginBottom: 34,
          }}
        >
          pertanyaan untukmu
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.24,
            color: props.brand.paper,
            textShadow: "0 6px 30px rgba(0,0,0,0.6)",
          }}
        >
          {props.cta}
        </div>
        <div style={{marginTop: 56, fontSize: 32, fontWeight: 500, color: "rgba(247,244,238,0.7)"}}>
          {props.handle} · {props.tagline}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 120,
          width: 220,
          height: 3,
          backgroundColor: "rgba(247,244,238,0.2)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Komposisi utama                                                    */
/* ------------------------------------------------------------------ */

export const Short: React.FC<ShortProps> = (props) => {
  const {durationInFrames} = useVideoConfig();
  const endCardFrames = Math.round((props.fps ?? 30) * 2.2);
  const endCardFrom = Math.max(0, durationInFrames - endCardFrames);

  return (
    <AbsoluteFill style={{backgroundColor: props.brand.ink}}>
      <FontLoader />
      <HostLayer props={props} />
      <Scrims paper={props.brand.paper} />

      {/* Semua lapisan teks berhenti sebelum end card supaya tidak bertumpuk. */}
      {props.host?.src ? (
        <Sequence from={0} durationInFrames={endCardFrom} layout="none">
          <TopBrand props={props} />
          <SegmentChip props={props} />
          <Subtitles props={props} />
        </Sequence>
      ) : null}

      <ProgressBar props={props} />

      {/* narasi: satu berkas audio per segmen, diposisikan absolut */}
      {props.audio?.map((clip, i) => (
        <Sequence
          key={`audio-${i}`}
          from={clip.from}
          durationInFrames={Math.max(1, clip.durationInFrames)}
          layout="none"
        >
          <Audio src={staticFile(clip.src)} />
        </Sequence>
      ))}

      <Sequence from={endCardFrom} durationInFrames={endCardFrames} layout="none">
        <EndCard props={props} />
      </Sequence>
    </AbsoluteFill>
  );
};
