import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { cleanNote } from "../common/exercise-note";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoutineDto } from "./dto/create-routine.dto";
import { UpdateRoutineDto } from "./dto/update-routine.dto";
import { RoutineExerciseInputDto } from "./dto/routine-exercise-input.dto";
import { RoutineBlockInputDto } from "./dto/routine-block-input.dto";
import { cleanBlocks } from "../common/work-blocks";
import { Prisma } from "@prisma/client";

const ROUTINE_INCLUDE = {
  blocks: { orderBy: { orderIndex: "asc" as const } },
  routineExercises: {
    include: { exercise: true },
    orderBy: { orderIndex: "asc" as const },
  },
};

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(coachId: string, dto: CreateRoutineDto) {
    const blocks = dto.blocks ?? [];
    const loose = dto.exercises ?? [];
    const cleaned = cleanBlocks(blocks, loose.length);
    await this.assertStructureUsable(coachId, blocks, loose);

    return this.prisma.$transaction(async (tx) => {
      const routine = await tx.routine.create({ data: { coachId, name: dto.name } });
      await this.writeStructure(tx, routine.id, [], cleaned, blocks, loose);
      return tx.routine.findUniqueOrThrow({ where: { id: routine.id }, include: ROUTINE_INCLUDE });
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
    const current = await this.getForCoach(id, coachId);
    const replacesStructure = dto.exercises !== undefined || dto.blocks !== undefined;

    if (!replacesStructure) {
      return this.prisma.routine.update({
        where: { id },
        data: { ...(dto.name !== undefined ? { name: dto.name } : {}) },
        include: ROUTINE_INCLUDE,
      });
    }

    const blocks = dto.blocks ?? [];
    const loose = dto.exercises ?? [];
    const cleaned = cleanBlocks(blocks, loose.length);
    await this.assertStructureUsable(coachId, blocks, loose);

    return this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined) await tx.routine.update({ where: { id }, data: { name: dto.name } });
      await this.writeStructure(tx, id, current.blocks, cleaned, blocks, loose);
      return tx.routine.findUniqueOrThrow({ where: { id }, include: ROUTINE_INCLUDE });
    });
  }

  async remove(coachId: string, id: string): Promise<void> {
    await this.getForCoach(id, coachId);
    await this.prisma.$transaction([
      this.prisma.routineExercise.deleteMany({ where: { routineId: id } }),
      this.prisma.routineBlock.deleteMany({ where: { routineId: id } }),
      this.prisma.routine.delete({ where: { id } }),
    ]);
  }

  private toExerciseRow(ex: RoutineExerciseInputDto, orderIndex: number, blockId: string | null) {
    return {
      exerciseId: ex.exerciseId,
      orderIndex,
      defaultSets: ex.defaultSets,
      defaultReps: ex.defaultReps,
      defaultWeight: ex.defaultWeight,
      defaultRestSeconds: ex.defaultRestSeconds,
      defaultRir: ex.defaultRir,
      note: cleanNote(ex.note) ?? null,
      blockId,
    };
  }

  // Reemplaza la estructura completa: los bloques con id conservan el suyo (y tienen que ser
  // de esta rutina), los demás se crean; los que no vienen se borran. Los ejercicios se
  // reescriben en orden: primero los de cada bloque, después los sueltos.
  private async writeStructure(
    tx: Prisma.TransactionClient,
    routineId: string,
    existing: Array<{ id: string }>,
    cleaned: ReturnType<typeof cleanBlocks>,
    blocks: RoutineBlockInputDto[],
    loose: RoutineExerciseInputDto[],
  ) {
    const existingIds = new Set(existing.map((b) => b.id));
    for (const b of cleaned) {
      if (b.id && !existingIds.has(b.id)) throw new BadRequestException("Uno de los bloques no es de esta rutina.");
    }
    const keep = new Set(cleaned.map((b) => b.id).filter((x): x is string => Boolean(x)));

    await tx.routineExercise.deleteMany({ where: { routineId } });
    await tx.routineBlock.deleteMany({ where: { routineId, id: { notIn: [...keep] } } });

    const rows: ReturnType<RoutinesService["toExerciseRow"]>[] = [];
    let order = 0;
    for (const [index, b] of cleaned.entries()) {
      const data = { name: b.name, type: b.type, color: b.color, note: b.note, orderIndex: index + 1 };
      const saved = b.id
        ? await tx.routineBlock.update({ where: { id: b.id }, data })
        : await tx.routineBlock.create({ data: { ...data, routineId } });
      for (const ex of blocks[index].exercises) rows.push(this.toExerciseRow(ex, ++order, saved.id));
    }
    for (const ex of loose) rows.push(this.toExerciseRow(ex, ++order, null));
    await tx.routineExercise.createMany({ data: rows.map((row) => ({ ...row, routineId })) });
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

  // Hace falta al menos un ejercicio y todos deben estar disponibles para este coach.
  private async assertStructureUsable(coachId: string, blocks: RoutineBlockInputDto[], loose: RoutineExerciseInputDto[]) {
    const all = [...blocks.flatMap((b) => b.exercises), ...loose];
    if (all.length === 0) throw new BadRequestException("Agrega al menos un ejercicio.");
    const ids = all.map((e) => e.exerciseId);
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
