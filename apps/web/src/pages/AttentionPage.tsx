import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as trackingApi from "../services/trackingApi";
import { AttentionList, useDismissedAlerts } from "../components/AttentionList";

// Inicio del coach: primero qué atletas necesitan atención y por qué.
// Ver docs/prds/features/PRD-EjecucionYSeguimiento.md, §7.2.
export function AttentionPage() {
  const attentionQuery = useQuery({ queryKey: ["attention"], queryFn: trackingApi.getAttention });
  const { isDismissed, dismiss } = useDismissedAlerts();
  const [applied, setApplied] = useState<string | null>(null);

  const visible = (attentionQuery.data ?? []).filter((item) => !isDismissed(item));
  const byAthlete = new Map<string, { name: string; items: trackingApi.AttentionItem[] }>();
  for (const item of visible) {
    const group = byAthlete.get(item.athlete.id) ?? { name: item.athlete.name, items: [] };
    group.items.push(item);
    byAthlete.set(item.athlete.id, group);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-title">Necesitan atención</h1>
      </div>

      {applied && (
        <div className="success-banner" role="status">
          <strong>Ajuste aplicado.</strong> {applied}
        </div>
      )}
      {attentionQuery.isLoading && <p>Cargando…</p>}
      {attentionQuery.isError && <div className="error-banner">No se pudieron cargar los avisos.</div>}
      {attentionQuery.data && byAthlete.size === 0 && (
        <p>Sin avisos: todo va según lo planificado.</p>
      )}

      {[...byAthlete.entries()].map(([athleteId, group]) => (
        <section key={athleteId} className="card">
          <div className="card-header">
            <h2 className="section-title">{group.name}</h2>
            <Link className="button-ghost" to={`/athletes/${athleteId}`}>
              Ver resumen →
            </Link>
          </div>
          <AttentionList items={group.items} onDismiss={dismiss} onApplied={setApplied} />
        </section>
      ))}
    </div>
  );
}
