import React from "react";
import { useT } from "./anim";
import { display, text } from "./theme";
import { CAPTIONS } from "./captions";

// Subtítulos simples: letras blancas con borde negro, sin animación.
export const Subtitles: React.FC = () => {
  const t = useT();
  const c = CAPTIONS.find((x) => t >= x.start && t < x.end);
  if (!c) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, bottom: 330, textAlign: "center" }}>
      <span
        style={{
          fontFamily: text, fontWeight: 700, fontSize: 68, lineHeight: 1.2, color: "#fff",
          WebkitTextStroke: "10px #000", paintOrder: "stroke fill", textShadow: "0 3px 8px rgba(0,0,0,.35)",
        }}
      >
        {c.text}
      </span>
    </div>
  );
};
void display;
