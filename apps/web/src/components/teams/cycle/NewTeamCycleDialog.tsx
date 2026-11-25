import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import { ApiError } from "../../../services/httpClient";
import * as teamCyclesApi from "../../../services/teamCyclesApi";
import { toLocalDay } from "../../../lib/calendar";
import { busyDays, EMPTY_RANGE, pickDay, type Range } from "../../../lib/cycleRange";
import { rangesCross, defaultRecipients, ownCyclesNotice } from "../../../lib/teamCycle";
import { athletesCount, initialsOf } from "../../../lib/teams";
import { CycleRangePicker } from "../../cycles/CycleRangePicker";
import { track } from "../../../lib/analytics";

// «Agregar ciclo» del equipo: primero nombre y fechas en el calendario; después, quién lo recibe.
export function NewTeamCycleDialog({
  team,
  existing,
  onClose,
  onCreated,
}: {
  team: { id: string; name: string };
  existing: teamCyclesApi.TeamCycleSummary[];
  onClose: () => void;
  onCreated: (cycle: teamCyclesApi.TeamCycleDetail) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const today = toLocalDay(new Date());
  const [step, setStep] = useState<"data" | "who">("data");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [range, setRange] = useState<Range>(EMPTY_RANGE);
  // null = todavía no se toca: valen los marcados por defecto.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = existing.filter((c) => c.status === "active");
  const busy = useMemo(() => busyDays(active), [existing]); // eslint-disable-line react-hooks/exhaustive-deps
  const crossed = range.start && range.end ? rangesCross(active, range.start, range.end) : false;
  const ready = name.trim() !== "" && range.start !== null && range.end !== null && !crossed;

  const preview = useQuery({
    queryKey: ["teams", team.id, "cycle-preview", range.start, range.end],
    queryFn: () => teamCyclesApi.previewTeamCycle(team.id, { startDate: range.start!, endDate: range.end!, today }),
    enabled: step === "who" && ready,
    gcTime: 0,
  });
  const members = preview.data?.members ?? [];
  const selected = picked ?? new Set(defaultRecipients(members));
  const notice = ownCyclesNotice(members);

  const create = useMutation({
    mutationFn: () =>
      teamCyclesApi.createTeamCycle(team.id, {
        name: name.trim(),
        objective: objective.trim() || undefined,
        startDate: range.start!,
        endDate: range.end!,
        athleteIds: [...selected],
        today,
      }),
    onSuccess: (cycle) => {
      track("cycle_created", { type: "mesocycle", via: "team" });
      queryClient.invalidateQueries({ queryKey: ["cycles"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      onCreated(cycle);
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo crear el ciclo."),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ready) return;
    if (step === "data") setStep("who");
    else create.mutate();
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal cy-modal tmc-modal" role="dialog" aria-modal="true" aria-labelledby="tmc-new-title">
        <header>
          <h2 id="tmc-new-title">{step === "data" ? `Nuevo ciclo para ${team.name}` : `¿Quién recibe «${name.trim()}»?`}</h2>
        </header>
        <form className="bd-modal-body" noValidate onSubmit={submit}>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {step === "data" ? (
            <>
              {crossed && (
                <p className="cy-warn" role="alert">
                  El equipo ya tiene un ciclo en esas fechas. Elige otras.
                </p>
              )}
              <div>
                <label className="bd-lbl" htmlFor="tmc-name">
                  Nombre
                </label>
                <input id="tmc-name" data-autofocus className="bd-inp" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="bd-lbl" htmlFor="tmc-obj">
                  Objetivo (opcional)
                </label>
                <input id="tmc-obj" className="bd-inp" maxLength={500} value={objective} onChange={(e) => setObjective(e.target.value)} />
              </div>
              <div>
                <span className="bd-lbl">Fechas del ciclo</span>
                <CycleRangePicker
                  value={range}
                  onPick={(iso) => {
                    setRange((r) => pickDay(r, iso, today));
                    setPicked(null);
                  }}
                  today={today}
                  busy={busy}
                />
              </div>
            </>
          ) : preview.isError ? (
            <div className="error-banner" role="alert">
              No se pudo revisar a los atletas del equipo.
            </div>
          ) : !preview.data ? (
            <p>Cargando…</p>
          ) : (
            <>
              {notice && <p className="cy-warn">{notice}</p>}
              {members.length === 0 && <p className="rm-note">El equipo no tiene atletas. Puedes crear el ciclo y asignarlo después.</p>}
              <ul className="tmc-who">
                {members.map((m) => (
                  <li key={m.id}>
                    <label className={m.canReceive ? undefined : "tmc-off"}>
                      <input type="checkbox" checked={m.canReceive && selected.has(m.id)} disabled={!m.canReceive} onChange={() => toggle(m.id)} />
                      <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                        {initialsOf(m.name)}
                      </span>
                      <span className="tmc-who-name">{m.name}</span>
                      {!m.canReceive ? (
                        <span className="tmc-tag">Invitación pendiente</span>
                      ) : (
                        m.ownCycles.length > 0 && <span className="tmc-tag tmc-tag-warn">Tiene {m.ownCycles.map((c) => `«${c.name}»`).join(" y ")}</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
          <footer>
            {step === "data" ? (
              <button type="button" className="bd-btn" onClick={onClose}>
                Cancelar
              </button>
            ) : (
              <button type="button" className="bd-btn" onClick={() => setStep("data")}>
                Atrás
              </button>
            )}
            <button type="submit" className="bd-btn bd-btn-p" disabled={!ready || create.isPending || (step === "who" && !preview.data)}>
              {step === "data" ? "Continuar" : create.isPending ? "Creando…" : selected.size === 0 ? "Crear ciclo sin atletas" : `Crear ciclo para ${athletesCount(selected.size)}`}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
