import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as sessionsApi from "../services/sessionsApi";
import { ApiError } from "../services/httpClient";

export const NOTE_MAX_LENGTH = 500;

// Lo que ve el atleta: la nota del coach para un ejercicio (CYC-62). Texto libre que
// puede hablar de salud: se muestra solo en las pantallas del atleta y del coach de
// esa sesión, y no viaja en los avisos.
export function CoachNote({ note }: { note: string | null | undefined }) {
  if (!note) return null;
  return (
    <p className="ex-note">
      <strong>Nota de tu coach</strong>
      {note}
    </p>
  );
}

interface EditorProps {
  sessionExerciseId: string;
  note: string | null | undefined;
  onSaved: () => void;
}

// Lo que ve y edita el coach en la sesión de su atleta (CYC-61): una nota por ejercicio.
export function ExerciseNoteEditor({ sessionExerciseId, note, onSaved }: EditorProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => sessionsApi.updateExercise(sessionExerciseId, { note: text.trim() }),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      onSaved();
    },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : "No se pudo guardar la nota."),
  });

  function open() {
    setText(note ?? "");
    setError(null);
    setEditing(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  if (!editing) {
    return (
      <div className="ex-note-row">
        {note && (
          <p className="ex-note">
            <strong>Nota para el atleta</strong>
            {note}
          </p>
        )}
        <button type="button" className="link-button" onClick={open}>
          {note ? "Editar nota" : "Agregar nota"}
        </button>
      </div>
    );
  }

  return (
    <form className="ex-note-form" onSubmit={submit} noValidate>
      <label htmlFor={`nota-${sessionExerciseId}`} className="rt-label">
        Nota para el atleta
      </label>
      <textarea
        id={`nota-${sessionExerciseId}`}
        className="rt-input"
        rows={3}
        maxLength={NOTE_MAX_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <span className="ex-note-count">
        {text.length}/{NOTE_MAX_LENGTH}
      </span>
      {error && <div className="error-banner">{error}</div>}
      <div className="ex-note-actions">
        <button type="submit" className="button-primary" disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar nota"}
        </button>
        <button type="button" className="button-secondary" onClick={() => setEditing(false)} disabled={save.isPending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
