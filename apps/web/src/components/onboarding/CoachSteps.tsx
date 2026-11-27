import { useState } from "react";
import { emptyAnswers, FINAL_STEP, progressOf, QUESTIONS, surveyProgressOf, toggle, type Answers, type QuestionId } from "../../lib/coachQuestions";
import logo from "../../assets/logo-cycles.png";
import * as coachProfileApi from "../../services/coachProfileApi";
import { ApiError } from "../../services/httpClient";
import { OnboardingCard, type useStepTransition } from "./OnboardingCard";
import { ProfileCard } from "./ProfileCard";
import { QuestionStep, USE_NOTICE } from "./QuestionStep";
import type { ReactNode } from "react";

const SAVE_ERROR = "No pudimos guardar tu respuesta. Revisa tu conexión y toca «Siguiente» otra vez.";

const WHY = "Mejoramos la plataforma de forma continua y queremos que cada cambio responda a cómo entrenas. Por eso te pedimos responder 7 preguntas, una sola vez.";

// Lo que cambia entre el registro y la encuesta a cuentas anteriores.
const TEXTS = {
  register: { done: "Tu cuenta está lista", doneText: "Ahora te mostramos cómo se arma un ciclo.", enter: "Entrar a Cycles", percent: progressOf },
  survey: { done: "Gracias por ayudarnos", doneText: "Con tus respuestas seguimos mejorando Cycles.", enter: "Volver a Cycles", percent: surveyProgressOf },
} as const;

export interface Saved {
  answers?: Answers;
  otherTexts?: Partial<Record<QuestionId, string>>;
}

// La bienvenida (solo en la encuesta: es el paso 0), las preguntas del coach y el final. Cada respuesta se guarda al avanzar; «Atrás» conserva lo
// elegido. El paso lo lleva quien lo usa, para que la tarjeta no se rearme al pasar desde la cuenta.
export function CoachSteps({
  step,
  transition,
  saved,
  links,
  entering,
  onEnter,
  variant = "register",
}: {
  step: number;
  transition: ReturnType<typeof useStepTransition>;
  saved?: Saved;
  links?: ReactNode;
  entering: boolean;
  onEnter: () => void;
  variant?: "register" | "survey";
}) {
  const [answers, setAnswers] = useState<Answers>(() => ({ ...emptyAnswers(), ...saved?.answers }));
  const [others, setOthers] = useState<Partial<Record<QuestionId, string>>>(() => ({ ...saved?.otherTexts }));
  const [fresh, setFresh] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const survey = variant === "survey";
  const texts = TEXTS[variant];
  const percent = texts.percent(step);
  const welcome = survey && step === 0;
  const question = !welcome && step < FINAL_STEP ? QUESTIONS[step - 1] : null;
  const values = question ? answers[question.id] : [];

  async function next() {
    if (!question || values.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await coachProfileApi.saveAnswer(question.id, values, others[question.id]?.trim() || undefined);
      setFresh(null);
      await transition.go(step + 1, 1);
    } catch (cause) {
      // Con 400 el problema es la respuesta, no la conexión.
      setError(cause instanceof ApiError && cause.status === 400 ? cause.message : SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  function back() {
    setError(null);
    setFresh(null);
    void transition.go(step - 1, -1);
  }

  return (
    <OnboardingCard
      stage={
        welcome ? (
          <div className="ob-stage ob-brand">
            <img src={logo} alt="Cycles" width={140} />
          </div>
        ) : (
          <ProfileCard answers={answers} current={question ? step : 0} fresh={fresh} final={!question} />
        )
      }
      percent={percent}
      step={step}
      transition={transition}
      announce={question ? `Pregunta ${step} de ${QUESTIONS.length}, ${percent} %` : welcome ? "" : `${texts.done}, 100 %`}
      links={links}
      overlay={survey}
    >
      {welcome ? (
        <>
          <div className="ob-body">
            <h1 id="ob-survey-title" tabIndex={-1}>
              Ayúdanos a mejorar Cycles
            </h1>
            <p className="ob-why">{WHY}</p>
            <p className="ob-use">{USE_NOTICE}</p>
          </div>
          <div className="ob-foot">
            <button type="button" className="ob-next ob-full" data-autofocus onClick={() => void transition.go(1, 1)}>
              Empezar
            </button>
          </div>
        </>
      ) : question ? (
        <>
          <div className="ob-body">
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            <QuestionStep
              key={question.id}
              question={question}
              values={values}
              other={others[question.id] ?? ""}
              notice={!survey && step === 1}
              onToggle={(key) => {
                const list = toggle(question, values, key);
                setAnswers((a) => ({ ...a, [question.id]: list }));
                setFresh(list.includes(key) ? `${question.id}:${key}` : null);
              }}
              onOther={(text) => setOthers((o) => ({ ...o, [question.id]: text }))}
            />
          </div>
          <div className="ob-foot">
            {(survey || step > 1) && (
              <button type="button" className="ob-back" disabled={saving} onClick={back}>
                Atrás
              </button>
            )}
            <button type="button" className="ob-next" disabled={values.length === 0 || saving} onClick={() => void next()}>
              {saving ? "Guardando…" : step === QUESTIONS.length ? "Terminar" : "Siguiente"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="ob-body ob-done">
            <h1 tabIndex={-1}>{texts.done}</h1>
            <p>{texts.doneText}</p>
          </div>
          <div className="ob-foot">
            <button type="button" className="ob-next ob-full" disabled={entering} onClick={onEnter}>
              {texts.enter}
            </button>
          </div>
        </>
      )}
    </OnboardingCard>
  );
}
