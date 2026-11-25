import { CoachNote } from "../ExerciseNote";
import { loadLabel } from "../../lib/rmLoad";
import type { TodayResponse } from "../../services/executionApi";

// Los ejercicios de la sesión de hoy, con su carga y la nota del coach.
export function ExerciseList({ exercises }: { exercises: TodayResponse["session"]["sessionExercises"] }) {
  return (
    <ul className="today-list">
      {exercises.map((se) => (
        <li key={se.id}>
          <div className="today-ex">
            <div>{se.exercise.name}</div>
            <CoachNote note={se.note} />
          </div>
          <span>
            {se.targetSets} × {se.targetReps} · {loadLabel(se)}
          </span>
        </li>
      ))}
    </ul>
  );
}
