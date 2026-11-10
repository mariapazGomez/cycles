import { useState } from "react";
import { noveltiesFor, visibleSlides, type Novelty } from "@cycles/shared";
import { NoveltyDialog } from "../novelty/NoveltyDialog";
import { useNoveltyConditions } from "../../hooks/useNoveltyConditions";
import { formatNoveltyDate } from "../../lib/novelty";
import { useAuth } from "../../hooks/useAuth";
import { useTour } from "../../hooks/useTour";
import { TourDialog } from "./TourDialog";
import { CycleDiagram } from "./TourIntro";

const MANUAL =
  "https://github.com/mariapazGomez/cycles/blob/main/docs/MANUAL-COACH.md";

// «Cómo usar Cycles» de la coach, desde el menú de usuario: sus pasos con su
// estado. La atleta no tiene panel: reabre la guía por marcas (CYC-233).
export function GuidePanel({ onClose }: { onClose: () => void }) {
  return <CoachGuide onClose={onClose} />;
}

function CoachGuide({ onClose }: { onClose: () => void }) {
  const tour = useTour(true);
  const [diagram, setDiagram] = useState(false);
  const [tab, setTab] = useState<"guide" | "news">("guide");
  return (
    <TourDialog title="Cómo usar Cycles" onClose={onClose}>
      <div className="nv-tabs" role="tablist" aria-label="Cómo usar Cycles">
        <button
          type="button"
          role="tab"
          id="guide-tab-guide"
          aria-selected={tab === "guide"}
          aria-controls="guide-panel"
          className="nv-tab"
          onClick={() => setTab("guide")}
        >
          Guía
        </button>
        <button
          type="button"
          role="tab"
          id="guide-tab-news"
          aria-selected={tab === "news"}
          aria-controls="guide-panel"
          className="nv-tab"
          onClick={() => setTab("news")}
        >
          Novedades
        </button>
      </div>
      <div
        id="guide-panel"
        role="tabpanel"
        aria-labelledby={tab === "guide" ? "guide-tab-guide" : "guide-tab-news"}
      >
        {tab === "news" ? (
          <NewsHistory onClose={onClose} />
        ) : (
          <>
            <ol className="tour-steps">
              {tour.progress.steps.map((step) => (
                <li
                  key={step.n}
                  className={
                    step.done ? "tour-step tour-step-done" : "tour-step"
                  }
                >
                  <span className="tour-step-mark" aria-hidden="true">
                    {step.done ? "✓" : step.n}
                  </span>
                  <span className="tour-step-text">
                    {step.title}
                    {step.done && (
                      <span className="tour-step-hecho"> · Hecho</span>
                    )}
                    {step.skipped && (
                      <span className="tour-step-hecho"> · Saltado</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            {diagram && (
              <div className="tour-diagram-wrap">
                <CycleDiagram />
                <p>
                  Un ciclo organiza las semanas de tu atleta. Contiene rutinas,
                  y cada rutina contiene ejercicios.
                </p>
              </div>
            )}
            <div className="tour-dialog-actions">
              <button
                type="button"
                className="button-primary"
                data-autofocus
                disabled={tour.saving}
                onClick={async () => {
                  await tour.reopen();
                  onClose();
                }}
              >
                Volver a ver la guía
              </button>
              <button
                type="button"
                className="button-secondary"
                aria-expanded={diagram}
                onClick={() => setDiagram((v) => !v)}
              >
                Cómo se piensa un ciclo
              </button>
              <a
                className="button-secondary"
                href={MANUAL}
                target="_blank"
                rel="noreferrer"
              >
                Abrir el manual
              </a>
              <button type="button" className="tour-link" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </TourDialog>
  );
}

// Historial de novedades de su rol, con fecha y «Ver de nuevo». Volver a verlas no cambia
// ningún estado.
function NewsHistory({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { conditions } = useNoveltyConditions(true);
  const [replay, setReplay] = useState<Novelty | null>(null);
  const list = noveltiesFor({ role: user?.role, platform: "web" });
  const slides = replay ? visibleSlides(replay, conditions) : [];
  return (
    <>
      {list.length === 0 ? (
        <p>
          Aún no hay novedades. Cuando salga una funcionalidad nueva, la verás
          aquí.
        </p>
      ) : (
        <ul className="nv-history">
          {list.map((n) => (
            <li key={`${n.key}@${n.version}`}>
              <span>
                <strong>{n.name}</strong>
                <span className="nv-history-date">
                  {formatNoveltyDate(n.since)}
                </span>
              </span>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setReplay(n)}
              >
                Ver de nuevo
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="tour-dialog-actions">
        <button type="button" className="tour-link" onClick={onClose}>
          Cerrar
        </button>
      </div>
      {replay && slides.length > 0 && (
        <NoveltyDialog
          novelty={replay}
          slides={slides}
          onClose={() => setReplay(null)}
        />
      )}
    </>
  );
}
