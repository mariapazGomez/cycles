import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Exercise, ExerciseLog, SessionExercise } from '@cycles/shared';
import type { ShareData } from '../utils/shareSession';

export type TabParamList = {
  Calendar: undefined;
  Today: undefined;
  Summary: undefined;
  Assistant: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ExerciseLog: {
    sessionExercise: SessionExercise & { exercise: Exercise; logs: ExerciseLog[] };
  };
  SessionDetail: { sessionId: string };
  Notifications: undefined;
  Account: undefined;
  SessionFeedback: {
    sessionId: string;
    startedAt?: string | null;
    // Lo que el atleta ya registró: de aquí se deduce el resultado.
    doneSets: number;
    plannedSets: number;
    doneExercises: number;
    totalExercises: number;
    // Para ofrecer «Compartir» en el cierre de la primera sesión.
    share?: ShareData;
  };
  ShareSession: ShareData;
};
