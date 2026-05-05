import {Composition, Folder} from "remotion";
import {VibePromo, type VibePromoProps} from "./VibePromo";

const baseProps = {
  title: "Vibe-Trading",
  subtitle: "Natural language to real quant research evidence",
  label: "Real product footage",
  rawVideoPath: "",
  highlight: "Agentic research + deterministic validation",
} satisfies Omit<VibePromoProps, "format">;

export const RemotionRoot = () => {
  return (
    <Folder name="VibeTradingPromo">
      <Composition
        id="VibePromoLandscape"
        component={VibePromo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{...baseProps, format: "landscape"} satisfies VibePromoProps}
      />
      <Composition
        id="VibePromoPortrait"
        component={VibePromo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{...baseProps, format: "portrait"} satisfies VibePromoProps}
      />
      <Composition
        id="VibePromoSquare"
        component={VibePromo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{...baseProps, format: "square"} satisfies VibePromoProps}
      />
    </Folder>
  );
};
