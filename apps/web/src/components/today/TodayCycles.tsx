import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as executionApi from "../../services/executionApi";
import { ApiError } from "../../services/httpClient";
import { track } from "../../lib/analytics";
import { openCardKey, todayCards, upcomingDayLabel, type TodayCard } from "../../lib/todayCycles";
import { ExerciseList } from "./ExerciseList";

type OpenCard = Extract<TodayCard, { kind: "pending" | "upcoming" }>;

// «Hoy» cuando hay dos o más ciclos a la vez: una tarjeta por ciclo, con su nombre.
export function TodayCycles({ entries, todayIso }: { entries: executionApi.TodayCycleEntry[]; todayIso: string }) {
  const cards = todayCards(entries, todayIso);
  const openKey = openCardKey(cards);
  return (
    <div className="log-shell tc-list">
      <h1 className="sr-only">Hoy</h1>
      {cards.map((card) =>
        card.kind === "done" ? (
          <section key={card.key} className="tc-card" aria-labelledby={`tc-${card.key}`}>
            <span className="pill pill-blue tc-cycle">{card.cycleName}</span>
            <h2 id={`tc-${card.key}`}>{card.session.name}</h2>
            <span className="pill pill-ok">Hecha hoy</span>
          </section>
        ) : (
          <SessionCard key={card.key} card={card} main={card.key === openKey} todayIso={todayIso} />
        ),
      )}
    </div>
  );
}

function SessionCard({ card, main, todayIso }: { card: OpenCard; main: boolean; todayIso: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = card;
  const upcoming = card.kind === "upcoming";
  const started = Boolean(session.startedAt);
  const [expanded, setExpanded] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = main || expanded;
  const count = session.sessionExercises.length;

  const startMutation = useMutation({
    mutationFn: () => executionApi.startSession(session.id),
    onSuccess: () => navigate(`/sessions/${session.id}/registro`),
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : "No se pudo empezar la sesión."),
  });
  const skipMutation = useMutation({
    mutationFn: (notes?: string) => executionApi.submitFeedback(session.id, { outcome: "skipped", notes }),
    onSuccess: () => {
      track("session_closed", { outcome: "skipped" });
      setSkipping(false);
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : "No se pudo marcar como omitida."),
  });

  function handleSkip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const notes = String(new FormData(event.currentTarget).get("reason") || "").trim();
    skipMutation.mutate(notes || undefined);
  }

  const startButton = (
    <button
      type="button"
      className={main ? "button-primary button-big" : "button-secondary tc-second"}
      disabled={startMutation.isPending}
      onClick={() => (started ? navigate(`/sessions/${session.id}/registro`) : startMutation.mutate())}
    >
      {started ? "Seguir registrando" : startMutation.isPending ? "Empezando…" : "Empezar sesión"}
    </button>
  );
  const toggle = !main && (
    <button type="button" className="button-ghost tc-toggle" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
      {expanded ? "Ocultar" : upcoming ? "Ver la sesión" : `Ver ${count} ${count === 1 ? "ejercicio" : "ejercicios"}`}
    </button>
  );

  return (
    <section className="tc-card" aria-labelledby={`tc-${session.id}`}>
      <span className="pill pill-blue tc-cycle">{card.cycleName}</span>
      <h2 id={`tc-${session.id}`}>{upcoming ? `Próxima: ${session.name}` : `Te toca ${session.name}`}</h2>
      <div className="row">
        <span className="pill">
          {upcoming && session.scheduledDate ? upcomingDayLabel(session.scheduledDate, todayIso) : `Semana ${session.weekNumber}`}
        </span>
        {started && <span className="pill pill-blue">En curso</span>}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {open && <ExerciseList exercises={session.sessionExercises} />}

      {skipping ? (
        <form onSubmit={handleSkip} noValidate className="stack" style={{ gap: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`skip-${session.id}`}>¿Por qué no puedes entrenar? (opcional)</label>
            <textarea id={`skip-${session.id}`} name="reason" rows={2} />
          </div>
          <button type="submit" className="button-primary button-big" disabled={skipMutation.isPending}>
            {skipMutation.isPending ? "Guardando…" : "Marcar como omitida"}
          </button>
          <button type="button" className="button-secondary" onClick={() => setSkipping(false)}>
            Cancelar
          </button>
        </form>
      ) : main ? (
        <div className="stack" style={{ gap: 10 }}>
          {startButton}
          {!started && (
            <button type="button" className="button-ghost tc-skip" onClick={() => setSkipping(true)}>
              No puedo entrenar hoy
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="tc-foot">
            {toggle}
            {(!upcoming || expanded) && startButton}
          </div>
          {expanded && !upcoming && !started && (
            <button type="button" className="button-ghost tc-skip" onClick={() => setSkipping(true)}>
              No puedo entrenar hoy
            </button>
          )}
        </>
      )}
    </section>
  );
}
