import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Vibration } from 'react-native';
import { RestModal } from '../components/RestTimer';
import { clearRest, loadRest, saveRest } from '../services/restTimerStorage';

export const DEFAULT_REST_SECONDS = 90;
const ADJUST_STEP_SECONDS = 15;

interface RestTimerValue {
  // La rutina ya se inició: solo entonces corren las pausas.
  routineStarted: boolean;
  setRoutineStarted: (started: boolean) => void;
  autoRest: boolean;
  setAutoRest: (enabled: boolean) => void;
  // Segundos restantes de la pausa en curso, o null si no hay ninguna.
  remaining: number | null;
  total: number;
  startRest: (seconds?: number) => void;
  adjust: (deltaSeconds: number) => void;
  skip: () => void;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
}

const RestTimerContext = createContext<RestTimerValue | null>(null);

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [routineStarted, setRoutineStarted] = useState(false);
  const [autoRest, setAutoRest] = useState(true);
  // El fin de la pausa se guarda como marca de tiempo, no como contador que
  // decrementa: así la app en segundo plano no se desfasa.
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(DEFAULT_REST_SECONDS);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const finished = useRef(false);

  // Al abrir la app, retoma la pausa que quedó corriendo (si sigue vigente),
  // minimizada para no tapar la pantalla. Si terminó mientras estaba cerrada
  // se descarta sin vibrar.
  useEffect(() => {
    let cancelled = false;
    loadRest().then(rest => {
      if (cancelled || !rest) {
        return;
      }
      finished.current = false;
      setNow(Date.now());
      setTotal(rest.total);
      setEndsAt(rest.endsAt);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cada cambio de la pausa se guarda; al terminar o saltarla se borra.
  useEffect(() => {
    if (endsAt === null) {
      clearRest();
    } else {
      saveRest({ endsAt, total });
    }
  }, [endsAt, total]);

  useEffect(() => {
    if (endsAt === null) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = endsAt === null ? null : Math.max(0, Math.ceil((endsAt - now) / 1000));

  useEffect(() => {
    if (endsAt !== null && remaining === 0 && !finished.current) {
      finished.current = true;
      Vibration.vibrate([0, 400, 150, 400]);
      setEndsAt(null);
      setExpanded(false);
    }
  }, [endsAt, remaining]);

  const startRest = useCallback(
    (seconds: number = DEFAULT_REST_SECONDS) => {
      if (!routineStarted || !autoRest) {
        return;
      }
      finished.current = false;
      const start = Date.now();
      setNow(start);
      setTotal(seconds);
      setEndsAt(start + seconds * 1000);
      setExpanded(true);
    },
    [routineStarted, autoRest],
  );

  const adjust = useCallback(
    (deltaSeconds: number) => {
      if (endsAt === null) {
        return;
      }
      const current = Date.now();
      const nextEnd = Math.max(current + 1000, endsAt + deltaSeconds * 1000);
      setNow(current);
      setEndsAt(nextEnd);
      setTotal(prev => Math.max(prev, Math.ceil((nextEnd - current) / 1000)));
    },
    [endsAt],
  );

  const skip = useCallback(() => {
    finished.current = true;
    setEndsAt(null);
    setExpanded(false);
  }, []);

  const value = useMemo(
    () => ({
      routineStarted,
      setRoutineStarted,
      autoRest,
      setAutoRest,
      remaining,
      total,
      startRest,
      adjust,
      skip,
      expanded,
      setExpanded,
    }),
    [routineStarted, autoRest, remaining, total, startRest, adjust, skip, expanded],
  );

  return (
    <RestTimerContext.Provider value={value}>
      {children}
      <RestModal />
    </RestTimerContext.Provider>
  );
}

export function useRestTimer(): RestTimerValue {
  const ctx = useContext(RestTimerContext);
  if (!ctx) {
    throw new Error('useRestTimer debe usarse dentro de RestTimerProvider');
  }
  return ctx;
}

export { ADJUST_STEP_SECONDS };
