import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import * as tourApi from "../../services/tourApi";
import { track } from "../../lib/analytics";
import { AthleteSteps } from "./GuidePanel";

// Tarjeta descartable en Hoy para quien entra por el navegador: las tres
// explicaciones de su app, una sola vez. Se reabre desde «Cómo usar Cycles».
export function AthleteTourCard() {
  const { user, refreshCurrentUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (user?.role !== "athlete" || user.tourStatus !== "pending") return null;

  async function dismiss(status: "skipped" | "completed") {
    setBusy(true);
    try {
      track(status === "completed" ? "tour_completed" : "tour_skipped", { role: "athlete" });
      await tourApi.setTourStatus(status);
      await refreshCurrentUser();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tour-card tour-card-athlete" aria-label="Cómo usar Cycles">
      <div className="tour-card-head">
        <h2>Así se usa Cycles</h2>
      </div>
      <AthleteSteps />
      <div className="tour-card-actions">
        <button type="button" className="button-primary tour-cta" disabled={busy} onClick={() => void dismiss("completed")}>
          Entendido
        </button>
        <button type="button" className="tour-link" disabled={busy} onClick={() => void dismiss("skipped")}>
          No quiero la guía
        </button>
      </div>
    </section>
  );
}
