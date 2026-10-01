import { ReactNode } from "react";
import logo from "../assets/logo-cycles.png";
import { PATTERNS, PatternName } from "../assets/patterns";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  pattern?: PatternName;
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
