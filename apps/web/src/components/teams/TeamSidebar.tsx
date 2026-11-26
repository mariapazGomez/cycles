import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { TeamSummary } from "../../services/teamsApi";
import { initialOf, teamColor } from "../../lib/teams";

export type TeamTool = "calendario" | "ciclos";

const ICON: Record<string, JSX.Element> = {
  calendario: <path d="M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1zM4 10h16M8 3.5V7M16 3.5V7" />,
  ciclos: <path d="M18.5 8A7 7 0 006 9.5M5.5 16A7 7 0 0018 14.5M19 4v4.5h-4.5M5 20v-4.5h4.5" />,
};

function ToolIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[name]}
    </svg>
  );
}

// Solo las herramientas que ya existen: Eventos y Rankings se agregan aquí con CYC-319.
const TOOLS: { id: TeamTool; label: string }[] = [
  { id: "calendario", label: "Calendario" },
  { id: "ciclos", label: "Ciclos" },
];

// Sidebar de Equipos (CYC-318): contraer, selector del equipo y herramientas. En pantalla
// angosta el selector queda arriba y las herramientas pasan a pestañas.
export function TeamSidebar({
  teams,
  teamId,
  tool,
  collapsed,
  onToggle,
  onPickTeam,
  onCreate,
}: {
  teams: TeamSummary[];
  teamId: string | null;
  tool: TeamTool;
  collapsed: boolean;
  onToggle: () => void;
  onPickTeam: (id: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = teams.find((t) => t.id === teamId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <aside className={collapsed ? "tms-side tms-side-col" : "tms-side"} aria-label="Equipo y herramientas">
      <button type="button" className="tms-collapse" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expandir el panel" : "Contraer el panel"}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M10 5v14" />
        </svg>
      </button>

      <div className="tms-select" ref={ref}>
        <button
          type="button"
          className="tms-current"
          aria-haspopup="menu"
          aria-expanded={open}
          title={current?.name ?? "Sin equipos"}
          aria-label={current ? `Equipo: ${current.name}. Cambiar de equipo` : "Sin equipos"}
          onClick={() => setOpen((v) => !v)}
        >
          {current ? (
            <>
              <span className="tms-badge" style={{ background: teamColor(current.name) }} aria-hidden="true">
                {initialOf(current.name)}
              </span>
              <span className="tms-label">{current.name}</span>
            </>
          ) : (
            <span className="tms-label tms-muted">Sin equipos</span>
          )}
          <span className="tms-chev" aria-hidden="true">
            ⌄
          </span>
        </button>
        {open && (
          <div className="tms-menu" role="menu">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={t.id === teamId}
                className="tms-option"
                onClick={() => {
                  setOpen(false);
                  onPickTeam(t.id);
                }}
              >
                <span className="tms-badge" style={{ background: teamColor(t.name) }} aria-hidden="true">
                  {initialOf(t.name)}
                </span>
                <span className="tms-opt-name">{t.name}</span>
                <span className="tms-opt-count" aria-label={`${t.memberCount} atletas`}>
                  {t.memberCount}
                </span>
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              className="tms-option tms-create"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
            >
              <span aria-hidden="true">+</span> Crear equipo
            </button>
          </div>
        )}
      </div>

      <p className="tms-heading">Herramientas</p>
      <nav className="tms-tools" aria-label="Herramientas del equipo">
        {TOOLS.map((t) => {
          const active = t.id === tool && current != null;
          const content = (
            <>
              <ToolIcon name={t.id} />
              <span className="tms-label">{t.label}</span>
            </>
          );
          return current ? (
            <Link key={t.id} to={`/equipos/${current.id}/${t.id}`} className={active ? "tms-tool tms-tool-on" : "tms-tool"} aria-current={active ? "page" : undefined} title={t.label}>
              {content}
            </Link>
          ) : (
            <span key={t.id} className="tms-tool tms-tool-off" aria-disabled="true" title={t.label}>
              {content}
            </span>
          );
        })}
      </nav>
    </aside>
  );
}
