import { useState } from "react";
import type { MuscleGroup } from "@cycles/shared";
import { bodyViews } from "../assets/body/bodyZones";
import frontImg from "../assets/body/front.webp";
import backImg from "../assets/body/back.webp";

// Mapa del cuerpo como filtro de Ejercicios (CYC-231, diseño CYC-230). Mismo
// cuerpo y mismas zonas que la app; aquí marcan lo elegido, no la carga. Es un
// atajo para el puntero: para lector de pantalla y teclado están los botones
// de grupo, así que el mapa va oculto y fuera del orden de tabulación.
const IMAGES = { front: frontImg, back: backImg } as const;
const CAPTION = { front: "Frente", back: "Espalda" } as const;

const NO_PICK = "rgba(223, 228, 236, 0.55)";
const PICKED = "rgba(48, 128, 252, 0.88)";
const HOVER = "#8fb8fb";

export function BodyFilter({
  selected,
  counts,
  disabled,
  onToggle,
}: {
  selected: MuscleGroup[];
  counts: Record<MuscleGroup, number>;
  // Cargando: las figuras se ven, pero las zonas no responden.
  disabled: boolean;
  onToggle: (group: MuscleGroup) => void;
}) {
  const [hover, setHover] = useState<MuscleGroup | null>(null);

  function figure(view: "front" | "back") {
    const { viewBox, zones } = bodyViews[view];
    // Las elegidas se dibujan al final para que su borde quede encima.
    const ordered = [...zones.filter((z) => !selected.includes(z.group)), ...zones.filter((z) => selected.includes(z.group))];
    return (
      <div className="exmap-figure">
        <div className="exmap-canvas">
          <img src={IMAGES[view]} alt="" width={400} height={810} />
          <svg viewBox={viewBox} aria-hidden="true" focusable="false">
            {ordered.map((z, i) => {
              const picked = selected.includes(z.group);
              const empty = disabled || (counts[z.group] === 0 && !picked);
              const fill = picked ? PICKED : hover === z.group && !empty ? HOVER : NO_PICK;
              return (
                <path
                  key={`${z.group}-${i}`}
                  d={z.d}
                  fill={fill}
                  fillOpacity={empty ? 0.25 : 1}
                  stroke={picked ? "#1f2228" : "none"}
                  strokeWidth={picked ? 2.5 : 0}
                  strokeLinejoin="round"
                  className={empty ? "exmap-zone exmap-zone-off" : "exmap-zone"}
                  onClick={empty ? undefined : () => onToggle(z.group)}
                  onMouseEnter={empty ? undefined : () => setHover(z.group)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </svg>
        </div>
        <p className="exmap-caption">{CAPTION[view]}</p>
      </div>
    );
  }

  return (
    <div className="exmap-figures" aria-hidden="true">
      {figure("front")}
      {figure("back")}
    </div>
  );
}
