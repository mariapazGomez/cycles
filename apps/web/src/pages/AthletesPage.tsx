import { AthletesPanel } from "../components/AthletesPanel";
import { usePageBackground } from "../hooks/usePageBackground";

export function AthletesPage() {
  usePageBackground();
  return <AthletesPanel />;
}
