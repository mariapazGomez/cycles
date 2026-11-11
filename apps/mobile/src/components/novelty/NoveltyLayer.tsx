import React, { useEffect, useState } from 'react';
import { noveltyKey, pendingNovelty, visibleSlides } from '@cycles/shared';
import { useAuth } from '../../store/AuthContext';
import { useTour } from '../../store/TourContext';
import { NoveltyDialog } from './NoveltyDialog';
import { canShowNovelty, NOVELTY_DELAY_MS, NOVELTY_VIEWER } from '../../utils/novelty';

// Muestra la novedad más reciente sin ver, 1,5 s después de cargar y solo cuando no estorba.
// Cerrarla (saltar, la X o llegar al final) la marca como vista en la cuenta.
export function NoveltyLayer({ route }: { route: string | undefined }) {
  const { user, status, welcome, markNewsSeen } = useAuth();
  const tour = useTour();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  const novelty = status === 'signedIn' && user?.role === 'athlete' ? pendingNovelty(user.tourNewsSeen, NOVELTY_VIEWER) : null;
  const tourPending = user?.tourStatus === 'pending' || tour?.visible === true;
  const allowed = novelty !== null && canShowNovelty({ route, tourPending, welcome });

  useEffect(() => {
    if (!allowed || open) {
      setReady(false);
      return undefined;
    }
    const id = setTimeout(() => setReady(true), NOVELTY_DELAY_MS);
    return () => clearTimeout(id);
  }, [allowed, open]);

  useEffect(() => {
    if (ready && allowed) {
      setOpen(true);
    }
  }, [ready, allowed]);

  if (!open || !novelty) {
    return null;
  }
  const slides = visibleSlides(novelty, {});
  const close = () => {
    setOpen(false);
    markNewsSeen(noveltyKey(novelty));
  };
  return <NoveltyDialog novelty={novelty} slides={slides} onClose={close} />;
}
