-- Nota del coach para el atleta, una por ejercicio (CYC-60): en la rutina
-- (RoutineExercise.note, el valor por defecto) y en la sesión (SessionExercise.note,
-- copiada de la rutina al asignarla y editable por sesión). Texto libre y opcional,
-- máximo 500 caracteres (lo valida la API). Puede mencionar datos de salud
-- («cuida el hombro»): no va en los avisos (R7). Aditiva: las filas existentes
-- quedan sin nota. Ver docs/prds/features/PRD-RutinasYProgramacion.md.
ALTER TABLE "RoutineExercise" ADD COLUMN "note" TEXT;
ALTER TABLE "SessionExercise" ADD COLUMN "note" TEXT;
