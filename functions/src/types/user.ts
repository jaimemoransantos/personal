/**
 * User profile stored in Firestore collection "users".
 * Each user belongs to one organization (organizationId).
 */
export type UserRole = "admin" | "chief" | "technician";

export interface UserProfile {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  organizationId: string;
  role: UserRole;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CreateUserData {
  email: string;
  displayName?: string;
  photoURL?: string;
  organizationId?: string;
  /** Defaults to "technician" when not specified */
  role?: UserRole;
}
