import { useMemo, useState } from "react";
import type { AthleteRelation } from "../../services/athletesApi";
import { initialsOf, matchesAthlete } from "../../lib/teams";

// Lista de atletas con búsqueda y casillas reales (CYC-310). Solo aparecen los que el coach ya
// tiene; se invita desde Atletas. La etiqueta gris dice en qué otro equipo ya está, o si la
// invitación sigue pendiente. El contador «3 elegidos» se anuncia al cambiar.
export function AthletePicker({
  athletes,
  selected,
  onToggle,
  excludeTeamId,
}: {
  athletes: AthleteRelation[];
  selected: Set<string>;
  onToggle: (athleteId: string) => void;
  // En «Agregar atletas» de un equipo: la etiqueta no repite el equipo actual.
  excludeTeamId?: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => athletes.filter((r) => matchesAthlete(r.athlete, query)), [athletes, query]);

  return (
    <div className="tm-picker">
      <label className="bd-lbl" htmlFor="tm-search">
        Buscar atleta
      </label>
      <input id="tm-search" type="search" className="bd-inp" placeholder="Buscar por nombre o email" value={query} onChange={(e) => setQuery(e.target.value)} />
      <p className="tm-count" role="status" aria-live="polite">
        {selected.size} {selected.size === 1 ? "elegido" : "elegidos"}
      </p>
      {athletes.length === 0 ? (
        <p className="rm-note">Todavía no tienes atletas. Invítalos desde Atletas y vuelve aquí.</p>
      ) : visible.length === 0 ? (
        <p className="rm-note">Ningún atleta coincide con tu búsqueda.</p>
      ) : (
        <ul className="tm-list">
          {visible.map((r) => {
            const otherTeams = (r.teams ?? []).filter((t) => t.id !== excludeTeamId);
            const checked = selected.has(r.athlete.id);
            return (
              <li key={r.athlete.id} className={checked ? "tm-row tm-row-on" : "tm-row"}>
                <label>
                  <input type="checkbox" aria-label={`Incluir a ${r.athlete.name}`} checked={checked} onChange={() => onToggle(r.athlete.id)} />
                  <span className="hm-avatar hm-avatar-sm" aria-hidden="true">
                    {initialsOf(r.athlete.name)}
                  </span>
                  <span className="tm-name">{r.athlete.name}</span>
                  {r.status === "pending" && <span className="tm-tag">Invitación pendiente</span>}
                  {r.status !== "pending" && otherTeams.length > 0 && <span className="tm-tag">{otherTeams.map((t) => t.name).join(", ")}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
