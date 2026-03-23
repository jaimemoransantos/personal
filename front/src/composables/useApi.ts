import { auth } from "../firebase/config";
import { getIdToken, signOut } from "firebase/auth";
import { useToastStore } from "../stores/toast";

const API_BASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true"
    ? "http://localhost:5001/personal-67927/us-central1/api"
    : "https://us-central1-personal-67927.cloudfunctions.net/api";

/** 401 after a token refresh means session revoked/invalid → we sign out so user must log in again. */
export const SESSION_INVALID_MESSAGE =
  "Sesión expirada. Inicia sesión de nuevo.";

function showSessionExpiredToast() {
  try {
    useToastStore().show("Sesión expirada. Inicia sesión de nuevo.", "error");
  } catch {
    // Store might not be ready in some edge cases
  }
}

/**
 * API client with Firebase Auth token.
 * - Token is refreshed proactively every ~50 min in the user store.
 * - On 401 we force refresh once and retry; if still 401 we sign out and show toast.
 */
export const useApi = () => {
  const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const token = await getIdToken(user, forceRefresh);
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  const apiCall = async (
    endpoint: string,
    options: RequestInit = {},
    retried = false,
  ): Promise<any> => {
    const token = await getAuthToken(retried);

    if (!token) {
      if (!retried) {
        const refreshed = await getAuthToken(true);
        if (refreshed) {
          return apiCall(endpoint, options, true);
        }
      }
      showSessionExpiredToast();
      await signOut(auth);
      throw new Error(SESSION_INVALID_MESSAGE);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      if (!retried) {
        const refreshed = await getAuthToken(true);
        if (refreshed) {
          return apiCall(endpoint, options, true);
        }
      }
      showSessionExpiredToast();
      await signOut(auth);
      const body = await response.json().catch(() => ({}));
      throw new Error(
        (body as { error?: string })?.error ?? SESSION_INVALID_MESSAGE,
      );
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error en la petición");
    }

    return response.json();
  };

  const getBlob = async (endpoint: string, retried = false): Promise<Blob> => {
    const token = await getAuthToken(retried);
    if (!token) {
      if (!retried) {
        const refreshed = await getAuthToken(true);
        if (refreshed) return getBlob(endpoint, true);
      }
      showSessionExpiredToast();
      await signOut(auth);
      throw new Error(SESSION_INVALID_MESSAGE);
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      if (!retried) {
        const refreshed = await getAuthToken(true);
        if (refreshed) return getBlob(endpoint, true);
      }
      showSessionExpiredToast();
      await signOut(auth);
      throw new Error(SESSION_INVALID_MESSAGE);
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string })?.error || "Error en la petición",
      );
    }
    return response.blob();
  };

  return {
    // GET
    get: (endpoint: string) => apiCall(endpoint, { method: "GET" }),
    getBlob,

    // POST
    post: (endpoint: string, data: any) =>
      apiCall(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    // PUT
    put: (endpoint: string, data: any) =>
      apiCall(endpoint, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    // DELETE
    delete: (endpoint: string) => apiCall(endpoint, { method: "DELETE" }),
  };
};
