import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TeamCyclesService } from "../team-cycles/team-cycles.service";

// Cuántos atletas trae la lista de equipos para el apilado de avatares.
const PREVIEW_MEMBERS = 5;

// Equipos del coach (CYC-309, docs/diseno/equipos). Todo es del coach dueño: un equipo de otro
// coach responde 404 (no se revela que existe) y solo se agregan atletas que el coach ya tiene
// (relación activa o pendiente). Quitar un atleta o eliminar un equipo no borra nada del atleta.
@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamCycles: TeamCyclesService,
  ) {}

  private async ownedTeam(coachId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, coachId } });
    if (!team) throw new NotFoundException("Equipo no encontrado.");
    return team;
  }

  // Dos equipos del mismo coach no se llaman igual (sin distinguir mayúsculas).
  private async assertNameFree(coachId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.team.findFirst({
      where: { coachId, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (clash) throw new ConflictException("Ya tienes un equipo con ese nombre.");
  }

  // Atletas que el coach ya tiene (relación activa o pendiente, nunca terminada).
  private async assertOwnAthletes(coachId: string, athleteIds: string[]) {
    const ids = [...new Set(athleteIds)];
    const found = await this.prisma.coachAthlete.count({ where: { coachId, athleteId: { in: ids }, status: { in: ["active", "pending"] } } });
    if (found !== ids.length) throw new BadRequestException("Uno o más atletas no están en tu lista.");
    return ids;
  }

  async list(coachId: string) {
    const teams = await this.prisma.team.findMany({
      where: { coachId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true } },
        members: { take: PREVIEW_MEMBERS, orderBy: { createdAt: "asc" }, include: { athlete: { select: { id: true, name: true } } } },
      },
    });
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      memberCount: t._count.members,
      members: t.members.map((m) => ({ id: m.athlete.id, name: m.athlete.name })),
    }));
  }

  // Detalle con los atletas, su estado de invitación y su ciclo vigente (el que contiene hoy).
  async detail(coachId: string, teamId: string) {
    const team = await this.ownedTeam(coachId, teamId);
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
      include: { athlete: { select: { id: true, name: true, email: true } } },
    });
    const athleteIds = members.map((m) => m.athleteId);
    const [relations, cycles] = await Promise.all([
      this.prisma.coachAthlete.findMany({ where: { coachId, athleteId: { in: athleteIds } }, select: { athleteId: true, status: true } }),
      this.prisma.trainingCycle.findMany({
        where: { coachId, athleteId: { in: athleteIds }, isTemplate: false, status: "active", startDate: { lte: new Date() }, endDate: { gte: startOfToday() } },
        orderBy: { startDate: "desc" },
        select: { id: true, athleteId: true, name: true, startDate: true, endDate: true },
      }),
    ]);
    const statusOf = new Map(relations.map((r) => [r.athleteId, r.status]));
    const cycleOf = new Map<string, (typeof cycles)[number]>();
    for (const c of cycles) if (c.athleteId && !cycleOf.has(c.athleteId)) cycleOf.set(c.athleteId, c);
    return {
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
      athletes: members.map((m) => {
        const cycle = cycleOf.get(m.athleteId);
        return {
          id: m.athlete.id,
          name: m.athlete.name,
          email: m.athlete.email,
          // pending: invitación sin aceptar; active: ya está en Cycles.
          status: statusOf.get(m.athleteId) ?? "inactive",
          currentCycle: cycle ? { id: cycle.id, name: cycle.name, startDate: cycle.startDate, endDate: cycle.endDate } : null,
          addedAt: m.createdAt,
        };
      }),
    };
  }

  async create(coachId: string, name: string, athleteIds: string[] | undefined) {
    await this.assertNameFree(coachId, name);
    const ids = athleteIds?.length ? await this.assertOwnAthletes(coachId, athleteIds) : [];
    const team = await this.prisma.team.create({
      data: { coachId, name, members: { create: ids.map((athleteId) => ({ athleteId })) } },
    });
    return this.detail(coachId, team.id);
  }

  async rename(coachId: string, teamId: string, name: string) {
    await this.ownedTeam(coachId, teamId);
    await this.assertNameFree(coachId, name, teamId);
    await this.prisma.team.update({ where: { id: teamId }, data: { name } });
    return this.detail(coachId, teamId);
  }

  // Borra el equipo y sus filas de TeamMember (en cascada); los atletas no se tocan.
  async remove(coachId: string, teamId: string, today?: string) {
    await this.ownedTeam(coachId, teamId);
    // Antes de borrar: se quitan las sesiones futuras de sus ciclos de equipo (misma regla que al sacar a alguien).
    await this.teamCycles.releaseTeam(teamId, today);
    await this.prisma.team.delete({ where: { id: teamId } });
  }

  // Agregar es idempotente: quien ya está en el equipo se ignora.
  async addMembers(coachId: string, teamId: string, athleteIds: string[]) {
    await this.ownedTeam(coachId, teamId);
    const ids = await this.assertOwnAthletes(coachId, athleteIds);
    await this.prisma.teamMember.createMany({ data: ids.map((athleteId) => ({ teamId, athleteId })), skipDuplicates: true });
    // Si hay ciclos del equipo vigentes o futuros, la web pregunta si se les asignan.
    return { ...(await this.detail(coachId, teamId)), pendingTeamCycles: await this.teamCycles.pendingFor(teamId) };
  }

  async removeMember(coachId: string, teamId: string, athleteId: string, today?: string) {
    await this.ownedTeam(coachId, teamId);
    if (!(await this.prisma.teamMember.findUnique({ where: { teamId_athleteId: { teamId, athleteId } } }))) {
      throw new NotFoundException("Ese atleta no está en el equipo.");
    }
    await this.teamCycles.releaseMember(teamId, athleteId, today);
    const { count } = await this.prisma.teamMember.deleteMany({ where: { teamId, athleteId } });
    if (count === 0) throw new NotFoundException("Ese atleta no está en el equipo.");
  }

  // Los equipos de cada atleta del coach, para las etiquetas y los filtros de la lista de Atletas.
  async teamsByAthlete(coachId: string): Promise<Map<string, { id: string; name: string }[]>> {
    const rows = await this.prisma.teamMember.findMany({
      where: { team: { coachId } },
      orderBy: { team: { name: "asc" } },
      select: { athleteId: true, team: { select: { id: true, name: true } } },
    });
    const map = new Map<string, { id: string; name: string }[]>();
    for (const r of rows) map.set(r.athleteId, [...(map.get(r.athleteId) ?? []), r.team]);
    return map;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
