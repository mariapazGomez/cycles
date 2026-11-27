import { profileTags, QUESTIONS, type Answers } from "../../lib/coachQuestions";

// «Tu perfil de coach»: se llena con cada respuesta. En el teléfono muestra solo las filas
// respondidas y la actual.
export function ProfileCard({ answers, current, fresh, final }: { answers: Answers; current: number; fresh: string | null; final?: boolean }) {
  return (
    <div className="ob-stage">
      <div className={`ob-prof${final ? " ob-prof-final" : ""}`}>
        <h2>Tu perfil de coach</h2>
        <dl>
          {QUESTIONS.map((question, i) => {
            const { shown, more } = profileTags(question, answers[question.id]);
            return (
              <div key={question.id} className={`ob-row${shown.length > 0 ? " ob-has" : ""}${current === i + 1 ? " ob-cur" : ""}`}>
                <dt>{question.row}</dt>
                <dd>
                  {shown.length === 0 && <span className="ob-hole" aria-hidden="true" />}
                  {shown.map((option) => (
                    <span key={option.key} className={`ob-tag${fresh === `${question.id}:${option.key}` ? " ob-new" : ""}`}>
                      {option.emoji && <em aria-hidden="true">{option.emoji} </em>}
                      {option.short ?? option.label}
                    </span>
                  ))}
                  {more > 0 && <span className="ob-tag">+{more}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
