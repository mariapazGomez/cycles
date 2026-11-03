-- CYC-196 B: un ejercicio puede trabajar más grupos además del principal.
-- Aditiva: la columna nueva queda vacía y el grupo actual sigue siendo el principal.
ALTER TABLE "Exercise" ADD COLUMN "secondaryMuscleGroups" "MuscleGroup"[] DEFAULT ARRAY[]::"MuscleGroup"[];
