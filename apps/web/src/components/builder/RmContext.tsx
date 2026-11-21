import { createContext, useContext } from "react";

// Lo que el constructor necesita saber del RM (CYC-312). En la sesión de una persona: su nombre y
// qué ejercicios tienen RM, para desactivar «% del RM» donde falta. En la rutina no hay contexto:
// el % está siempre disponible porque la rutina es para todos.
export interface RmContextValue {
  athleteId: string;
  athleteName: string;
  hasRm: (exerciseId: string) => boolean;
  // RM vigente en kg (para la vista previa de una rutina).
  rmKg: (exerciseId: string) => number | null;
  // Vista previa en una rutina: el % sigue disponible para todos y solo se muestra el peso de esa persona.
  preview?: boolean;
}

export const RmContext = createContext<RmContextValue | null>(null);

export function useRmContext(): RmContextValue | null {
  return useContext(RmContext);
}
