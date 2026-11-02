import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Exercise, MuscleGroup } from "@cycles/shared";
import * as exercisesApi from "../services/exercisesApi";
import { ApiError } from "../services/httpClient";
import { MUSCLE_GROUP_LABEL } from "../lib/muscleGroups";
import {
  EMPTY_FORM,
  EQUIPMENT_LABEL,
  EQUIPMENT_OPTIONS,
  GROUP_OPTIONS,
  formFromExercise,
  toggleEquipment,
  validateForm,
  type ExerciseForm,
  type FormErrors,
} from "../lib/exercises";

// Formulario para crear o corregir un ejercicio propio. Se abre dentro de la
// pantalla, sin ventana emergente. Diseño en docs/diseno/crear-ejercicio.
interface FormCardProps {
  editing: Exercise | null;
  // Nombre ya escrito (cuando se crea desde el buscador de una rutina).
  initialName?: string;
  // Versión corta para el editor de rutinas: descripción y video quedan plegados.
  compact?: boolean;
  submitLabel?: string;
  onClose: () => void;
  onSaved: (exercise: Exercise, wasEdit: boolean) => void;
}

// Formulario para crear o corregir un ejercicio propio. Se abre arriba de la
// lista, sin ventana emergente. Diseño en docs/diseno/crear-ejercicio.
export function ExerciseFormCard({ editing, initialName, compact, submitLabel, onClose, onSaved }: FormCardProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ExerciseForm>(() =>
    editing ? formFromExercise(editing) : { ...EMPTY_FORM, name: initialName ?? "" },
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => nameRef.current?.focus(), []);
  // El aviso del servidor va arriba del formulario: se acerca para que se vea.
  useEffect(() => {
    if (serverError) noticeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [serverError]);

  const save = useMutation({
    mutationFn: (): Promise<Exercise> => {
      const input = {
        name: form.name.trim(),
        muscleGroup: form.muscleGroup as MuscleGroup,
        equipment: form.equipment,
        description: form.description.trim() || (editing ? null : undefined),
        videoUrl: form.videoUrl.trim() || (editing ? null : undefined),
      };
      return editing ? exercisesApi.updateExercise(editing.id, input) : exercisesApi.createExercise(input);
    },
    onSuccess: (exercise) => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      onSaved(exercise, Boolean(editing));
    },
    onError: (error: unknown) => {
      setServerError(error instanceof ApiError ? error.message : "No se pudo guardar el ejercicio. Intenta de nuevo.");
    },
  });

  function submit(event?: FormEvent) {
    event?.preventDefault();
    setServerError(null);
    const found = validateForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  function set<K extends keyof ExerciseForm>(key: K, value: ExerciseForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  const bodyweight = form.equipment.includes("bodyweight");
  const Wrapper = compact ? "div" : "form";

  const optionalFields = (
    <>
      <div className="ex-field">
        <label className="ex-label" htmlFor="exDescription">
          Descripción <span className="ex-optional">(opcional)</span>
        </label>
        <textarea
          id="exDescription"
          className="ex-input ex-textarea"
          rows={3}
          maxLength={2000}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div className="ex-field">
        <label className="ex-label" htmlFor="exVideo">
          Enlace del video <span className="ex-optional">(opcional)</span>
        </label>
        <input
          id="exVideo"
          type="url"
          inputMode="url"
          className={errors.videoUrl ? "ex-input ex-input-error" : "ex-input"}
          placeholder="https://"
          value={form.videoUrl}
          aria-invalid={Boolean(errors.videoUrl)}
          onChange={(e) => set("videoUrl", e.target.value)}
        />
        {errors.videoUrl && (
          <p className="ex-error" role="alert">
            {errors.videoUrl}
          </p>
        )}
      </div>
    </>
  );

  return (
    <Wrapper
      className="ex-card ex-form"
      aria-label={editing ? "Corregir ejercicio" : "Nuevo ejercicio"}
      {...(compact
        ? {
            role: "group",
            // Dentro del editor de rutinas ya hay un formulario: se evita anidar otro.
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
              if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") submit(event);
            },
          }
        : { onSubmit: submit, noValidate: true })}
    >
      <h2 className="section-title">{editing ? "Corregir ejercicio" : "Nuevo ejercicio"}</h2>

      {serverError && (
        <div ref={noticeRef} className="ex-notice ex-notice-warn" role="alert">
          {serverError}
        </div>
      )}

      <div className="ex-field">
        <label className="ex-label" htmlFor="exName">
          Nombre
        </label>
        <input
          id="exName"
          ref={nameRef}
          className={errors.name ? "ex-input ex-input-error" : "ex-input"}
          value={form.name}
          maxLength={120}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "exNameError" : undefined}
          onChange={(e) => set("name", e.target.value)}
        />
        {errors.name && (
          <p id="exNameError" className="ex-error" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="ex-field">
        <span className="ex-label" id="exGroupLabel">
          Grupo muscular
        </span>
        <div className="ex-chips" role="radiogroup" aria-labelledby="exGroupLabel">
          {GROUP_OPTIONS.map((group) => (
            <button
              key={group}
              type="button"
              role="radio"
              aria-checked={form.muscleGroup === group}
              className="ex-chip"
              onClick={() => set("muscleGroup", group)}
            >
              {MUSCLE_GROUP_LABEL[group]}
            </button>
          ))}
        </div>
        {errors.muscleGroup && (
          <p className="ex-error" role="alert">
            {errors.muscleGroup}
          </p>
        )}
      </div>

      <div className="ex-field">
        <span className="ex-label" id="exEquipLabel">
          Implementos
        </span>
        <div className="ex-chips" role="group" aria-labelledby="exEquipLabel">
          {EQUIPMENT_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="ex-chip"
              aria-pressed={form.equipment.includes(item)}
              onClick={() => set("equipment", toggleEquipment(form.equipment, item))}
            >
              {EQUIPMENT_LABEL[item]}
            </button>
          ))}
          <span className="ex-sep" aria-hidden="true" />
          <button
            type="button"
            className="ex-chip ex-chip-solo"
            aria-pressed={bodyweight}
            onClick={() => set("equipment", toggleEquipment(form.equipment, "bodyweight"))}
          >
            {EQUIPMENT_LABEL.bodyweight}
          </button>
        </div>
        <p className="ex-help">Elige todo lo que necesita, o «Peso corporal» si no usa nada.</p>
        {errors.equipment && (
          <p className="ex-error" role="alert">
            {errors.equipment}
          </p>
        )}
      </div>

      {compact ? (
        <details className="ex-more" open={errors.videoUrl ? true : undefined}>
          <summary>Descripción y video (opcional)</summary>
          <div className="ex-more-body">{optionalFields}</div>
        </details>
      ) : (
        optionalFields
      )}

      <div className="ex-actions">
        <button
          type={compact ? "button" : "submit"}
          className="button-primary rt-cta"
          disabled={save.isPending}
          onClick={compact ? () => submit() : undefined}
        >
          {save.isPending ? "Guardando…" : (submitLabel ?? (editing ? "Guardar cambios" : "Guardar ejercicio"))}
        </button>
        <button type="button" className="button-secondary rt-cta" onClick={onClose} disabled={save.isPending}>
          Cancelar
        </button>
      </div>
    </Wrapper>
  );
}

