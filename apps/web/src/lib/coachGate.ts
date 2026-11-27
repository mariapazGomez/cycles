import type { User } from "@cycles/shared";

export const QUESTIONS_PATH = "/register/preguntas";

// ¿Hay que llevarla a sus preguntas? Solo las del registro: la encuesta a cuentas anteriores va
// aparte. «Mi cuenta» queda libre, para poder descargar los datos o eliminar la cuenta sin responder.
export function needsCoachQuestions(user: Pick<User, "coachSurvey"> | null | undefined, pathname: string): boolean {
  return user?.coachSurvey === "register" && pathname !== QUESTIONS_PATH && pathname !== "/account";
}
