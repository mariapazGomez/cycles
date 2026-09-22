import { Module } from "@nestjs/common";
import { ExercisesController } from "./exercises.controller";
import { ExercisesService } from "./exercises.service";

// Catálogo de ejercicios. El registro de ejecución real (ExerciseLog) es
// Fase 3, no se toca acá.
@Module({
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
