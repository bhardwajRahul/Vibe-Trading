import {Video} from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type VibePromoProps = {
  title: string;
  subtitle: string;
  label: string;
  highlight: string;
  rawVideoPath?: string;
  format: "landscape" | "portrait" | "square";
};

export const VibePromo = ({
  title,
  subtitle,
  label,
  highlight,
  rawVideoPath = "",
  format,
}: VibePromoProps) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const intro = spring({frame, fps, config: {damping: 18, stiffness: 110}});
  const fade = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: "clamp"});
  const lift = interpolate(intro, [0, 1], [28, 0]);

  const isPortrait = format === "portrait";
  const videoWidth = isPortrait ? width * 0.86 : width * 0.68;
  const videoHeight = isPortrait ? height * 0.45 : height * 0.58;
  const videoTop = isPortrait ? height * 0.33 : height * 0.25;
  const videoSrc = rawVideoPath
    ? rawVideoPath.startsWith("http")
      ? rawVideoPath
      : staticFile(rawVideoPath)
    : "";

  return (
    <AbsoluteFill
      style={{
        background: "#0b0f17",
        color: "#f8fafc",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(20, 184, 166, 0.16), transparent 34%), linear-gradient(315deg, rgba(245, 158, 11, 0.14), transparent 38%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: isPortrait ? 112 : 82,
          left: isPortrait ? 64 : 96,
          right: isPortrait ? 64 : 96,
          opacity: fade,
          transform: `translateY(${lift}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid rgba(148, 163, 184, 0.42)",
            background: "rgba(15, 23, 42, 0.78)",
            color: "#99f6e4",
            fontSize: isPortrait ? 28 : 22,
            fontWeight: 650,
          }}
        >
          <span style={{width: 10, height: 10, borderRadius: 999, background: "#14b8a6"}} />
          {label}
        </div>
        <h1
          style={{
            margin: isPortrait ? "34px 0 16px" : "28px 0 10px",
            fontSize: isPortrait ? 78 : format === "square" ? 62 : 74,
            lineHeight: 1.02,
            fontWeight: 780,
            letterSpacing: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            maxWidth: isPortrait ? 860 : 980,
            fontSize: isPortrait ? 34 : 30,
            lineHeight: 1.28,
            color: "#cbd5e1",
          }}
        >
          {subtitle}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: (width - videoWidth) / 2,
          top: videoTop,
          width: videoWidth,
          height: videoHeight,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          boxShadow: "0 32px 90px rgba(0, 0, 0, 0.48)",
          background: "#111827",
          opacity: interpolate(frame, [12, 34], [0, 1], {extrapolateRight: "clamp"}),
          transform: `scale(${interpolate(frame, [12, 40], [0.985, 1], {extrapolateRight: "clamp"})})`,
        }}
      >
        {videoSrc ? (
          <Video
            src={videoSrc}
            muted
            objectFit="cover"
            style={{width: "100%", height: "100%"}}
          />
        ) : (
          <Placeholder width={videoWidth} height={videoHeight} />
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: isPortrait ? 64 : 96,
          right: isPortrait ? 64 : 96,
          bottom: isPortrait ? 112 : 78,
          display: "flex",
          justifyContent: "space-between",
          alignItems: isPortrait ? "flex-start" : "center",
          flexDirection: isPortrait ? "column" : "row",
          gap: 28,
          opacity: interpolate(frame, [44, 70], [0, 1], {extrapolateRight: "clamp"}),
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderRadius: 14,
            border: "1px solid rgba(45, 212, 191, 0.34)",
            background: "rgba(13, 148, 136, 0.16)",
            fontSize: isPortrait ? 30 : 24,
            color: "#ccfbf1",
            fontWeight: 650,
          }}
        >
          {highlight}
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: isPortrait ? 25 : 21,
            maxWidth: isPortrait ? 820 : 560,
            lineHeight: 1.35,
          }}
        >
          Raw capture first. Captions, zooms, and callouts only explain what the real app already did.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Placeholder = ({width, height}: {width: number; height: number}) => {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 22,
        background:
          "linear-gradient(135deg, rgba(15, 23, 42, 1), rgba(30, 41, 59, 1) 54%, rgba(20, 83, 45, 0.7))",
      }}
    >
      <div style={{fontSize: 34, fontWeight: 760}}>Drop raw capture into props</div>
      <div style={{fontSize: 22, color: "#cbd5e1", maxWidth: width * 0.68, textAlign: "center"}}>
        Render with real product footage from `demo/recordings/` once a scenario capture exists.
      </div>
    </div>
  );
};
