import { FormEvent, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingCycle } from "@cycles/shared";
import * as cyclesApi from "../services/cyclesApi";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";
import { libraryPath } from "../lib/library";
import { usePageBackground } from "../hooks/usePageBackground";
import { usePageWide } from "../hooks/usePageWide";
import { LoadingScreen } from "../components/LoadingScreen";
import { CycleSection } from "../components/board/CycleSection";
import { NewCycleDialog } from "../components/board/NewCycleDialog";
import { orderSections, sectionKind } from "../lib/cycleSections";
import { suggestStart } from "../lib/newCycle";
import { toLocalDay } from "../lib/calendar";
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

// Ficha del atleta (docs/diseno/biblioteca): vista Ciclo, con el calendario y un
// «+» en cada día, y vista Resumen, con la carga y la adherencia.
export function AthletePage() {
  const { athleteId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>("ciclo");
  // Lo que la coach abre o cierra a mano; sin tocar nada, solo el ciclo en curso va abierto.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [showAssign, setShowAssign] = useState(false);
  const [showNewCycle, setShowNewCycle] = useState(false);
  // Ciclo que acaba de crearse o asignarse: cuando llega a la lista se abre y se muestra.
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);
  usePageBackground();
  usePageWide();

  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });
  useEffect(() => {
    if (!pendingScroll) return;
    const target = document.getElementById(`ciclo-${pendingScroll}`);
    if (!target) return;
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    setPendingScroll(null);
  }, [pendingScroll, cyclesQuery.data]);

  if (athletesQuery.isLoading || cyclesQuery.isLoading) return <LoadingScreen />;
  const athlete = (athletesQuery.data ?? []).map((r) => r.athlete).find((a) => a.id === athleteId);
  if (athletesQuery.isError || cyclesQuery.isError || !athlete) {
    return <div className="error-banner">No se pudo cargar a este atleta.</div>;
  }

  const today = toLocalDay(new Date());
  const { cycles, current } = orderSections(
    (cyclesQuery.data ?? []).filter((c) => c.athleteId === athleteId && !c.isTemplate),
    today,
  );
  // Se abren por defecto el ciclo en curso y el que pida el enlace (?ciclo=).
  const linked = params.get("ciclo");
  const isOpen = (cycle: TrainingCycle) => toggled[cycle.id] ?? (cycle === current || cycle.id === linked);

  // Abre el ciclo (p. ej. el recién creado) y lo deja a la vista.
  function selectCycle(id: string) {
    setToggled((prev) => ({ ...prev, [id]: true }));
    setParams({ ciclo: id }, { replace: true });
    setPendingScroll(id);
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
      ) : cycles.length === 0 ? (
        <div className="hm-card pl-form">
          <p>
            {athlete.name} todavía no tiene ciclos. Asigna uno de la Biblioteca o crea uno nuevo aquí.
          </p>
          <button type="button" className="button-primary" style={{ width: "auto" }} onClick={() => setShowNewCycle(true)}>
            Nuevo ciclo
          </button>
        </div>
      ) : (
        <>
          <div className="pl-cycle-bar">
            <button type="button" className="button-secondary pl-edit" onClick={() => setShowNewCycle(true)}>
              Nuevo ciclo
            </button>
          </div>
          <div className="cs-list">
            {cycles.map((cycle) => (
              <div key={cycle.id} id={`ciclo-${cycle.id}`} className="cs-anchor">
                <CycleSection
                  cycle={cycle}
                  athlete={{ id: athlete.id, name: athlete.name }}
                  kind={sectionKind(cycle, current, today)}
                  open={isOpen(cycle)}
                  onToggle={() => setToggled((prev) => ({ ...prev, [cycle.id]: !isOpen(cycle) }))}
                />
              </div>
            ))}
          </div>
        </>
      )}
      {showNewCycle && (
        <NewCycleDialog
          athleteName={athlete.name}
          athleteId={athleteId}
          defaultStart={suggestStart(cycles, today)}
          defaultSessions={current?.sessionsPerWeek ?? undefined}
          onClose={() => setShowNewCycle(false)}
          onCreated={(cycle) => {
            setShowNewCycle(false);
            setView("ciclo");
            selectCycle(cycle.id);
          }}
        />
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
