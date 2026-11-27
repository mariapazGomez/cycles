import { useState } from "react";
import type * as teamCyclesApi from "../../../services/teamCyclesApi";
import { dayText, type TeamPlanActions } from "../../../hooks/useTeamPlanActions";
import { editReach, teamWeeks } from "../../../lib/teamCycle";
import { athletesCount } from "../../../lib/teams";
import { Popover } from "../../board/Popover";
import { DayPicker } from "../../board/DayPicker";
import { CopyIcon, DotsIcon, MoveIcon, TrashIcon } from "../../board/icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { TeamSessionDialog } from "./TeamSessionDialog";

type TeamSession = teamCyclesApi.TeamSession;

export interface SessionTarget {
  cycle: teamCyclesApi.TeamCycleDetail;
  session: TeamSession;
  anchor: HTMLElement;
  // Para abrir directo en el selector de días.
  start?: "duplicate";
}

export function SessionMenuButton({ session, open, disabled, onOpen }: { session: TeamSession; open: boolean; disabled: boolean; onOpen: (anchor: HTMLElement) => void }) {
  return (
    <button
      type="button"
      className="bd-mn"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Acciones de ${session.name}, ${dayText(session.scheduledDate.slice(0, 10))}`}
      disabled={disabled}
      onClick={(e) => onOpen(e.currentTarget)}
    >
      <DotsIcon />
    </button>
  );
}

// El menú «⋯» de una sesión del equipo y lo que abre (editar, mover, duplicar y quitar), igual en
// la pizarra de Ciclos y en el Calendario.
export function TeamSessionActions({
  target,
  today,
  actions,
  onClose,
  onView,
  inPanel = false,
  onRemoved,
}: {
  target: SessionTarget | null;
  today: string;
  actions: TeamPlanActions;
  onClose: () => void;
  // En el Calendario, «Ver y editar» abre el panel lateral en vez del cuadro.
  onView?: (target: SessionTarget) => void;
  // Dentro del panel: sin la opción de editar, porque ya se está en él.
  inPanel?: boolean;
  onRemoved?: () => void;
}) {
  const [picked, setStep] = useState<"move" | "duplicate" | null>(null);
  const step = picked ?? target?.start ?? "menu";
  const [editing, setEditing] = useState<SessionTarget | null>(null);
  const [removing, setRemoving] = useState<SessionTarget | null>(null);
  const nameOf = (cycle: teamCyclesApi.TeamCycleDetail) => (athleteId: string) => cycle.athletes.find((a) => a.athleteId === athleteId)?.name ?? "un atleta";

  const close = () => {
    setStep(null);
    onClose();
  };
  // Una sesión de un día pasado no se mueve: su historia ya es la de cada atleta.
  const origin = target?.session.scheduledDate.slice(0, 10) ?? "";
  const movable = origin >= today;
  // Mover y duplicar ofrecen los días de su mismo ciclo.
  const days = target
    ? teamWeeks(target.cycle, [], today)
        .map((w) => ({ week: w.week, days: w.days.filter((d) => d.state === "ok" && (step !== "move" || d.iso !== origin)).map((d) => d.iso) }))
        .filter((w) => w.days.length > 0)
    : [];

  return (
    <>
      {target && (
        <Popover anchor={target.anchor} label={`Acciones de ${target.session.name}`} onClose={close}>
          {step === "menu" ? (
            <div className="bd-mlist">
              {!inPanel && (
                <button
                  type="button"
                  onClick={() => {
                    if (onView) onView(target);
                    else setEditing(target);
                    close();
                  }}
                >
                  {onView ? "Ver y editar" : "Editar ejercicios"}
                </button>
              )}
              <button type="button" disabled={!movable} onClick={() => setStep("move")}>
                <MoveIcon /> Mover a otro día…
              </button>
              <button type="button" onClick={() => setStep("duplicate")}>
                <CopyIcon /> Duplicar en otro día…
              </button>
              <button
                type="button"
                className="bd-danger"
                onClick={() => {
                  setRemoving(target);
                  close();
                }}
              >
                <TrashIcon /> Quitar de este día
              </button>
              {!movable && <p className="bd-hint">Es de un día pasado: no se mueve. Puedes duplicarla.</p>}
            </div>
          ) : (
            <DayPicker
              label={step === "move" ? `Mover «${target.session.name}» al…` : `Duplicar «${target.session.name}» el…`}
              confirmLabel={step === "move" ? "Mover" : "Duplicar"}
              options={days}
              onPick={(iso) => {
                const session = target.session;
                const moving = step === "move";
                close();
                if (moving) actions.move(session, iso);
                else actions.duplicate(session, iso);
              }}
              onCancel={close}
            />
          )}
        </Popover>
      )}

      {editing && (
        <TeamSessionDialog
          session={editing.session}
          today={today}
          nameOf={nameOf(editing.cycle)}
          onClose={() => setEditing(null)}
          onSave={(next, previous) => {
            const id = editing.session.id;
            setEditing(null);
            actions.saveStructure(id, next, previous);
          }}
        />
      )}

      {removing && (
        <ConfirmDialog
          title={`Quitar «${removing.session.name}» del ${dayText(removing.session.scheduledDate.slice(0, 10))}`}
          confirmLabel="Quitar de este día"
          busyLabel="Quitando…"
          busy={actions.busy}
          error={null}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            const { session } = removing;
            setRemoving(null);
            actions.remove(session);
            onRemoved?.();
          }}
        >
          <p>
            Se quita a {athletesCount(editReach(removing.session, today, nameOf(removing.cycle)).reach)}. Lo registrado y lo que ajustaste para alguien se conserva. No se puede deshacer.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
