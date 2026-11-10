export type UserRole = "coach" | "athlete" | "admin";

export type AuthProvider = "local" | "google" | "apple";

export type TourStatus = "pending" | "skipped" | "completed";

export type WeightUnit = "kg" | "lb";

export interface User {
  id: string;
  email: string;
  name: string;
  // null: cuenta creada vía Google que aún no pasó por POST /auth/complete-profile.
  role: UserRole | null;
  authProvider: AuthProvider;
  // Solo atletas: false mientras ningún coach lo haya vinculado (se registró solo).
  hasActiveCoach?: boolean;
  // true si la cuenta tiene Apple vinculado: al eliminarla, la app pide confirmar con Apple.
  hasAppleIdentity?: boolean;
  weightUnit: WeightUnit;
  // Qué teléfono eligió al registrarse (solo atletas que se registraron solos); null si no lo dijo.
  phonePlatform?: "ios" | "android" | null;
  // Guía de primer uso: una sola marca por cuenta, compartida por web y móvil.
  tourStatus?: TourStatus;
  // Novedades que la persona ya vio, como `clave@version` (src/novelties.ts).
  tourNewsSeen?: string[];
  emailVerified: boolean;
  dataConsentAt?: string;
  // Aceptación de los Términos de uso y la Política de privacidad (T-147).
  // needsPolicyAcceptance: aún no aceptó la versión vigente (policyVersion).
  policyAcceptedAt?: string | null;
  policyVersion?: string;
  needsPolicyAcceptance?: boolean;
  createdAt: string;
}
