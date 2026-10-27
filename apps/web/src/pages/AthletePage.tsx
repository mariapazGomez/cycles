import { FormEvent, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";
import { CYCLE_STATUS_LABEL, CYCLE_TYPE_LABEL, libraryPath } from "../lib/library";
import { usePageBackground } from "../hooks/usePageBackground";
import { LoadingScreen } from "../components/LoadingScreen";
import { CycleCalendarView } from "../components/CycleCalendarView";
import { CycleEditForm } from "../components/CycleEditForm";
import { AthleteSummaryView } from "./AthleteSummaryView";
import { track } from "../lib/analytics";

type View = "ciclo" | "resumen";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Las fechas del ciclo se guardan a medianoche UTC: se leen en UTC para que un
// 21 de octubre no se vea como 20 en una zona al oeste de Greenwich.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

// Activo primero; después, el más reciente.
function sortCycles(cycles: TrainingCycle[]): TrainingCycle[] {
  return [...cycles].sort((a, b) => {
    if ((a.status === "active") !== (b.status === "active")) return a.status === "active" ? -1 : 1;
    return b.startDate.localeCompare(a.startDate);
  });
}

// Ficha del atleta (docs/diseno/biblioteca): vista Ciclo, con el calendario y un
// «+» en cada día, y vista Resumen, con la carga y la adherencia.
export function AthletePage() {
  const { athleteId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>("ciclo");
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  usePageBackground();

  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });

  if (athletesQuery.isLoading || cyclesQuery.isLoading) return <LoadingScreen />;
  const athlete = (athletesQuery.data ?? []).map((r) => r.athlete).find((a) => a.id === athleteId);
  if (athletesQuery.isError || cyclesQuery.isError || !athlete) {
    return <div className="error-banner">No se pudo cargar a este atleta.</div>;
  }

  const cycles = sortCycles((cyclesQuery.data ?? []).filter((c) => c.athleteId === athleteId && !c.isTemplate));
  const selected = cycles.find((c) => c.id === params.get("ciclo")) ?? cycles[0] ?? null;

  function selectCycle(id: string) {
    setShowEdit(false);
    setParams({ ciclo: id }, { replace: true });
  }

  return (
    <div className="pl-page">
      <Link className="rt-back" to="/athletes">
        ← Atletas
      </Link>

      <div className="page-header" style={{ marginTop: 8 }}>
        <div className="pl-title" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
          <span className="hm-avatar" aria-hidden="true">
            {initials(athlete.name)}
          </span>
          <h1 className="page-title">{athlete.name}</h1>
        </div>
        <button type="button" className="button-secondary pl-edit" onClick={() => setShowAssign((v) => !v)}>
          {showAssign ? "Cancelar" : "Asignar ciclo de la Biblioteca"}
        </button>
      </div>

      {showAssign && (
        <AssignTemplatePanel
          athleteId={athleteId}
          onDone={(cycle) => {
            setShowAssign(false);
            setView("ciclo");
            selectCycle(cycle.id);
          }}
        />
      )}

      <div className="pl-views" role="group" aria-label="Vista de la ficha">
        {(["ciclo", "resumen"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={view === v ? "pl-view pl-view-on" : "pl-view"}
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {v === "ciclo" ? "Ciclo" : "Resumen"}
          </button>
        ))}
      </div>

      {view === "resumen" ? (
        <AthleteSummaryView athleteId={athleteId} />
      ) : !selected ? (
        <div className="hm-card pl-form">
          <p>
            {athlete.name} todavía no tiene ciclos. Asigna uno de la Biblioteca o{" "}
            <Link to={libraryPath("cycle", "ciclo")}>crea uno nuevo</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="pl-cycle-bar">
            <label className="pl-cycle-select">
              <select aria-label="Ciclo" value={selected.id} onChange={(e) => selectCycle(e.target.value)}>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="pl-chips">
              <span className={selected.status === "active" ? "pill pill-blue" : "pill"}>
                {CYCLE_STATUS_LABEL[selected.status]}
              </span>
              <span className="pill">{CYCLE_TYPE_LABEL[selected.cycleType]}</span>
              <span className="pill">
                {formatDate(selected.startDate)} – {formatDate(selected.endDate)}
              </span>
            </div>
            <button type="button" className="button-secondary pl-edit" onClick={() => setShowEdit((v) => !v)}>
              {showEdit ? "Cancelar" : "Editar ciclo"}
            </button>
          </div>
          {selected.objective && <p className="pl-objective">{selected.objective}</p>}

          {showEdit && <CycleEditForm cycle={selected} onClose={() => setShowEdit(false)} />}

          {selected.cycleType === "macrocycle" ? (
            <div className="hm-card pl-form">
              <p>
                Un macrociclo agrupa otros ciclos. <Link to={`/cycles/${selected.id}`}>Abrir el macrociclo</Link>
              </p>
            </div>
          ) : (
            <CycleCalendarView key={selected.id} cycle={selected} athlete={{ id: athlete.id, name: athlete.name }} />
          )}
        </>
      )}
    </div>
  );
}

// «Asignar ciclo de la Biblioteca»: crea una copia de la plantilla para este atleta.
function AssignTemplatePanel({ athleteId, onDone }: { athleteId: string; onDone: (cycle: TrainingCycle) => void }) {
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({ queryKey: ["cycles", "templates"], queryFn: cyclesApi.listTemplates });
  const [templateId, setTemplateId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => cyclesApi.assignTemplate(templateId, { athleteId, startDate }),
    onSuccess: (cycle) => {
      track("cycle_created", { type: cycle.cycleType, fromTemplate: true });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onDone(cycle);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo asignar el ciclo."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!templateId || !startDate) {
      setError("Elige un ciclo y la fecha de inicio.");
      return;
    }
    mutation.mutate();
  }

  const templates = templatesQuery.data ?? [];
  return (
    <form onSubmit={handleSubmit} noValidate className="hm-card pl-form">
      <h2>Asignar ciclo de la Biblioteca</h2>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {templatesQuery.isLoading ? (
        <p>Cargando…</p>
      ) : templates.length === 0 ? (
        <p>
          Todavía no tienes ciclos plantilla. Crea uno en la <Link to={libraryPath("cycle", "ciclo")}>Biblioteca</Link>.
        </p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="assignTemplate">Ciclo</label>
            <select id="assignTemplate" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="" disabled>
                Elige un ciclo
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="assignStart">Fecha de inicio</label>
            <input id="assignStart" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <button type="submit" className="button-primary" style={{ width: "auto" }} disabled={mutation.isPending}>
            {mutation.isPending ? "Asignando…" : "Asignar"}
          </button>
        </>
      )}
    </form>
  );
}
