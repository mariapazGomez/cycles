import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { noveltyKey, pendingNovelty, visibleSlides, type Novelty } from "@cycles/shared";
import { useAuth } from "../../hooks/useAuth";
import { useTour } from "../../hooks/useTour";
import { useNoveltyConditions } from "../../hooks/useNoveltyConditions";
import * as tourApi from "../../services/tourApi";
import { anyModalOpen, canShowNovelty, NOVELTY_DELAY_MS } from "../../lib/novelty";
import { NoveltyDialog } from "./NoveltyDialog";

// Muestra la novedad más reciente que la persona aún no vio, 1,5 s después de cargar y
// solo si no hay un diálogo, la guía de primer uso ni un borrador abierto. Cerrarla de
// cualquier forma la marca como vista en la cuenta.
export function NoveltyLayer() {
  const { user, refreshCurrentUser } = useAuth();
  const { pathname } = useLocation();
  const tour = useTour();
  const pending = user?.tourNewsSeen ? pendingNovelty(user.tourNewsSeen, { role: user.role, platform: "web" }) : null;
  const { ready, conditions } = useNoveltyConditions(Boolean(pending));
  const [shown, setShown] = useState<Novelty | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const seen = useMutation({
    mutationFn: async (key: string) => {
      await tourApi.markNewsSeen(key);
      await refreshCurrentUser();
    },
  });

  const key = pending ? noveltyKey(pending) : null;
  // Con la guía pendiente se espera a saber si está en curso antes de decidir.
  const tourUnknown = user?.role === "coach" && user.tourStatus === "pending" && !tour.ready;
  const blocked = tourUnknown || !canShowNovelty({ pathname, tourActive: tour.active, modalOpen: false });
  useEffect(() => {
    if (!pending || !key || !ready || blocked || dismissed === key || shown) return;
    const timer = window.setTimeout(() => {
      if (!anyModalOpen()) setShown(pending);
    }, NOVELTY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pending, key, ready, blocked, dismissed, shown]);

  if (!shown) return null;
  const slides = visibleSlides(shown, conditions);
  if (slides.length === 0) return null;
  return (
    <NoveltyDialog
      novelty={shown}
      slides={slides}
      onClose={() => {
        const k = noveltyKey(shown);
        setDismissed(k);
        setShown(null);
        seen.mutate(k);
      }}
    />
  );
}
