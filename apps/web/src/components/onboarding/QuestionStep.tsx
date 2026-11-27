import { useState } from "react";
import { isBlocked, MAX_OTHER_LENGTH, OTHER, searchSports, type Option, type Question } from "../../lib/coachQuestions";

// El aviso de uso va en la primera pregunta.
export const USE_NOTICE = "Con estas respuestas adaptamos Cycles a tu forma de entrenar, te ofrecemos lo que te sirva y preparamos mejor nuestras conversaciones contigo.";

export function QuestionStep({
  question,
  values,
  other,
  onToggle,
  onOther,
  notice,
}: {
  question: Question;
  values: string[];
  other: string;
  onToggle: (key: string) => void;
  onOther: (text: string) => void;
  notice: boolean;
}) {
  const [search, setSearch] = useState("");

  const button = (option: Option) => {
    const on = values.includes(option.key);
    return (
      <button
        key={option.key}
        type="button"
        className={`ob-opt${question.single ? " ob-radio" : ""}${on ? " ob-on" : ""}`}
        aria-pressed={on}
        disabled={isBlocked(question, values, option.key)}
        onClick={() => onToggle(option.key)}
      >
        <i aria-hidden="true" />
        {option.emoji && (
          <em className="ob-emo" aria-hidden="true">
            {option.emoji}
          </em>
        )}
        <span>{option.label}</span>
      </button>
    );
  };

  const otherInput = values.includes(OTHER) && question.otherPlaceholder && (
    <input className="ob-txt" maxLength={MAX_OTHER_LENGTH} placeholder={question.otherPlaceholder} aria-label={question.otherPlaceholder} value={other} onChange={(e) => onOther(e.target.value)} />
  );

  return (
    <>
      <h1 tabIndex={-1}>{question.title}</h1>
      {question.id === "sports" ? (
        <>
          <input className="ob-txt ob-search" type="search" autoComplete="off" placeholder="Busca un deporte" aria-label="Busca un deporte" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="ob-sports" role="group" aria-label="Deportes">
            {searchSports(question, search).map(button)}
            {button(question.options.find((o) => o.key === OTHER)!)}
          </div>
          {otherInput}
          <div className="ob-none">{button(question.options.find((o) => o.key === question.exclusive)!)}</div>
        </>
      ) : (
        <>
          <div className="ob-opts" role="group" aria-label={question.title}>
            {question.options.map(button)}
          </div>
          {otherInput}
        </>
      )}
      {notice && <p className="ob-use">{USE_NOTICE}</p>}
    </>
  );
}
