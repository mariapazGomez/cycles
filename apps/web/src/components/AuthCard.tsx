import { ReactNode } from "react";
import logo from "../assets/logo-cycles.png";
import patternA from "../assets/patterns/proteina-a.svg";
import patternB from "../assets/patterns/proteina-b.svg";
import patternC from "../assets/patterns/proteina-c.svg";

// Fondo de cadenas de proteína (motivo de marca, ver docs/brand/identidad-visual.md).
// Cada variante tiene recorridos distintos: "a" para entrar (login, registro,
// invitación), "b" para los pasos de email y contraseña, "c" para estados de
// error o espera.
const PATTERNS = { a: patternA, b: patternB, c: patternC };

interface AuthCardProps {
  title: string;
  subtitle?: string;
  pattern?: keyof typeof PATTERNS;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, pattern = "a", children }: AuthCardProps) {
  return (
    <div className="auth-shell" style={{ backgroundImage: `url(${PATTERNS[pattern]})` }}>
      <div className="auth-card">
        <img className="auth-logo" src={logo} alt="Cycles" width={120} />
        <h1>{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
