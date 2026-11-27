import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as teamCyclesApi from "../../services/teamCyclesApi";
import { ApiError } from "../../services/httpClient";
import { canPickColor, colorOf, colorUser, TEAM_CYCLE_COLORS } from "../../lib/teamColors";
import { shortDate } from "../../lib/eventCalendar";
import { Popover } from "../board/Popover";

type Cycle = teamCyclesApi.TeamCycleSummary;

// «del 21 dic al 31 ene 2027»: la fecha no se muestra, pero los lectores de pantalla la oyen.
const cycleDates = (c: Cycle) => `del ${shortDate(c.startDate.slice(0, 10))} al ${shortDate(c.endDate.slice(0, 10))} ${c.endDate.slice(0, 4)}`;

// El nombre de un ciclo en el encabezado del calendario, sobre su color. Con dos o más ciclos abre
// el menú de color; con uno solo lleva a Ciclos.
export function CycleName({ cycle, cycles, onView, onError }: { cycle: Cycle; cycles: Cycle[]; onView: () => void; onError: (message: string | null) => void }) {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const picker = canPickColor(cycle, cycles);
  const color = colorOf(cycle);
  const menuRef = useRef<HTMLDivElement>(null);

  // El foco entra al menú en el color elegido. Un cuadro después: antes el menú aún no se ve.
  useEffect(() => {
    if (!anchor) return;
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [anchor]);

  // Se guarda al elegir; la barra y el nombre cambian juntos y, si falla, vuelven al anterior.
  const paint = (key: string | null | undefined) =>
    queryClient.setQueriesData<Cycle[]>({ queryKey: ["team-cycles", "of"] }, (list) => list?.map((c) => (c.id === cycle.id ? { ...c, color: key } : c)));
  const save = useMutation({
    mutationFn: (key: string) => teamCyclesApi.setTeamCycleColor(cycle.id, key),
    onMutate: (key) => {
      onError(null);
      const previous = cycle.color;
      paint(key);
      return { previous };
    },
    onError: (error, _key, context) => {
      paint(context?.previous);
      onError(error instanceof ApiError ? error.message : "No se pudo cambiar el color.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["team-cycles"] }),
  });

  function arrows(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  }

  return (
    <>
      <button
        type="button"
        className="tcx-name"
        style={{ "--tcx-color": color.value } as CSSProperties}
        aria-label={`Ciclo ${cycle.name}, ${cycleDates(cycle)}`}
        {...(picker ? { "aria-haspopup": "menu" as const, "aria-expanded": anchor !== null } : {})}
        title={cycle.name}
        onClick={(e) => (picker ? setAnchor(anchor ? null : e.currentTarget) : onView())}
      >
        <span>{cycle.name}</span>
        {picker && <i aria-hidden="true">⌄</i>}
      </button>
      {anchor && (
        <Popover anchor={anchor} label={`Opciones del ciclo ${cycle.name}`} width={260} onClose={() => setAnchor(null)}>
          <div ref={menuRef} className="tcx-colors" role="menu" aria-label="Color de la barra" onKeyDown={arrows}>
            <p>Color de la barra</p>
            {TEAM_CYCLE_COLORS.map((option) => {
              const chosen = option.key === color.key;
              const other = colorUser(cycles, option.key, cycle.id);
              return (
                <button
                  key={option.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={chosen}
                  disabled={save.isPending}
                  onClick={() => {
                    setAnchor(null);
                    if (!chosen) save.mutate(option.key);
                  }}
                >
                  <i aria-hidden="true" style={{ background: option.value }} />
                  <span>
                    {option.name}
                    {other && <small>Lo usa «{other}»</small>}
                  </span>
                  <b aria-hidden="true">{chosen ? "✓" : ""}</b>
                </button>
              );
            })}
            <button
              type="button"
              role="menuitem"
              className="tcx-colors-view"
              onClick={() => {
                setAnchor(null);
                onView();
              }}
            >
              Ver ciclo
            </button>
          </div>
        </Popover>
      )}
    </>
  );
}
