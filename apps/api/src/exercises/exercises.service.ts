import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreateExerciseDto } from "./dto/create-exercise.dto";

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  // Catálogo global + (si es coach) sus propios ejercicios. Un atleta solo
  // ve el catálogo global — no crea ni tiene ejercicios propios.
  async list(currentUser: AuthenticatedUser) {
    return this.prisma.exercise.findMany({
      where: {
        isActive: true,
        OR: [
          { createdBy: null },
          ...(currentUser.role === "coach" ? [{ createdBy: currentUser.id }] : []),
        ],
      },
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
    });
  }

  async create(coachId: string, dto: CreateExerciseDto) {
    return this.prisma.exercise.create({
      data: { ...dto, createdBy: coachId },
    });
  }

  async deactivate(coachId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException("Ejercicio no encontrado.");
    }
    if (exercise.createdBy !== coachId) {
      throw new ForbiddenException("Solo podés desactivar ejercicios que vos creaste.");
    }

    return this.prisma.exercise.update({
      where: { id: exerciseId },
      data: { isActive: false },
    });
  }
}
