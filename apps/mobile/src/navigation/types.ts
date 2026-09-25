import type { Exercise, ExerciseLog, SessionExercise } from '@cycles/shared';

export type AppStackParamList = {
  Today: undefined;
  ExerciseLog: {
    sessionExercise: SessionExercise & { exercise: Exercise; logs: ExerciseLog[] };
  };
  SessionFeedback: {
    sessionId: string;
    startedAt?: string;
  };
};
