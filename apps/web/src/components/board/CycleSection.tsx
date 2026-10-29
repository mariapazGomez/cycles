import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { TrainingCycle } from "@cycles/shared";
import * as trackingApi from "../../services/trackingApi";
import { CYCLE_STATUS_LABEL, CYCLE_TYPE_LABEL } from "../../lib/library";
import type { SectionKind } from "../../lib/cycleSections";
import { shortDate } from "../../lib/weekCalendar";
import { CycleEditForm } from "../CycleEditForm";
import { CycleBoard } from "./CycleBoard";
import { Popover } from "./Popover";
import { ChevronIcon } from "./icons";

interface CycleSectionProps {
  cycle: TrainingCycle;
  athlete: { id: string; name: string };
  kind: SectionKind;
  open: boolean;
  onToggle: () => void;
}

// Una sección plegable por ciclo de la ficha del atleta. El ciclo en curso va
// abierto; los que vienen y los pasados, minimizados. La pizarra se monta al
// abrir por primera vez, así un ciclo minimizado no pide sus sesiones.
export function CycleSection({ cycle, athlete, kind, open, onToggle }: CycleSectionProps) {
  const bodyId = useId();
  const [dataAnchor, setDataAnchor] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const isMacro = cycle.cycleType === "macrocycle";
  // Un macrociclo no tiene sesiones propias. El resumen reutiliza la misma
  // consulta que la pizarra, así que no se repite al abrir.
  const progressQuery = useQuery({
    queryKey: ["cycles", cycle.id, "progress"],
    queryFn: () => trackingApi.getCycleProgress(cycle.id),
    enabled: !isMacro,
  });
  const sessions = progressQuery.data?.sessions ?? [];
  const done = sessions.filter((s) => s.status === "completed").length;
  const start = cycle.startDate.slice(0, 10);
  const end = cycle.endDate.slice(0, 10);

  return (
    <section className={`cs${open ? " cs-open" : ""}${kind === "current" ? " cs-current" : ""}`} aria-label={cycle.name}>
      <h2 className="cs-title">
        <button type="button" className="cs-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
          <span className="cs-chev">
            <ChevronIcon />
          </span>
          <span className="cs-name">{cycle.name}</span>
          <span className="cs-chips">
            {kind === "current" && <span className="pill pill-blue">En curso</span>}
            {kind === "future" && <span className="pill">Empieza el {shortDate(start)}</span>}
            {kind === "past" && <span className="pill">{cycle.status === "active" ? "Terminó" : CYCLE_STATUS_LABEL[cycle.status]}</span>}
            <span className="pill">{CYCLE_TYPE_LABEL[cycle.cycleType]}</span>
            <span className="pill">
              {shortDate(start)}{start.slice(0, 4) !== end.slice(0, 4) ? ` ${start.slice(0, 4)}` : ""} – {shortDate(end)} {end.slice(0, 4)}
            </span>
            {!isMacro && sessions.length > 0 && (
              <span className="pill">
                {done} de {sessions.length} hechas
              </span>
            )}
          </span>
        </button>
      </h2>

      <div id={bodyId} className="cs-body" hidden={!open}>
        {mounted && (
          <>
            <div className="cs-tools">
              {cycle.objective && <p className="pl-objective">{cycle.objective}</p>}
              <button
                type="button"
                className="button-secondary pl-edit"
                aria-haspopup="dialog"
                aria-expanded={dataAnchor !== null}
                onClick={(e) => setDataAnchor(dataAnchor ? null : e.currentTarget)}
              >
                Datos del ciclo
              </button>
            </div>
            {dataAnchor && (
              <Popover anchor={dataAnchor} label="Datos del ciclo" width={360} onClose={() => setDataAnchor(null)}>
                <CycleEditForm cycle={cycle} onClose={() => setDataAnchor(null)} />
              </Popover>
            )}
            {isMacro ? (
              <div className="hm-card pl-form">
                <p>
                  Un macrociclo agrupa otros ciclos. <Link to={`/cycles/${cycle.id}`}>Abrir el macrociclo</Link>
                </p>
              </div>
            ) : (
              <CycleBoard cycle={cycle} athlete={athlete} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
