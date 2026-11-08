import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { AthleteEventOccurrence } from '@cycles/shared';
import { fetchEvents } from '../services/eventsApi';
import { fetchNotifications, markNotificationRead } from '../services/notificationsApi';
import { coachNotice, type CoachNotice } from '../utils/coachNotice';
import { groupByDay } from '../utils/eventCalendar';

// Lo que Hoy muestra además de la sesión (CYC-256): el aviso del coach y las actividades
// del día. Son extras: si alguna petición falla no se muestra nada y no se rompe Hoy.
export function useTodayExtras(today: string) {
  const [notice, setNotice] = useState<CoachNotice | null>(null);
  const [events, setEvents] = useState<AthleteEventOccurrence[]>([]);

  const load = useCallback(async () => {
    const [notifications, todayEvents] = await Promise.allSettled([fetchNotifications(), fetchEvents(today, today)]);
    setNotice(notifications.status === 'fulfilled' ? coachNotice(notifications.value) : null);
    setEvents(todayEvents.status === 'fulfilled' ? (groupByDay(todayEvents.value)[today] ?? []) : []);
  }, [today]);

  // Al volver a Hoy se vuelve a pedir; si cambia el día (la app abierta pasada la medianoche),
  // `load` cambia y se pide de nuevo.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Abrir el aviso lo da por leído: desaparece de Hoy y la campana pierde su punto.
  const dismiss = useCallback(async (current: CoachNotice) => {
    setNotice(null);
    await Promise.allSettled(current.ids.map(id => markNotificationRead(id)));
  }, []);

  return { notice, events, dismiss };
}
