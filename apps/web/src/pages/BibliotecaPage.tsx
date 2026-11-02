import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as routinesApi from "../services/routinesApi";
import * as cyclesApi from "../services/cyclesApi";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";
import { useAuth } from "../hooks/useAuth";
import { usePageBackground } from "../hooks/usePageBackground";
import { EmptyState } from "../components/EmptyState";
import { Skeleton, SlowNotice } from "../components/Skeleton";
import { TypeIcon } from "../components/TypeIcon";
import { CreateCycleForm } from "../components/CreateCycleForm";
import { CreateTemplateForm } from "../components/CreateTemplateForm";
import { formatInteger } from "../lib/format";
import {
  CYCLE_STATUS_LABEL,
  CYCLE_TYPE_LABEL,
  FILTER_PARAM,
  countByFilter,
  cycleEntry,
  filterFromParam,
  routineEntry,
  visibleEntries,
  type CycleEntry,
  type LibraryEntry,
  type LibraryFilter,
  type RoutineEntry,
} from "../lib/library";

const FILTER_LABEL: Record<LibraryFilter, string> = { all: "Todo", routine: "Rutinas", cycle: "Ciclos" };

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function plural(count: number, one: string, many: string): string {
  return `${formatInteger(count)} ${count === 1 ? one : many}`;
}

function RoutineRow({
  entry,
  confirming,
  busy,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  entry: RoutineEntry;
  confirming: boolean;
  busy: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="lb-row">
      <TypeIcon kind="routine" />
      <div className="lb-main">
        <h2>{entry.name}</h2>
        <div className="lb-tags">
          <span className="pill pill-blue">Rutina</span>
          {entry.groups.map((group) => (
            <span key={group} className="pill">
              {group}
            </span>
          ))}
          <span className="pill">{plural(entry.exercises, "ejercicio", "ejercicios")}</span>
          <span className="pill">{plural(entry.sets, "serie", "series")}</span>
        </div>
      </div>
      <div className="lb-actions">
        {confirming ? (
          <>
            <span className="rt-hint">¿Borrar esta rutina?</span>
            <button type="button" className="rt-ghost rt-ghost-danger" disabled={busy} onClick={onDelete}>
              Sí, borrar
            </button>
            <button type="button" className="rt-ghost" onClick={onCancelDelete}>
              No
            </button>
          </>
        ) : (
          <>
            <Link className="rt-ghost" to={`/routines/${entry.id}`}>
              Editar
            </Link>
            <button type="button" className="rt-ghost" onClick={onAskDelete}>
              Borrar
            </button>
          </>
        )}
      </div>
    </li>
  );
}

interface ActiveAthlete {
  id: string;
  name: string;
}

