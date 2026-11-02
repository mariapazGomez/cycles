import type { SelfRole } from "../services/authApi";

const OPTIONS: { value: SelfRole; title: string; text: string }[] = [
  { value: "coach", title: "Soy coach", text: "Planifico y sigo a mis atletas." },
  { value: "athlete", title: "Soy atleta", text: "Entreno con el plan de mi coach." },
];

// Elección de rol al crear la cuenta. Un atleta que se registra solo espera a que
// un coach lo invite con el mismo correo.
export function RoleChoice({ value, onChange }: { value: SelfRole; onChange: (role: SelfRole) => void }) {
  return (
    <div className="role-choice" role="radiogroup" aria-label="¿Cómo vas a usar Cycles?">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`role-choice-option${value === option.value ? " is-selected" : ""}`}
          onClick={() => onChange(option.value)}>
          <strong>{option.title}</strong>
          <span>{option.text}</span>
        </button>
      ))}
    </div>
  );
}
