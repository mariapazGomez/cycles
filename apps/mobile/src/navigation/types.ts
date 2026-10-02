import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Exercise, ExerciseLog, SessionExercise } from '@cycles/shared';

export type TabParamList = {
  Calendar: undefined;
  Today: undefined;
  Summary: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ExerciseLog: {
    sessionExercise: SessionExercise & { exercise: Exercise; logs: ExerciseLog[] };
  };
  SessionFeedback: {
    sessionId: string;
    startedAt?: string | null;
    // Lo que el atleta ya registró: de aquí se deduce el resultado.
    doneSets: number;
    plannedSets: number;
    doneExercises: number;
    totalExercises: number;
  };
};
