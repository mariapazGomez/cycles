import type { User } from "@cycles/shared";

export const QUESTIONS_PATH = "/register/preguntas";

// ¿Hay que llevarla a sus preguntas? Solo las del registro: la encuesta a cuentas anteriores va
// aparte. «Mi cuenta» queda libre, para poder descargar los datos o eliminar la cuenta sin responder.
export function needsCoachQuestions(user: Pick<User, "coachSurvey"> | null | undefined, pathname: string): boolean {
  return user?.coachSurvey === "register" && pathname !== QUESTIONS_PATH && pathname !== "/account";
}

// La encuesta a cuentas anteriores se muestra encima de la app, salvo en «Mi cuenta».
export function showsSurvey(user: Pick<User, "coachSurvey" | "needsPolicyAcceptance"> | null | undefined, pathname: string): boolean {
  return user?.coachSurvey === "survey" && !user.needsPolicyAcceptance && pathname !== "/account";
}

// Con preguntas pendientes no salen la guía ni las novedades. Al terminar la encuesta, las novedades
// esperan a la próxima carga de la app, para no encadenar ventanas.
let surveyJustFinished = false;
export const finishSurvey = () => {
  surveyJustFinished = true;
};
export const noveltiesWait = (user: Pick<User, "coachSurvey"> | null | undefined) => Boolean(user?.coachSurvey) || surveyJustFinished;
