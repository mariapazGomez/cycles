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

function CycleRow({ entry }: { entry: CycleEntry }) {
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
          <span className={entry.status === "active" ? "pill pill-ok" : "pill"}>{CYCLE_STATUS_LABEL[entry.status]}</span>
          <span className="pill">{CYCLE_TYPE_LABEL[entry.cycleType]}</span>
          {entry.weeks > 0 && <span className="pill">{plural(entry.weeks, "semana", "semanas")}</span>}
          {entry.sessionsPerWeek !== null && <span className="pill">{formatInteger(entry.sessionsPerWeek)} por semana</span>}
        </div>
      </div>
      <div className="lb-actions">
        <Link className="rt-ghost" to={`/cycles/${entry.id}`}>
          Abrir
        </Link>
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: routinesApi.listRoutines, enabled: isCoach });
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles, enabled: isCoach });
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
    if (params.get("crear") === "ciclo") {
      setShowCycleForm(true);
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
                Ciclo
              </button>
            </div>
          )}
        </div>
      </div>

      {showCycleForm && <CreateCycleForm onDone={() => setShowCycleForm(false)} />}

      {deleteError && (
        <div className="error-banner" role="alert">
          {deleteError}
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
              <CycleRow key={`c-${entry.id}`} entry={entry} />
            ),
          )}
        </ul>
      )}
    </div>
  );
}
