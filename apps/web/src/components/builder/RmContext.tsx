import { createContext, useContext } from "react";

// Lo que el constructor necesita saber del RM (CYC-312). En la sesión de una persona: su nombre y
// qué ejercicios tienen RM, para desactivar «% del RM» donde falta. En la rutina no hay contexto:
// el % está siempre disponible porque la rutina es para todos.
export interface RmContextValue {
  athleteId: string;
  athleteName: string;
  hasRm: (exerciseId: string) => boolean;
}

export const RmContext = createContext<RmContextValue | null>(null);

export function useRmContext(): RmContextValue | null {
  return useContext(RmContext);
}
