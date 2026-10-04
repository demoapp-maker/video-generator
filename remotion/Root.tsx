import React from "react";
import {CalculateMetadataFunction, Composition} from "remotion";
import {Short} from "./Short";
import {defaultShortProps} from "./default-props";
import {ShortProps} from "./types";

/**
 * Durasi komposisi tidak dipatok di kode — dihitung dari panjang audio narasi.
 * Ini yang membuat pipeline bisa memproduksi video berbeda tiap hari
 * tanpa mengubah komposisi.
 */
const calculateMetadata: CalculateMetadataFunction<ShortProps> = ({props}) => ({
  durationInFrames: Math.max(30, Math.round(props?.totalFrames ?? 1200)),
  fps: props?.fps ?? 30,
  width: props?.width ?? 1080,
  height: props?.height ?? 1920,
  props,
});

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RohadiShort"
      component={Short}
      durationInFrames={1200}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultShortProps}
      calculateMetadata={calculateMetadata}
    />
  );
};
