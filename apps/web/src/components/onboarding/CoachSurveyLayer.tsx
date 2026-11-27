import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import * as coachProfileApi from "../../services/coachProfileApi";
import { resumeAt } from "../../lib/coachQuestions";
import { finishSurvey, showsSurvey } from "../../lib/coachGate";
import { CoachSteps } from "./CoachSteps";
import { CoachExits } from "./CoachExits";
import { useStepTransition } from "./OnboardingCard";

function Survey({ profile }: { profile: coachProfileApi.CoachProfileView }) {
  const { refreshCurrentUser } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  // Quien ya respondió algo retoma en esa pregunta, sin volver a la bienvenida.
  const [step, setStep] = useState(() => (profile.lastStep > 0 ? resumeAt(profile.lastStep) : 0));
  const [entering, setEntering] = useState(false);
  const transition = useStepTransition(setStep);
  // Obligatoria: sin «×», y ni Escape ni tocar afuera la cierran.
  useDialogFocus(ref, () => {});
  return (
    <div ref={ref} className="ob-overlay" role="dialog" aria-modal="true" aria-label="Preguntas para mejorar Cycles">
      <CoachSteps
        variant="survey"
        step={step}
        transition={transition}
        saved={profile}
        links={<CoachExits />}
        entering={entering}
        onEnter={() => {
          setEntering(true);
          finishSurvey();
          void refreshCurrentUser().catch(() => setEntering(false));
        }}
      />
    </div>
  );
}

// Cada vez que la encuesta vuelve a la pantalla (por ejemplo, desde «Mi cuenta») espera las
// respuestas recién pedidas, nunca las guardadas de antes: así retoma donde quedó.
function SurveyLoader() {
  const profile = useQuery({
    queryKey: ["coach-profile", "survey"],
    queryFn: coachProfileApi.getCoachProfile,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
  return profile.isFetchedAfterMount && profile.data?.pending === "survey" ? <Survey profile={profile.data} /> : null;
}

// La encuesta a los coaches que ya tienen cuenta (CYC-295,
// docs/diseno/invitacion-onboarding/encuesta-coaches.md). Solo sale si la API la marca pendiente
// (está apagada hasta activarla). Si no se pueden cargar sus respuestas, se entra normal.
export function CoachSurveyLayer() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return showsSurvey(user, pathname) ? <SurveyLoader /> : null;
}
