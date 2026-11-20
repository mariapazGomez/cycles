import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as rmApi from "../../services/rmApi";
import { formatDay, formatNumber } from "../../lib/format";
import { RmDialog } from "./RmDialog";
import { RmHistoryDialog } from "./RmHistoryDialog";

export function sourceLabel(source: rmApi.MaxSource): string {
  return source === "estimated" ? "Aproximado" : source === "athlete" ? "Atleta" : "Coach";
}

type Dialog =
  | { kind: "rm"; exerciseId?: string; maxLifted?: { weightKg: number; reps: number } | null; calculator?: boolean }
  | { kind: "history"; exerciseId: string };

function lifted(e: rmApi.RmExerciseInfo) {
  return e.maxLifted ? { weightKg: e.maxLifted.weightKg, reps: e.maxLifted.reps } : null;
}

function liftedText(e: rmApi.RmExerciseInfo): string {
  return e.maxLifted ? `${formatNumber(e.maxLifted.weightKg)} kg × ${e.maxLifted.reps}` : "—";
}

// Sección RM de la ficha del atleta (CYC-312): ejercicios con RM y sin RM. «Máximo levantado» es
// el mayor peso de sus series: una referencia que nunca llena ni reemplaza el RM.
export function RmSection({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const query = useQuery({ queryKey: ["rm", athleteId], queryFn: () => rmApi.listAthleteRm(athleteId) });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const firstName = athleteName.split(" ")[0];

  if (query.isLoading) return <p>Cargando…</p>;
  if (query.isError || !query.data) return <div className="error-banner">No se pudo cargar el RM de {firstName}.</div>;
  const { withMax, withoutMax } = query.data;
  const estimated = withMax.filter((m) => m.source === "estimated");

  return (
    <section className="rm-section" aria-label="RM">
      <div className="rm-banner">
        <span>
          Cuando evalúes a {firstName}, <b>actualiza su RM</b>: las sesiones que aún no empieza usan el valor nuevo.
        </span>
        <button type="button" className="bd-btn" onClick={() => setDialog({ kind: "rm" })}>
          Agregar RM
        </button>
      </div>

      <h2 className="rm-h">Con RM</h2>
      {withMax.length === 0 ? (
        <p className="rm-note">{firstName} todavía no tiene RM registrado.</p>
      ) : (
        <table className="rm-table">
          <thead>
            <tr>
              <th scope="col">Ejercicio</th>
              <th scope="col">RM (1 rep)</th>
              <th scope="col">Evaluado</th>
              <th scope="col">Origen</th>
              <th scope="col">Máximo levantado</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {withMax.map((m) => (
              <tr key={m.exerciseId}>
                <td>
                  <button type="button" className="rm-name" onClick={() => setDialog({ kind: "history", exerciseId: m.exerciseId })} aria-label={`Ver el historial de ${m.name}`}>
                    {m.name}
                  </button>
                </td>
                <td>
                  <b>{formatNumber(m.weightKg)} kg</b>
                </td>
                <td>{formatDay(m.measuredAt)}</td>
                <td>
                  <span className={`rm-tag rm-tag-${m.source}`}>{sourceLabel(m.source)}</span>
                </td>
                <td>{liftedText(m)}</td>
                <td>
                  <button type="button" className="bld-link" onClick={() => setDialog({ kind: "rm", exerciseId: m.exerciseId, maxLifted: lifted(m) })} aria-label={`Actualizar el RM de ${m.name}`}>
                    Actualizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {estimated.map((m) => (
        <p key={m.exerciseId} className="rm-callout">
          <b>
            {m.name}: RM aproximado de {formatNumber(m.weightKg)} kg.
          </b>{" "}
          Calculado el {formatDay(m.measuredAt)} (Epley). Actualízalo con una evaluación.
        </p>
      ))}

      <h2 className="rm-h">Sin RM</h2>
      {withoutMax.length === 0 ? (
        <p className="rm-note">Todos los ejercicios del plan de {firstName} tienen RM.</p>
      ) : (
        <table className="rm-table">
          <thead>
            <tr>
              <th scope="col">Ejercicio</th>
              <th scope="col">RM (1 rep)</th>
              <th scope="col">Máximo levantado</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {withoutMax.map((e) => (
              <tr key={e.exerciseId}>
                <td>
                  <b>{e.name}</b>
                </td>
                <td>—</td>
                <td>{liftedText(e)}</td>
                <td className="rm-actions">
                  <button type="button" className="bld-link" onClick={() => setDialog({ kind: "rm", exerciseId: e.exerciseId, maxLifted: lifted(e) })} aria-label={`Agregar el RM de ${e.name}`}>
                    Agregar RM
                  </button>
                  <button type="button" className="bld-link" onClick={() => setDialog({ kind: "rm", exerciseId: e.exerciseId, maxLifted: lifted(e), calculator: true })} aria-label={`Calcular un RM aproximado de ${e.name}`}>
                    Calcular aproximado
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dialog?.kind === "rm" && (
        <RmDialog athleteId={athleteId} athleteName={athleteName} exerciseId={dialog.exerciseId} maxLifted={dialog.maxLifted} startInCalculator={dialog.calculator} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "history" && <RmHistoryDialog athleteId={athleteId} athleteName={athleteName} exerciseId={dialog.exerciseId} onClose={() => setDialog(null)} />}
    </section>
  );
}