function CycleRow({
  entry,
  athletes,
  onDone,
  onError,
}: {
  entry: CycleEntry;
  athletes: ActiveAthlete[];
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [athleteId, setAthleteId] = useState("");
  const [startDate, setStartDate] = useState("");
  const impactQuery = useQuery({
    queryKey: ["cycles", "templates", entry.id, "impact"],
    queryFn: () => cyclesApi.getTemplateImpact(entry.id),
    enabled: confirming && entry.isTemplate,
  });

  // Desasignar quita el ciclo de ese atleta; eliminar borra la plantilla y la
  // quita de todos. Con entrenamientos registrados queda archivado, no borrado.
  const mutation = useMutation<{ result: cyclesApi.RemovalResult } | { unassigned: number; archived: number }>({
    mutationFn: () => (entry.isTemplate ? cyclesApi.removeTemplate(entry.id) : cyclesApi.unassignCycle(entry.id)),
    onSuccess: (outcome) => {
      setConfirming(false);
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      if ("result" in outcome) {
        onDone(
          outcome.result === "archived"
            ? "Ciclo desasignado: tiene entrenamientos registrados, así que quedó archivado."
            : entry.fromTemplate
              ? "Ciclo desasignado. Sigue en tu Biblioteca."
              : "Ciclo desasignado y eliminado.",
        );
      } else {
        onDone(
          outcome.archived > 0
            ? `Ciclo eliminado. Se quitó de los atletas; ${plural(outcome.archived, "quedó archivado", "quedaron archivados")} por tener entrenamientos registrados.`
            : "Ciclo eliminado de la Biblioteca y de todos sus atletas.",
        );
      }
    },
    onError: (error: unknown) => {
      setConfirming(false);
      onError(error instanceof ApiError ? error.message : "No se pudo quitar el ciclo.");
    },
  });

  const saveTemplate = useMutation({
    mutationFn: () => cyclesApi.saveAsTemplate(entry.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onDone("Ciclo guardado en tu Biblioteca como plantilla. Puedes asignarlo a otros atletas.");
    },
    onError: (error: unknown) => onError(error instanceof ApiError ? error.message : "No se pudo guardar el ciclo."),
  });

  const assign = useMutation({
    mutationFn: () => cyclesApi.assignTemplate(entry.id, { athleteId, startDate }),
    onSuccess: () => {
      const who = athletes.find((a) => a.id === athleteId)?.name ?? "el atleta";
      setAssigning(false);
      setAthleteId("");
      setStartDate("");
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      onDone(`Ciclo asignado a ${who}. Arma sus sesiones desde su calendario.`);
    },
    onError: (error: unknown) => onError(error instanceof ApiError ? error.message : "No se pudo asignar el ciclo."),
  });

  const impact = impactQuery.data?.athletes ?? [];
  const archivedCount = impact.filter((a) => a.hasHistory).length;
  // Solo se quita lo vigente: lo completado o archivado queda como historial.
  const removable = entry.status === "active";

  let question: string;
  if (entry.isTemplate) {
    question = impactQuery.isLoading
      ? "Revisando a quién está asignado…"
      : impact.length === 0
        ? "¿Eliminar este ciclo de tu Biblioteca? No está asignado a nadie."
        : `¿Eliminar este ciclo? Se quitará de ${plural(impact.length, "atleta", "atletas")}: ${impact.map((a) => a.name).join(", ")}.` +
          (archivedCount > 0 ? ` ${plural(archivedCount, "tiene", "tienen")} entrenamientos registrados y quedará${archivedCount === 1 ? "" : "n"} archivado${archivedCount === 1 ? "" : "s"}.` : "");
  } else {
    question = entry.fromTemplate
      ? `¿Desasignar este ciclo de ${entry.athleteName ?? "su atleta"}? Sigue en tu Biblioteca.`
      : `¿Desasignar este ciclo de ${entry.athleteName ?? "su atleta"}? No es una plantilla de tu Biblioteca: se eliminará (si ya tiene entrenamientos registrados, queda archivado).`;
  }

  return (
    <li className="lb-row">
      <TypeIcon kind="cycle" />
      <div className="lb-main">
        <div className="lb-title">
          <h2>{entry.name}</h2>
          {entry.athleteName && (
            <span className="lb-who">
              <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                {initials(entry.athleteName)}
              </span>
              {entry.athleteName}
            </span>
          )}
        </div>
        <div className="lb-tags">
          <span className="pill lb-pill-cycle">Ciclo</span>
          {entry.isTemplate ? (
            <span className="pill">Sin asignar</span>
          ) : (
            <span className={entry.status === "active" ? "pill pill-ok" : "pill"}>{CYCLE_STATUS_LABEL[entry.status]}</span>
          )}
          <span className="pill">{CYCLE_TYPE_LABEL[entry.cycleType]}</span>
          {entry.weeks > 0 && <span className="pill">{plural(entry.weeks, "semana", "semanas")}</span>}
          {entry.sessionsPerWeek !== null && <span className="pill">{formatInteger(entry.sessionsPerWeek)} por semana</span>}
        </div>
        {confirming && (
          <p className="rt-hint" role="alert">
            {question}
          </p>
        )}
        {assigning && (
          <form
            className="lb-assign"
            onSubmit={(event) => {
              event.preventDefault();
              if (!athleteId || !startDate) return onError("Elige el atleta y la fecha de inicio.");
              assign.mutate();
            }}
          >
            <select aria-label="Atleta" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
              <option value="" disabled>
                Elige un atleta
              </option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input type="date" aria-label="Fecha de inicio" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <button type="submit" className="button-primary" style={{ width: "auto" }} disabled={assign.isPending}>
              {assign.isPending ? "Asignando…" : "Asignar"}
            </button>
            <button type="button" className="rt-ghost" onClick={() => setAssigning(false)}>
              Cancelar
            </button>
          </form>
        )}
      </div>
      <div className="lb-actions">
        {confirming ? (
          <>
            <button
              type="button"
              className="rt-ghost rt-ghost-danger"
              disabled={mutation.isPending || (entry.isTemplate && impactQuery.isLoading)}
              onClick={() => mutation.mutate()}
            >
              {entry.isTemplate ? "Sí, eliminar" : "Sí, desasignar"}
            </button>
            <button type="button" className="rt-ghost" onClick={() => setConfirming(false)}>
              No
            </button>
          </>
        ) : (
          <>
            {!entry.isTemplate && (
              <Link className="rt-ghost" to={`/cycles/${entry.id}`}>
                Ver en el atleta
              </Link>
            )}
            {entry.isTemplate && !assigning && (
              <button
                type="button"
                className="rt-ghost"
                disabled={athletes.length === 0}
                title={athletes.length === 0 ? "Invita a un atleta primero" : undefined}
                onClick={() => setAssigning(true)}
              >
                Asignar
              </button>
            )}
            {!entry.isTemplate && entry.cycleType !== "macrocycle" && (
              <button type="button" className="rt-ghost" disabled={saveTemplate.isPending} onClick={() => saveTemplate.mutate()}>
                Guardar como plantilla
              </button>
            )}
            {removable && (
              <button type="button" className="rt-ghost" onClick={() => setConfirming(true)}>
                {entry.isTemplate ? "Eliminar" : "Desasignar"}
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function LoadingRows() {
  return (
    <>
      <ul className="lb-list" aria-busy="true" aria-label="Cargando tu biblioteca">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="lb-row">
            <Skeleton width={40} height={40} />
            <div className="lb-main">
              <Skeleton width="34%" height={18} />
              <Skeleton width="58%" height={14} />
            </div>
          </li>
        ))}
      </ul>
      <SlowNotice />
    </>
  );
}

// Biblioteca del coach: sus rutinas y sus ciclos en una sola lista, con filtros
// y buscador. Reemplaza a las pestañas Ciclos y Rutinas. Diseño en
// docs/diseno/biblioteca.
export function BibliotecaPage() {
  const { user } = useAuth();
  const isCoach = user?.role === "coach";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  usePageBackground();

  const filter = filterFromParam(params.get("tipo"));
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCycleForm, setShowCycleForm] = useState(params.get("crear") === "ciclo");
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines, enabled: isCoach });
  const cyclesQuery = useQuery({ queryKey: ["cycles", "library"], queryFn: cyclesApi.listLibraryCycles, enabled: isCoach });
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: athletesApi.listAthletes, enabled: isCoach });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routinesApi.deleteRoutine(id),
    onSuccess: () => {
      setConfirmingId(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: (error: unknown) => {
      setConfirmingId(null);
      setDeleteError(error instanceof ApiError ? error.message : "No se pudo borrar la rutina.");
    },
  });

  // El parámetro ?crear=ciclo (que usan los botones «Crear ciclo» de otras
  // pantallas) abre el formulario una vez y se quita de la dirección.
  useEffect(() => {
    const create = params.get("crear");
    if (create === "ciclo" || create === "plantilla") {
      if (create === "ciclo") setShowCycleForm(true);
      else setShowTemplateForm(true);
      const next = new URLSearchParams(params);
      next.delete("crear");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const activeAthletes = useMemo(
    () =>
      (athletesQuery.data ?? [])
        .filter((relation) => relation.status === "active")
        .map((relation) => ({ id: relation.athlete.id, name: relation.athlete.name })),
    [athletesQuery.data],
  );

  const entries = useMemo<LibraryEntry[]>(() => {
    const names = new Map((athletesQuery.data ?? []).map((relation) => [relation.athlete.id, relation.athlete.name]));
    return [
      ...(routinesQuery.data ?? []).map(routineEntry),
      ...(cyclesQuery.data ?? []).map((cycle) => cycleEntry(cycle, names)),
    ];
  }, [routinesQuery.data, cyclesQuery.data, athletesQuery.data]);

  if (!isCoach) return <Navigate to="/" replace />;

  const loading = routinesQuery.isLoading || cyclesQuery.isLoading;
  const failed = routinesQuery.isError || cyclesQuery.isError;
  const counts = countByFilter(entries);
  const visible = visibleEntries(entries, filter, search);
  const empty = !loading && !failed && entries.length === 0;

  function selectFilter(next: LibraryFilter) {
    const nextParams = new URLSearchParams(params);
    if (next === "all") nextParams.delete("tipo");
    else nextParams.set("tipo", FILTER_PARAM[next]);
    setParams(nextParams, { replace: true });
  }

  function retry() {
    routinesQuery.refetch();
    cyclesQuery.refetch();
  }

  function openTemplateForm() {
    setMenuOpen(false);
    setShowTemplateForm(true);
  }

  function openCycleForm() {
    setMenuOpen(false);
    setShowCycleForm(true);
  }

  return (
    <div className="stack lb-page">
      <div className="page-header">
        <h1 className="page-title">Biblioteca</h1>
        <div className="lb-menu" ref={menuRef}>
          <button
            type="button"
            className="button-primary rt-cta"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            Crear
          </button>
          {menuOpen && (
            <div className="lb-menu-list" role="menu">
              <button type="button" role="menuitem" onClick={() => navigate("/routines/new")}>
                <TypeIcon kind="routine" small />
                Rutina
              </button>
              <button type="button" role="menuitem" onClick={openCycleForm}>
                <TypeIcon kind="cycle" small />
                Ciclo para un atleta
              </button>
              <button type="button" role="menuitem" onClick={openTemplateForm}>
                <TypeIcon kind="cycle" small />
                Ciclo para la Biblioteca
              </button>
            </div>
          )}
        </div>
      </div>

      {showCycleForm && <CreateCycleForm onDone={() => setShowCycleForm(false)} />}
      {showTemplateForm && (
        <CreateTemplateForm
          onDone={(message) => {
            setShowTemplateForm(false);
            if (message) {
              setDeleteError(null);
              setNotice(message);
            }
          }}
        />
      )}

      {deleteError && (
        <div className="error-banner" role="alert">
          {deleteError}
        </div>
      )}

      {notice && (
        <div className="success-banner" role="status">
          {notice}
        </div>
      )}

      {failed && (
        <div className="error-banner lb-error" role="alert">
          <span>No se pudo cargar tu biblioteca.</span>
          <button type="button" className="button-secondary" style={{ width: "auto" }} onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {!empty && !failed && (
        <div className="at-toolbar">
          <div className="at-filters" role="group" aria-label="Filtrar por tipo">
            {(Object.keys(FILTER_LABEL) as LibraryFilter[]).map((key) => (
              <button key={key} type="button" className="cb-chip" aria-pressed={filter === key} onClick={() => selectFilter(key)}>
                {FILTER_LABEL[key]} <em className="at-count">{loading ? "…" : counts[key]}</em>
              </button>
            ))}
          </div>
          <div className="at-search">
            <label htmlFor="librarySearch" className="at-sr">
              Buscar en la biblioteca
            </label>
            <input
              id="librarySearch"
              type="search"
              placeholder="Buscar por nombre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading && <LoadingRows />}

      {empty && (
        <EmptyState
          title="Tu biblioteca está vacía"
          action={
            <div className="lb-empty-actions">
              <Link className="button-primary rt-cta" to="/routines/new">
                Crear rutina
              </Link>
              <button type="button" className="button-secondary rt-cta" onClick={openCycleForm}>
                Crear ciclo
              </button>
            </div>
          }
        >
          Aquí vivirán tus rutinas y tus ciclos. Empieza armando una rutina; después puedes combinarlas en un ciclo.
        </EmptyState>
      )}

      {!loading && !failed && !empty && visible.length === 0 && (
        <p className="at-none">No hay resultados{search.trim() ? ` para «${search.trim()}»` : ""}.</p>
      )}

      {!loading && !failed && visible.length > 0 && (
        <ul className="lb-list">
          {visible.map((entry) =>
            entry.kind === "routine" ? (
              <RoutineRow
                key={`r-${entry.id}`}
                entry={entry}
                confirming={confirmingId === entry.id}
                busy={deleteMutation.isPending}
                onAskDelete={() => {
                  setDeleteError(null);
                  setConfirmingId(entry.id);
                }}
                onCancelDelete={() => setConfirmingId(null)}
                onDelete={() => deleteMutation.mutate(entry.id)}
              />
            ) : (
              <CycleRow
                key={`c-${entry.id}`}
                entry={entry}
                athletes={activeAthletes}
                onDone={(message) => {
                  setDeleteError(null);
                  setNotice(message);
                }}
                onError={(message) => {
                  setNotice(null);
                  setDeleteError(message);
                }}
              />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
