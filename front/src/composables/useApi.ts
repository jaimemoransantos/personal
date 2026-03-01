import { auth } from "../firebase/config";
import { getIdToken } from "firebase/auth";

const API_BASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true"
    ? "http://localhost:5001/personal-67927/us-central1/api"
    : "https://us-central1-personal-67927.cloudfunctions.net/api";

export const useApi = () => {
  const getAuthToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const token = await getIdToken(user);
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  const apiCall = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> => {
    const token = await getAuthToken();

    if (!token) {
      throw new Error("No autenticado");
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error en la petición");
    }

    return response.json();
  };

  return {
    // GET
    get: (endpoint: string) => apiCall(endpoint, { method: "GET" }),

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
