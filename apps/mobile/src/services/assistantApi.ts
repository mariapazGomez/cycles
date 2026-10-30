export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

// Datos del ciclo activo con los que el asistente puede responder.
export interface CycleContext {
  name: string;
  week: number;
  weeks: number;
  done: number;
  total: number;
}

export const QUICK_QUESTIONS = {
  cycle: 'Cómo va mi ciclo',
  mood: 'Cómo me siento',
  effort: 'Qué tan duro fue',
} as const;

// DEMO: el agente aún no existe ni está planeado. Estas respuestas son
// simuladas, salvo los números del ciclo, que vienen de los datos reales.
// Esta función es el único punto que cambiaría al conectar un agente.
export async function sendToAssistant(history: ChatMessage[], cycle: CycleContext | null): Promise<string> {
  await new Promise<void>(resolve => setTimeout(resolve, 1000));
  const last = [...history].reverse().find(m => m.role === 'user')?.text ?? '';

  if (last === QUICK_QUESTIONS.cycle) {
    if (!cycle) {
      return 'Aún no tienes un ciclo activo. Cuando tu coach te asigne uno, aquí podré contarte cómo vas.';
    }
    const pct = cycle.total ? Math.round((cycle.done / cycle.total) * 100) : 0;
    return `Estás en la semana ${cycle.week} de ${cycle.weeks} de «${cycle.name}». Llevas ${cycle.done} de ${cycle.total} sesiones hechas, un ${pct} %.`;
  }
  if (last === QUICK_QUESTIONS.mood) {
    return 'Ejemplo de demo: antes de entrenar dijiste que te sentías con energía media, y al terminar te sentiste mejor. Pronto podrás contarme cómo llegas y cómo sales de cada sesión.';
  }
  if (last === QUICK_QUESTIONS.effort) {
    return 'Ejemplo de demo: tu última sesión la marcaste en 7 de 10. Es un esfuerzo exigente pero sostenible. Si pasa de 8 varias veces seguidas, conviene avisarle a tu coach.';
  }
  return 'Por ahora solo puedo hablar de tu ciclo actual, de cómo te sientes antes y después de entrenar y de tu nivel de esfuerzo. Prueba con uno de los atajos.';
}
