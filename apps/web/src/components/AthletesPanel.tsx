import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as athletesApi from "../services/athletesApi";
import * as boardApi from "../services/boardApi";
import { useCoachRoster } from "../hooks/useCoachRoster";
import { AthleteCard, AthleteCardSkeleton, type Adherence } from "./AthleteCard";
import { SlowNotice } from "./Skeleton";
import { ApiError } from "../services/httpClient";
import { track } from "../lib/analytics";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lo que falta o está mal en el formulario de invitación, en español.
export function inviteProblems({ name, email }: { name: string; email: string }): string[] {
  const problems: string[] = [];
  if (name.trim() === "") {
    problems.push("Escribe el nombre del atleta.");
  }
  if (email.trim() === "") {
    problems.push("Escribe el email del atleta.");
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    problems.push("Revisa el email: debe verse como nombre@correo.com.");
  }
  return problems;
}

type Filter = "all" | "attention" | "no_plan" | "pending";
// Un equipo es un filtro más (CYC-310): se guarda como «team:<id>».
type TeamFilter = `team:${string}`;

const FILTER_LABEL: Record<Filter, string> = {
  all: "Todos",
  attention: "Con avisos",
  no_plan: "Sin ciclo",
  pending: "Pendientes",
};

// Normaliza para buscar sin importar mayúsculas ni tildes.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Pestaña Atletas: una tarjeta por atleta con su ciclo, su semana y sus avisos;
// búsqueda, filtros y la invitación plegable (docs/diseno/ciclo-en-calendario).
export function AthletesPanel() {
  const queryClient = useQueryClient();
  const roster = useCoachRoster();
  const [showInvite, setShowInvite] = useState(false);
  const [filter, setFilter] = useState<Filter | TeamFilter>("all");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const { rows, monday, todayIso } = roster;

  // Sin atletas, la invitación es lo único que hay que hacer: se muestra abierta.
  const empty = !roster.loading && rows.length === 0;
  const inviteOpen = showInvite || empty;

  useEffect(() => {
    if (showInvite) nameRef.current?.focus();
  }, [showInvite]);

  // Sesiones completadas de las asignadas en las últimas semanas: una consulta para todos.
  const hasAdherence = (row: (typeof rows)[number]) => Boolean(row.cycle) && row.status !== "pending";
  const adherenceQuery = useQuery({
    queryKey: ["athletes", "adherence", 4],
    queryFn: () => boardApi.getBoardAdherence(4),
    enabled: rows.some(hasAdherence),
    staleTime: 60_000,
  });
  const totals = new Map((adherenceQuery.data ?? []).map((a) => [a.athleteId, a]));
  const adherenceById = new Map<string, { value: Adherence | null; loading: boolean }>();
  rows.forEach((row) => {
    const total = hasAdherence(row) ? totals.get(row.id) : undefined;
    adherenceById.set(row.id, {
      value: total ? { done: total.completed, of: total.assigned } : null,
      loading: hasAdherence(row) && adherenceQuery.isLoading && adherenceQuery.fetchStatus !== "idle",
    });
  });

  const inviteMutation = useMutation({
    mutationFn: athletesApi.inviteAthlete,
    onSuccess: () => {
      track("athlete_invited");
      setName("");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo enviar la invitación.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    // Se leen del formulario y no del estado: si el navegador autocompletó un
    // campo sin avisar a la página, el estado seguiría vacío.
    const data = new FormData(event.currentTarget);
    const athlete = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
    };

    // Validación antes de llamar a la API: así se ve el error enseguida y en
    // español, y no se gasta una petición ni se activa el límite de intentos.
    const problems = inviteProblems(athlete);
    if (problems.length > 0) {
      setFormError(problems.join(" "));
      return;
    }
    inviteMutation.mutate(athlete);
  }

  const counts: Record<Filter, number> = {
    all: rows.length,
    attention: rows.filter((r) => r.attention.length > 0).length,
    no_plan: rows.filter((r) => r.status === "no_plan").length,
    pending: rows.filter((r) => r.status === "pending").length,
  };
  // Los equipos que tienen atletas en esta lista, con cuántos son.
  const teamCounts = new Map<string, { name: string; count: number }>();
  for (const row of rows) for (const t of row.teams ?? []) teamCounts.set(t.id, { name: t.name, count: (teamCounts.get(t.id)?.count ?? 0) + 1 });
  const teamFilters = [...teamCounts.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "es"));
  const query = normalize(search.trim());
  const visible = rows.filter((row) => {
    if (filter.startsWith("team:") && !(row.teams ?? []).some((t) => `team:${t.id}` === filter)) return false;
    if (filter === "attention" && row.attention.length === 0) return false;
    if (filter === "no_plan" && row.status !== "no_plan") return false;
    if (filter === "pending" && row.status !== "pending") return false;
    return query === "" || normalize(row.name).includes(query) || normalize(row.email).includes(query);
  });

  return (
    <div className="at-page">
      <div className="page-header">
        <h1 className="page-title">Atletas</h1>
        {!empty && (
          <button type="button" className="button-primary at-invite-btn" data-tour="invite-open" aria-expanded={inviteOpen} onClick={() => setShowInvite((v) => !v)}>
            {showInvite ? "Cerrar" : "Invitar atleta"}
          </button>
        )}
      </div>

      {inviteMutation.isSuccess && !formError && (
        <div className="success-banner" role="status">
          Invitación enviada a {inviteMutation.variables?.email}. Aparecerá aquí como pendiente.
        </div>
      )}

      {inviteOpen && (
        <section className="at-invite" aria-label="Invitar atleta" data-tour="invite-form">
          <h2>{empty ? "Invita a tu primer atleta" : "Invitar atleta"}</h2>
          {formError && <div className="error-banner">{formError}</div>}
          <form onSubmit={handleSubmit} noValidate className="at-invite-form">
            <div className="field">
              <label htmlFor="athleteName">Nombre</label>
              <input id="athleteName" name="name" type="text" required ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="athleteEmail">Email</label>
              <input id="athleteEmail" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="button-primary" data-tour="invite-send" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Enviando…" : "Enviar invitación"}
            </button>
          </form>
        </section>
      )}

      {roster.listError && <div className="error-banner">No se pudo cargar la lista.</div>}

      {!empty && (
        <div className="at-toolbar">
          <div className="at-filters" role="group" aria-label="Filtrar atletas">
            {(Object.keys(FILTER_LABEL) as Filter[])
              .filter((key) => key === "all" || counts[key] > 0)
              .map((key) => (
                <button key={key} type="button" className="cb-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                  {FILTER_LABEL[key]} <em className={key === "attention" ? "" : "at-count"}>{counts[key]}</em>
                </button>
              ))}
            {teamFilters.map(([id, t]) => (
              <button key={id} type="button" className="cb-chip" aria-pressed={filter === `team:${id}`} onClick={() => setFilter(`team:${id}`)}>
                Equipo: {t.name} <em className="at-count">{t.count}</em>
              </button>
            ))}
          </div>
          <div className="at-search">
            <label htmlFor="athleteSearch" className="at-sr">
              Buscar atleta
            </label>
            <input id="athleteSearch" type="search" placeholder="Buscar por nombre o email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {roster.loading ? (
        <>
          <ul className="at-grid" aria-busy="true" aria-label="Cargando a tus atletas">
            {Array.from({ length: 4 }, (_, i) => (
              <AthleteCardSkeleton key={i} />
            ))}
          </ul>
          <SlowNotice />
        </>
      ) : (
        <>
          {visible.length > 0 && (
            <ul className="at-grid">
              {visible.map((row) => (
                <AthleteCard
                  key={row.id}
                  row={row}
                  monday={monday}
                  todayIso={todayIso}
                  adherence={adherenceById.get(row.id)?.value ?? null}
                  adherenceLoading={adherenceById.get(row.id)?.loading ?? false}
                />
              ))}
            </ul>
          )}
          {!empty && visible.length === 0 && (
            <p className="at-none">
              {query !== "" ? "Ningún atleta coincide con tu búsqueda." : "Nadie cumple este filtro."}{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                Ver todos
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
