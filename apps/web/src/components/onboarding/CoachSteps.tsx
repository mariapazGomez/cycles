import { useState } from "react";
import { emptyAnswers, FINAL_STEP, progressOf, QUESTIONS, toggle, type Answers, type QuestionId } from "../../lib/coachQuestions";
import * as coachProfileApi from "../../services/coachProfileApi";
import { ApiError } from "../../services/httpClient";
import { OnboardingCard, type useStepTransition } from "./OnboardingCard";
import { ProfileCard } from "./ProfileCard";
import { QuestionStep } from "./QuestionStep";
import type { ReactNode } from "react";

const SAVE_ERROR = "No pudimos guardar tu respuesta. Revisa tu conexión y toca «Siguiente» otra vez.";

export interface Saved {
  answers?: Answers;
  otherTexts?: Partial<Record<QuestionId, string>>;
}

// Las preguntas del coach y el final. Cada respuesta se guarda al avanzar; «Atrás» conserva lo
// elegido. El paso lo lleva quien lo usa, para que la tarjeta no se rearme al pasar desde la cuenta.
export function CoachSteps({
  step,
  transition,
  saved,
  links,
  entering,
  onEnter,
}: {
  step: number;
  transition: ReturnType<typeof useStepTransition>;
  saved?: Saved;
  links?: ReactNode;
  entering: boolean;
  onEnter: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>(() => ({ ...emptyAnswers(), ...saved?.answers }));
  const [others, setOthers] = useState<Partial<Record<QuestionId, string>>>(() => ({ ...saved?.otherTexts }));
  const [fresh, setFresh] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = step < FINAL_STEP ? QUESTIONS[step - 1] : null;
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
      stage={<ProfileCard answers={answers} current={question ? step : 0} fresh={fresh} final={!question} />}
      percent={progressOf(step)}
      step={step}
      transition={transition}
      announce={question ? `Pregunta ${step} de ${QUESTIONS.length}, ${progressOf(step)} %` : "Tu cuenta está lista, 100 %"}
      links={links}
    >
      {question ? (
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
              notice={step === 1}
              onToggle={(key) => {
                const list = toggle(question, values, key);
                setAnswers((a) => ({ ...a, [question.id]: list }));
                setFresh(list.includes(key) ? `${question.id}:${key}` : null);
              }}
              onOther={(text) => setOthers((o) => ({ ...o, [question.id]: text }))}
            />
          </div>
          <div className="ob-foot">
            {step > 1 && (
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
            <h1 tabIndex={-1}>Tu cuenta está lista</h1>
            <p>Ahora te mostramos cómo se arma un ciclo.</p>
          </div>
          <div className="ob-foot">
            <button type="button" className="ob-next ob-full" disabled={entering} onClick={onEnter}>
              Entrar a Cycles
            </button>
          </div>
        </>
      )}
    </OnboardingCard>
  );
}
