import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

// Tiempo en segundos desde el inicio del video.
export const useT = () => useCurrentFrame() / useVideoConfig().fps;

export const ease = Easing.out(Easing.cubic);
export const clamp = (t: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(t, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

// Muestra a sus hijos entre `from` y `to` (s) con un fundido corto.
export const Phase: React.FC<{ from: number; to: number; fade?: number; children: React.ReactNode }> = ({ from, to, fade = 0.3, children }) => {
  const t = useT();
  const o = Math.min(clamp(t, from, from + fade), 1 - clamp(t, to - fade, to));
  if (t < from || t > to) return null;
  return <g style={{ opacity: o }}>{children}</g>;
};
