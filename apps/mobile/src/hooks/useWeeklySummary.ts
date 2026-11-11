import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { WeeklySummary } from '@cycles/shared';
import { fetchWeeklySummary } from '../services/executionApi';

// El resumen de la semana para la tarjeta de Hoy (CYC-256). Es un extra: si la petición falla
// no se muestra nada y Hoy se ve como siempre. Se vuelve a pedir al volver a Hoy.
export function useWeeklySummary(today: string) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  const load = useCallback(async () => {
    try {
      setSummary(await fetchWeeklySummary(today));
    } catch {
      setSummary(null);
    }
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { summary, reload: load };
}
