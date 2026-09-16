export type UserRole = "coach" | "athlete" | "admin";

export type AuthProvider = "local" | "google" | "apple";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  authProvider: AuthProvider;
  createdAt: string;
}
