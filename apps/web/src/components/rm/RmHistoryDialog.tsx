import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import * as rmApi from "../../services/rmApi";
import { formatDay, formatNumber } from "../../lib/format";
import { sourceLabel } from "./RmSection";

// Historial de un ejercicio: cada evaluación es una fila; las anteriores no se borran. El RM
// vigente es la evaluación más reciente.
export function RmHistoryDialog({ athleteId, athleteName, exerciseId, onClose }: { athleteId: string; athleteName: string; exerciseId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const query = useQuery({ queryKey: ["rm", athleteId, exerciseId], queryFn: () => rmApi.getAthleteRm(athleteId, exerciseId) });
  const detail = query.data;

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal" role="dialog" aria-modal="true" aria-labelledby="rm-hist-title">
        <header>
          <h2 id="rm-hist-title">
            Historial de {detail?.exercise.name ?? "…"}. {athleteName}
          </h2>
        </header>
        <div className="bd-modal-body">
          {query.isError && <div className="error-banner">No se pudo cargar el historial.</div>}
          {detail && (
            <table className="rm-table">
              <thead>
                <tr>
                  <th scope="col">Evaluación</th>
                  <th scope="col">RM</th>
                  <th scope="col">Origen</th>
                </tr>
              </thead>
              <tbody>
                {detail.history.map((h) => (
                  <tr key={h.id} className={h.id === detail.current?.id ? "rm-current" : undefined}>
                    <td>
                      <b>{formatDay(h.measuredAt)}</b>
                    </td>
                    <td>
                      <b>{formatNumber(h.weightKg)} kg</b>
                    </td>
                    <td>
                      <span className={`rm-tag rm-tag-${h.source}`}>{sourceLabel(h.source)}</span>
                      {h.id === detail.current?.id && " Vigente"}
                      {h.source === "estimated" && h.estimatedFromWeightKg != null && (
                        <span className="rm-from">
                          {" "}
                          {formatNumber(h.estimatedFromWeightKg)} kg × {h.estimatedFromReps}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="rm-note">Cada evaluación agrega una fila; las anteriores no se borran. El RM vigente es la evaluación más reciente.</p>
          <footer>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cerrar
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
