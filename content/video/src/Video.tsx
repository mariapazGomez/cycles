import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { clamp, useT } from "./anim";
import { INK } from "./theme";
import { Animaciones } from "./scenes/Animaciones";
import { Subtitles } from "./Subtitles";

// Tarjeta oscura donde viven las animaciones: arriba, sobre la pared, sin tapar la cara.
const PANEL_WINDOWS: Array<[number, number]> = [[0.2, 32.1], [49.6, 58.14]];

const Panel: React.FC = () => {
  const t = useT();
  const w = PANEL_WINDOWS.find(([a, b]) => t >= a && t <= b);
  if (!w) return null;
  const o = Math.min(clamp(t, w[0], w[0] + 0.35), 1 - clamp(t, w[1] - 0.3, w[1]));
  return (
    <div style={{ position: "absolute", left: 80, top: 70, width: 920, height: 520, borderRadius: 44, background: INK, opacity: o * 0.96, boxShadow: "0 18px 50px rgba(0,0,0,.35)", overflow: "hidden" }}>
      <svg viewBox="0 0 920 520" width={920} height={520} style={{ position: "absolute", inset: 0 }}>
        <Animaciones />
      </svg>
    </div>
  );
};

// Momento 4 (32–42.6 s): la app móvil, grabada de la landing.
const Telefono: React.FC = () => {
  const t = useT();
  const { fps } = useVideoConfig();
  const a = 32.0, b = 42.6;
  if (t < a || t > b) return null;
  const o = Math.min(clamp(t, a, a + 0.4), 1 - clamp(t, b - 0.4, b));
  const x = 640 + 220 * (1 - clamp(t, a, a + 0.5));
  return (
    <div style={{ position: "absolute", left: x, top: 600, width: 380, height: 777, opacity: o, borderRadius: 46, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.45)" }}>
      <Sequence from={Math.round(a * fps)}>
        <OffthreadVideo src={staticFile("telefono.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Sequence>
    </div>
  );
};

export const BuildInPublic: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo src={staticFile("base.mp4")} muted style={{ width: "100%", height: "100%" }} />
    <Audio src={staticFile("audio-mezcla.wav")} />
    <Panel />
    <Telefono />
    <Subtitles />
  </AbsoluteFill>
);
