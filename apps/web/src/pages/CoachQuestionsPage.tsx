import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import * as coachProfileApi from "../services/coachProfileApi";
import { resumeAt } from "../lib/coachQuestions";
import { LoadingScreen } from "../components/LoadingScreen";
import { AuthCard } from "../components/AuthCard";
import { CoachSteps } from "../components/onboarding/CoachSteps";
import { CoachExits } from "../components/onboarding/CoachExits";
import { useStepTransition } from "../components/onboarding/OnboardingCard";

function Resume({ profile }: { profile: coachProfileApi.CoachProfileView }) {
  const navigate = useNavigate();
  const { refreshCurrentUser } = useAuth();
  const [step, setStep] = useState(() => resumeAt(profile.lastStep));
  const [entering, setEntering] = useState(false);
  const transition = useStepTransition(setStep);
  return (
    <CoachSteps
      step={step}
      transition={transition}
      saved={profile}
      entering={entering}
      onEnter={() => {
        setEntering(true);
        void refreshCurrentUser()
          .then(() => navigate("/", { replace: true }))
          .catch(() => setEntering(false));
      }}
      links={<CoachExits />}
    />
  );
}

// Quien dejó a medias las preguntas de su registro las retoma donde quedó.
export function CoachQuestionsPage() {
  const { user, refreshCurrentUser } = useAuth();
  const pending = user?.coachSurvey === "register";
  // Siempre las respuestas recién pedidas, nunca las guardadas de antes: así retoma donde quedó.
  const profile = useQuery({
    queryKey: ["coach-profile", "register"],
    queryFn: coachProfileApi.getCoachProfile,
    enabled: pending,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
  // Quien ya no tiene preguntas pendientes no vuelve aquí.
  if (!pending) return <Navigate to="/" replace />;
  if (profile.isError) {
    return (
      <AuthCard title="No pudimos cargar tus preguntas">
        <p role="alert">Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" className="button-primary" onClick={() => void profile.refetch().then(() => refreshCurrentUser())}>
          Reintentar
        </button>
      </AuthCard>
    );
  }
  return profile.isFetchedAfterMount && profile.data ? <Resume profile={profile.data} /> : <LoadingScreen />;
}
