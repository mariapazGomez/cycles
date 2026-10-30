-- Implementos de cada ejercicio (lista cerrada). Aditiva: los ejercicios que ya
-- existen quedan con la lista vacía hasta que se revisen.
CREATE TYPE "Equipment" AS ENUM ('barbell', 'plates', 'dumbbells', 'kettlebell', 'bench', 'rack', 'cable', 'machine', 'band', 'pullup_bar', 'dip_bars', 'suspension', 'medicine_ball', 'box', 'bodyweight');

ALTER TABLE "Exercise" ADD COLUMN "equipment" "Equipment"[] DEFAULT ARRAY[]::"Equipment"[];
