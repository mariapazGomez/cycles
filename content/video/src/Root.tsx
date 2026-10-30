import React from "react";
import { Composition } from "remotion";
import { BuildInPublic } from "./Video";
import { DURATION, FPS } from "./theme";

export const Root: React.FC = () => (
  <Composition id="BuildInPublic" component={BuildInPublic} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(DURATION * FPS)} />
);
