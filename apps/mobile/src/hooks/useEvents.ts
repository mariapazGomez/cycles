import { useCallback, useEffect, useState } from 'react';
import type { AthleteEventOccurrence } from '@cycles/shared';
import { fetchEvents } from '../services/eventsApi';

export const EVENTS_ERROR = 'No pudimos cargar tus actividades. Tus sesiones sí están al día.';

// Actividades paralelas en un rango de fechas (CYC-252). El error de las actividades es
// propio: nunca esconde las sesiones del coach (diseño). `reload` repite la petición.
export function useEvents(from: string, to: string) {
  const [events, setEvents] = useState<AthleteEventOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEvents(from, to).then(
      list => {
        if (!cancelled) {
          setEvents(list);
          setLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError(EVENTS_ERROR);
          setLoading(false);
        }
      },
    );
    // Si el rango cambia antes de que llegue la respuesta, se descarta la vieja.
    return () => {
      cancelled = true;
    };
  }, [from, to, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  return { events, loading, error, reload };
}
