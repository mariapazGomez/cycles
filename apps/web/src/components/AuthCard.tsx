import { ReactNode } from "react";
import logo from "../assets/logo-cycles.png";
import { PATTERNS, PatternName } from "../assets/patterns";

interface AuthCardProps {
  title: string;
  pattern?: PatternName;
  children: ReactNode;
}

export function AuthCard({ title, pattern = "a", children }: AuthCardProps) {
  return (
    <div className="auth-shell" style={{ backgroundImage: `url(${PATTERNS[pattern]})` }}>
      <div className="auth-card">
        <img className="auth-logo" src={logo} alt="Cycles" width={120} />
        <h1>{title}</h1>
        {children}
        {/* Anclas normales (no <Link>): son páginas estáticas fuera de la app. */}
        <p className="auth-legal">
          <a href="/privacidad">Privacidad</a>
          <a href="/terminos">Términos</a>
        </p>
      </div>
    </div>
  );
}
