import { extraMembers, initialsOf } from "../../lib/teams";

// Apilado de avatares de la tarjeta de un equipo: los primeros atletas y «+7» con el resto.
export function TeamAvatars({ members, total }: { members: { id: string; name: string }[]; total: number }) {
  const extra = extraMembers(total, members.length);
  return (
    <div className="tm-stack" aria-hidden="true">
      {members.map((m) => (
        <span key={m.id} className="hm-avatar hm-avatar-sm">
          {initialsOf(m.name)}
        </span>
      ))}
      {extra > 0 && <span className="hm-avatar hm-avatar-sm tm-more">+{extra}</span>}
    </div>
  );
}
