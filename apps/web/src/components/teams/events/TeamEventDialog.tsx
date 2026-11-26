import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TeamEventOccurrence, TeamEventSeries } from "@cycles/shared";
import * as teamEventsApi from "../../../services/teamEventsApi";
import { ApiError } from "../../../services/httpClient";
import { useDialogFocus } from "../../../hooks/useDialogFocus";
import { changeDate, emptyForm, formOf, formPayload, formProblem, repeatDaysOf, toggleDay, TEAM_TYPE_OPTIONS, TYPE_COLOR, type EventForm } from "../../../lib/teamEvents";

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// «Nuevo evento para <equipo>» y su edición (CYC-319). Editar cambia toda la serie.
export function TeamEventDialog({
  team,
  editing,
  initialDate,
  onClose,
  onSaved,
}: {
  team: { id: string; name: string };
  editing?: TeamEventOccurrence;
  initialDate: string;
  onClose: () => void;
  onSaved: (saved: TeamEventSeries) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventForm>(() => (editing ? formOf(editing) : emptyForm(initialDate)));
  const [attempted, setAttempted] = useState(false);
  const set = (patch: Partial<EventForm>) => setForm((f) => ({ ...f, ...patch }));
  const problem = formProblem(form);
  const days = repeatDaysOf(form);

  const save = useMutation({
    mutationFn: () => (editing ? teamEventsApi.updateTeamEvent(team.id, editing.seriesId, formPayload(form)) : teamEventsApi.createTeamEvent(team.id, formPayload(form))),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["teams", team.id, "calendar"] });
      onSaved(saved);
    },
  });
  const failure = save.isError ? (save.error instanceof ApiError ? save.error.message : "No se pudo guardar el evento.") : null;

  return (
    <div className="bd-modal-wrap">
      <div className="bd-modal-scrim" onClick={onClose} />
      <div ref={ref} className="bd-modal tme-modal" role="dialog" aria-modal="true" aria-labelledby="tme-title">
        <header>
          <h2 id="tme-title">{editing ? "Editar evento" : `Nuevo evento para ${team.name}`}</h2>
        </header>
        <form
          className="bd-modal-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setAttempted(true);
            if (!problem) save.mutate();
          }}
        >
          {(failure || (attempted && problem)) && (
            <div className="error-banner" role="alert">
              {failure ?? problem}
            </div>
          )}
          {editing?.repeat && <p className="bd-hint">Los cambios se aplican a todas las fechas de este evento.</p>}
          <fieldset className="tme-field">
            <legend className="bd-lbl">Tipo</legend>
            <div className="tme-types">
              {TEAM_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className={form.type === option.value ? "tme-type tme-type-on" : "tme-type"}>
                  <input type="radio" name="tme-type" className="sr-only" checked={form.type === option.value} onChange={() => set({ type: option.value })} />
                  <i style={{ background: TYPE_COLOR[option.value] }} aria-hidden="true" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="bd-lbl" htmlFor="tme-name">
              Nombre
            </label>
            <input id="tme-name" data-autofocus className="bd-inp" maxLength={60} value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="tme-when">
            <div>
              <label className="bd-lbl" htmlFor="tme-date">
                Fecha
              </label>
              <input id="tme-date" type="date" className="bd-inp" value={form.date} onChange={(e) => setForm((f) => changeDate(f, e.target.value))} />
            </div>
            <div>
              <label className="bd-lbl" htmlFor="tme-time">
                Hora
              </label>
              <input id="tme-time" type="time" className="bd-inp" disabled={form.allDay} value={form.allDay ? "" : form.startTime} onChange={(e) => set({ startTime: e.target.value })} />
            </div>
            <div>
              <label className="bd-lbl" htmlFor="tme-duration">
                Duración (min)
              </label>
              <input
                id="tme-duration"
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                className="bd-inp"
                disabled={form.allDay}
                value={form.allDay ? "" : form.duration}
                onChange={(e) => set({ duration: e.target.value })}
              />
            </div>
          </div>
          <label className="tme-check">
            <input type="checkbox" checked={form.allDay} onChange={(e) => set({ allDay: e.target.checked })} />
            Todo el día
          </label>
          <fieldset className="tme-field">
            <legend className="bd-lbl">Se repite</legend>
            <div className="tme-days">
              {DAY_LETTERS.map((letter, day) => (
                <button key={DAY_NAMES[day]} type="button" aria-label={DAY_NAMES[day]} aria-pressed={days.includes(day)} onClick={() => setForm((f) => toggleDay(f, day))}>
                  {letter}
                </button>
              ))}
            </div>
          </fieldset>
          {days.length > 0 && (
            <div className="tme-until">
              <label className="bd-lbl" htmlFor="tme-until">
                Hasta (opcional)
              </label>
              <input id="tme-until" type="date" className="bd-inp" min={form.date} value={form.until} onChange={(e) => set({ until: e.target.value })} />
            </div>
          )}
          <div>
            <label className="bd-lbl" htmlFor="tme-notes">
              Nota para los atletas (opcional)
            </label>
            <input id="tme-notes" className="bd-inp" maxLength={500} aria-describedby="tme-notes-hint" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            <p id="tme-notes-hint" className="bd-hint">
              La ven todos los atletas del equipo. No escribas datos de salud.
            </p>
          </div>
          <footer className="tme-footer">
            <button type="submit" className="bd-btn bd-btn-p" disabled={save.isPending}>
              {save.isPending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar evento"}
            </button>
            <button type="button" className="bd-btn" onClick={onClose}>
              Cancelar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
