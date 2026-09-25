import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoutineDto } from "./dto/create-routine.dto";
import { UpdateRoutineDto } from "./dto/update-routine.dto";
import { RoutineExerciseInputDto } from "./dto/routine-exercise-input.dto";

const ROUTINE_INCLUDE = {
  routineExercises: {
    include: { exercise: true },
    orderBy: { orderIndex: "asc" as const },
  },
};

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(coachId: string, dto: CreateRoutineDto) {
    await this.assertExercisesAvailable(coachId, dto.exercises);

    return this.prisma.routine.create({
      data: {
        coachId,
        name: dto.name,
        routineExercises: { create: this.toRoutineExerciseRows(dto.exercises) },
      },
      include: ROUTINE_INCLUDE,
    });
  }

  async list(coachId: string) {
    return this.prisma.routine.findMany({
      where: { coachId },
      orderBy: { createdAt: "desc" },
      include: ROUTINE_INCLUDE,
    });
  }

  async getOne(coachId: string, id: string) {
    return this.getForCoach(id, coachId);
  }

  async update(coachId: string, id: string, dto: UpdateRoutineDto) {
    await this.getForCoach(id, coachId);
    if (dto.exercises) {
      await this.assertExercisesAvailable(coachId, dto.exercises);
    }

    if (!dto.exercises) {
      return this.prisma.routine.update({
        where: { id },
        data: { ...(dto.name !== undefined ? { name: dto.name } : {}) },
        include: ROUTINE_INCLUDE,
      });
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.routineExercise.deleteMany({ where: { routineId: id } }),
      this.prisma.routine.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          routineExercises: { create: this.toRoutineExerciseRows(dto.exercises) },
        },
        include: ROUTINE_INCLUDE,
      }),
    ]);

    return updated;
  }

  async remove(coachId: string, id: string): Promise<void> {
    await this.getForCoach(id, coachId);
    await this.prisma.$transaction([
      this.prisma.routineExercise.deleteMany({ where: { routineId: id } }),
      this.prisma.routine.delete({ where: { id } }),
    ]);
  }

  private toRoutineExerciseRows(exercises: RoutineExerciseInputDto[]) {
    return exercises.map((ex, index) => ({
      exerciseId: ex.exerciseId,
      orderIndex: index + 1,
      defaultSets: ex.defaultSets,
      defaultReps: ex.defaultReps,
      defaultWeight: ex.defaultWeight,
      defaultRestSeconds: ex.defaultRestSeconds,
      defaultRir: ex.defaultRir,
    }));
  }

  private async getForCoach(id: string, coachId: string) {
    const routine = await this.prisma.routine.findUnique({
      where: { id },
      include: ROUTINE_INCLUDE,
    });
    if (!routine) {
      throw new NotFoundException("Rutina no encontrada.");
    }
    if (routine.coachId !== coachId) {
      throw new ForbiddenException("No eres el dueño de esta rutina.");
    }
    return routine;
  }

  private async assertExercisesAvailable(
    coachId: string,
    exercises: RoutineExerciseInputDto[],
  ): Promise<void> {
    const ids = exercises.map((e) => e.exerciseId);
    const found = await this.prisma.exercise.findMany({ where: { id: { in: ids } } });
    const byId = new Map(found.map((e) => [e.id, e]));
    for (const id of ids) {
      const exercise = byId.get(id);
      const available =
        exercise && exercise.isActive && (exercise.createdBy === null || exercise.createdBy === coachId);
      if (!available) {
        throw new BadRequestException("Uno de los ejercicios elegidos no está disponible.");
      }
    }
  }
}
