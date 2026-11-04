import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, SessionEnded } from "./api";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; error: ApiError | Error }
  | { status: "ok"; data: T };

// Carga un recurso y lo vuelve a pedir cuando cambia `key`. Si la sesión de
// Access terminó, avisa para que el portal muestre «Tu sesión terminó».
export function useLoad<T>(load: () => Promise<T>, key: string, onSessionEnded: () => void) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const endedRef = useRef(onSessionEnded);
  endedRef.current = onSessionEnded;

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadRef
      .current()
      .then((data) => !cancelled && setState({ status: "ok", data }))
      .catch((error: Error) => {
        if (cancelled) return;
        if (error instanceof SessionEnded) endedRef.current();
        else setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { state, reload };
}
