import { useApi } from "./useApi";

export type UserRole = "admin" | "chief" | "technician";

export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  displayName?: string;
  role: UserRole;
}

const BASE = "/api/users";

export function useUsers() {
  const api = useApi();

  async function list(): Promise<AppUser[]> {
    const result = await api.get(BASE);
    return (result?.data ?? []) as AppUser[];
  }

  async function create(payload: CreateUserPayload): Promise<AppUser> {
    const result = await api.post(BASE, payload);
    return result?.data as AppUser;
  }

  async function updateRole(id: string, role: UserRole): Promise<AppUser> {
    const result = await api.put(`${BASE}/${id}/role`, { role });
    return result?.data as AppUser;
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  return { list, create, updateRole, remove };
}
