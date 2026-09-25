import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as trackingApi from "../services/trackingApi";
import { ApiError } from "../services/httpClient";
import { formatPercent } from "../lib/format";

const KIND_LABEL: Record<trackingApi.AttentionKind, { label: string; className: string }> = {
  pain: { label: "Dolor", className: "pill pill-pain" },
  high_load: { label: "Carga alta", className: "pill pill-warn" },
  low_load: { label: "Carga baja", className: "pill pill-blue" },
  low_adherence: { label: "Adherencia", className: "pill" },
};

// Descartar un aviso se guarda solo en este navegador (decisión abierta del
// PRD, §11). Si el dato cambia, el aviso vuelve a aparecer con otra clave.
const DISMISSED_KEY = "cycles.dismissedAlerts";

export function alertKey(item: trackingApi.AttentionItem): string {
  return [item.kind, item.cycle.id, item.exercise?.id ?? "", item.sessionId ?? "", item.message].join("|");
}

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeDismissed(keys: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...keys]));
  } catch {
    // Sin almacenamiento disponible: el descarte dura hasta recargar.
  }
}

export function useDismissedAlerts() {
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);
  function dismiss(item: trackingApi.AttentionItem) {
    const next = new Set(dismissed);
    next.add(alertKey(item));
    writeDismissed(next);
    setDismissed(next);
  }
  return { isDismissed: (item: trackingApi.AttentionItem) => dismissed.has(alertKey(item)), dismiss };
}

export function suggestionLabel(suggestion: trackingApi.LoadSuggestion): string {
  const verb = suggestion.percentChange < 0 ? "Bajar" : "Subir";
  return `${verb} ${formatPercent(suggestion.percentChange).slice(1)} desde semana ${suggestion.fromWeek}`;
}

interface AttentionListProps {
  items: trackingApi.AttentionItem[];
  onDismiss: (item: trackingApi.AttentionItem) => void;
  onApplied: (message: string) => void;
}

export function AttentionList({ items, onDismiss, onApplied }: AttentionListProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const applyMutation = useMutation({
    mutationFn: (item: trackingApi.AttentionItem) =>
      trackingApi.applyLoadAdjustment(item.cycle.id, item.suggestion!),
    onSuccess: (result, item) => {
      setError(null);
      const s = item.suggestion!;
      onApplied(
        `${item.exercise?.name ?? "Ejercicio"} de ${item.athlete.name}: ${formatPercent(s.percentChange)} desde la semana ${s.fromWeek}. ${result.affectedCount} ${result.affectedCount === 1 ? "sesión actualizada" : "sesiones actualizadas"}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["attention"] });
      queryClient.invalidateQueries({ queryKey: ["cycles", item.cycle.id] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : "No se pudo aplicar el ajuste.");
    },
  });

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      <ul className="alert-list">
        {items.map((item) => {
          const kind = KIND_LABEL[item.kind];
          return (
            <li key={alertKey(item)} className="alert-row">
              <div>
                <span className={kind.className}>{kind.label}</span>
              </div>
              <p>{item.message}</p>
              <div className="alert-actions">
                {item.suggestion && (
                  <button
                    type="button"
                    className="button-primary button-compact"
                    disabled={applyMutation.isPending}
                    onClick={() => applyMutation.mutate(item)}
                  >
                    {suggestionLabel(item.suggestion)}
                  </button>
                )}
                {item.kind === "pain" && item.sessionId && (
                  <Link className="button-secondary button-compact" to={`/sessions/${item.sessionId}`}>
                    Ver sesión
                  </Link>
                )}
                {item.kind === "low_adherence" && (
                  <Link className="button-secondary button-compact" to={`/cycles/${item.cycle.id}`}>
                    Ver plan
                  </Link>
                )}
                {item.kind !== "low_adherence" && (
                  <button type="button" className="button-secondary button-compact" onClick={() => onDismiss(item)}>
                    Descartar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
