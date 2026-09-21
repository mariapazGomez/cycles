export type UserRole = "coach" | "athlete" | "admin";

export type AuthProvider = "local" | "google" | "apple";

export type WeightUnit = "kg" | "lb";

export interface User {
  id: string;
  email: string;
  name: string;
  // null: cuenta creada vía Google que aún no pasó por POST /auth/complete-profile.
  role: UserRole | null;
  authProvider: AuthProvider;
  weightUnit: WeightUnit;
  emailVerified: boolean;
  dataConsentAt?: string;
  createdAt: string;
}
