import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Equipment } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { CreateExerciseDto } from "./dto/create-exercise.dto";
import { UpdateExerciseDto } from "./dto/update-exercise.dto";

// Para comparar nombres: sin tildes, mayúsculas ni espacios de más.
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

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
    const name = dto.name.trim();
    this.assertEquipment(dto.equipment);
    await this.assertNameFree(coachId, name);
    return this.prisma.exercise.create({
      data: { ...dto, name, createdBy: coachId },
    });
  }

  // Corrige un ejercicio propio activo. Los cambios llegan a las rutinas que
  // lo usan; las sesiones ya armadas conservan su copia de objetivos.
  async update(coachId: string, exerciseId: string, dto: UpdateExerciseDto) {
    const exercise = await this.ownExercise(coachId, exerciseId, "editar");
    const data: UpdateExerciseDto = { ...dto };
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      if (normalizeName(data.name) !== normalizeName(exercise.name)) {
        await this.assertNameFree(coachId, data.name, exerciseId);
      }
    }
    if (dto.equipment !== undefined) {
      this.assertEquipment(dto.equipment);
    }
    return this.prisma.exercise.update({ where: { id: exerciseId }, data });
  }

  async deactivate(coachId: string, exerciseId: string) {
    await this.ownExercise(coachId, exerciseId, "desactivar");
    return this.prisma.exercise.update({
      where: { id: exerciseId },
      data: { isActive: false },
    });
  }

  private async ownExercise(coachId: string, exerciseId: string, verb: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException("Ejercicio no encontrado.");
    }
    if (exercise.createdBy !== coachId) {
      throw new ForbiddenException(`Solo puedes ${verb} ejercicios que creaste tú.`);
    }
    return exercise;
  }

  // «Peso corporal» significa que no usa nada: no se combina con otros.
  private assertEquipment(equipment: Equipment[]) {
    if (equipment.includes(Equipment.bodyweight) && equipment.length > 1) {
      throw new BadRequestException("«Peso corporal» no se combina con otros implementos.");
    }
  }

  // El nombre no puede repetir uno del catálogo ni uno propio que siga activo.
  private async assertNameFree(coachId: string, name: string, exceptId?: string) {
    const taken = await this.prisma.exercise.findMany({
      where: { isActive: true, OR: [{ createdBy: null }, { createdBy: coachId }] },
      select: { id: true, name: true, createdBy: true },
    });
    const wanted = normalizeName(name);
    const clash = taken.find((e) => e.id !== exceptId && normalizeName(e.name) === wanted);
    if (!clash) {
      return;
    }
    throw new ConflictException(
      clash.createdBy
        ? `Ya tienes un ejercicio llamado «${clash.name}». Búscalo en la lista y úsalo en tu rutina.`
        : `El catálogo de Cycles ya tiene «${clash.name}». Búscalo en la lista y úsalo en tu rutina.`,
    );
  }
}
