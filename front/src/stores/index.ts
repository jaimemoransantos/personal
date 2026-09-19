import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  setPersistence,
  indexedDBLocalPersistence,
  getIdToken,
} from "firebase/auth";
import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import { auth } from "../firebase/config";
import { useApi } from "../composables/useApi";
import { useQuoteDraftStore } from "./quoteDraft";
import { useOrganizationStore } from "./organization";

/**
 * Solo `import.meta.env.DEV`: pon `VITE_DEV_BYPASS_AUTH=true` en `.env.local` para entrar al
 * dashboard sin login (útil para maquetar). Las APIs siguen necesitando sesión real.
 */
export const isDevAuthBypass =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

export type UserRole = "admin" | "chief" | "technician";

/** Profile from Firestore (users collection). Used for displayName/photoURL when set in DB. */
export interface UserProfile {
  displayName?: string | null;
  photoURL?: string | null;
  email?: string;
  organizationId?: string;
  role?: UserRole;
}

export const useUserStore = defineStore("user", () => {
  const user = ref<User | null>(null);
  /** Profile from Firestore; displayName and photoURL here override Auth when present */
  const profile = ref<UserProfile | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  /** true when Firebase Auth has resolved initial auth state (valid session or not) */
  const authReady = ref(false);
  /**
   * true until Firestore profile (incl. role) is resolved for the current session.
   * Starts true so the first paint never evaluates role as missing.
   */
  const profileLoading = ref(true);
  const isAuthenticated = computed(
    () => user.value !== null || isDevAuthBypass,
  );

  /** Display name: Firestore first, then Auth, then email */
  const displayName = computed(() => {
    if (profile.value?.displayName) return profile.value.displayName;
    if (user.value?.displayName) return user.value.displayName;
    return user.value?.email ?? "";
  });

  /** Photo URL: Firestore first, then Auth */
  const photoURL = computed(() => profile.value?.photoURL ?? user.value?.photoURL ?? null);

  /** True when the Firestore profile has role "admin" */
  const isAdmin = computed(() => profile.value?.role === "admin");

  /** Current role from Firestore profile (undefined until profile loads). */
  const role = computed(() => profile.value?.role);

  /** True for field roles (jefe de obra / técnico) */
  const isFieldRole = computed(
    () =>
      profile.value?.role === "chief" || profile.value?.role === "technician",
  );

  // Sync user profile to Firestore (after Firebase Auth authentication)
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const api = useApi();
      const result = await api.post("/api/users/sync-profile", {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });

      if (result?.data && typeof result.data === "object") {
        profile.value = result.data as UserProfile;
        if (import.meta.env.DEV) {
          console.log("[Profile] After sync – profile:", profile.value, "photoURL:", (result.data as UserProfile)?.photoURL);
        }
      }
      if (result?.isNewUser) {
        console.log("🎉 New profile created in Firestore");
      } else {
        console.log("✅ Profile updated in Firestore");
      }

      return result;
    } catch (err) {
      console.error("Error syncing profile:", err);
      throw err;
    }
  };

  /** Fetches profile from API (Firestore). Use when you need displayName/photoURL and sync may not have run yet. */
  const fetchProfile = async () => {
    if (!user.value) return;
    try {
      const api = useApi();
      const result = await api.get("/api/users/profile");
      if (result?.data && typeof result.data === "object") {
        profile.value = result.data as UserProfile;
        if (import.meta.env.DEV) {
          console.log("[Profile] After fetchProfile – profile:", profile.value, "photoURL:", profile.value?.photoURL);
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[Profile] fetchProfile failed:", e);
    }
  };

  /** Resolves when Firebase Auth has finished the initial session restore. */
  const waitForAuth = (): Promise<void> => {
    if (authReady.value) return Promise.resolve();
    return new Promise((resolve) => {
      const stop = watch(authReady, (ready) => {
        if (ready) {
          stop();
          resolve();
        }
      });
    });
  };

  /**
   * Resolves when profileLoading is false (role is reliable, or no session).
   * Router guards must await this before any isAdmin/isFieldRole decision.
   */
  const waitForProfile = (): Promise<void> => {
    if (!profileLoading.value) return Promise.resolve();
    return new Promise((resolve) => {
      const stop = watch(profileLoading, (loading) => {
        if (!loading) {
          stop();
          resolve();
        }
      });
    });
  };

  /** Interval for proactive token refresh (ID token lasts ~1h). Cleared on logout. */
  let tokenRefreshIntervalId: ReturnType<typeof setInterval> | null = null;
  const TOKEN_REFRESH_MINUTES = 50;

  const initAuth = () => {
    if (isDevAuthBypass) {
      authReady.value = true;
      profileLoading.value = false;
      profile.value = {
        displayName: "Dev (sin login)",
        email: "dev@local",
      };
      console.warn(
        "[dev] VITE_DEV_BYPASS_AUTH: navegación sin Firebase. Las llamadas API requieren iniciar sesión.",
      );
    }

    // Persistence in background; do not block if it fails or is slow (e.g. iOS/PWA)
    setPersistence(auth, indexedDBLocalPersistence).catch((err) => {
      console.error("Error setting Firebase Auth persistence:", err);
    });

    // Firebase calls the callback at least once (state from persistence).
    // Fallback if it takes too long (e.g. PWA reopened, iOS): do not block more than 2s.
    const fallbackTimer = window.setTimeout(() => {
      if (!authReady.value) {
        authReady.value = true;
        if (!user.value) profileLoading.value = false;
      }
    }, 2000);

    onAuthStateChanged(auth, (firebaseUser: User | null) => {
      clearTimeout(fallbackTimer);
      user.value = firebaseUser;

      if (tokenRefreshIntervalId !== null) {
        clearInterval(tokenRefreshIntervalId);
        tokenRefreshIntervalId = null;
      }

      if (!firebaseUser) {
        if (!isDevAuthBypass) {
          profile.value = null;
          useQuoteDraftStore().clearDraft();
        }
        profileLoading.value = false;
        authReady.value = true;
        loading.value = false;
        return;
      }

      // New session (or user switch): clear previous profile and block UI until role is known.
      profile.value = null;
      profileLoading.value = true;
      authReady.value = true;
      loading.value = false;

      // Proactive refresh so the ID token rarely expires before the next API call
      tokenRefreshIntervalId = setInterval(() => {
        const current = auth.currentUser;
        if (current)
          getIdToken(current, true).catch((err) =>
            console.warn("Token refresh failed:", err),
          );
      }, TOKEN_REFRESH_MINUTES * 60 * 1000);

      const profilePromise = fetchProfile();
      const syncPromise = syncUserProfile(firebaseUser).catch((err) => {
        console.error("Error syncing profile with Firestore:", err);
      });
      void Promise.all([profilePromise, syncPromise]).finally(() => {
        // Only clear if this session is still the same user
        if (user.value?.uid === firebaseUser.uid) {
          profileLoading.value = false;
        }
      });
    });
  };

  const loginWithEmail = async (email: string, password: string) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser ?? false;

      if (isNewUser) {
        console.log("🎉 New user authenticated with email/password");
      }

      // Loading will be cleared when onAuthStateChanged updates the user
      return { success: true, isNewUser };
    } catch (err: any) {
      // Map Firebase Auth error codes to user-facing messages
      const code = err?.code as string | undefined;
      const rawMessage =
        ((err as any)?.error?.message as string | undefined) ??
        ((err as any)?.message as string | undefined);

      let message = "Error desconocido";

      if (
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-credential" ||
        code === "auth/user-disabled" ||
        (rawMessage && rawMessage.includes("INVALID_PASSWORD"))
      ) {
        message = "Correo o contraseña incorrectos.";
      } else if (code === "auth/too-many-requests") {
        message =
          "Demasiados intentos fallidos. Inténtalo de nuevo más tarde o restablece tu contraseña.";
      } else if (typeof (err as Error).message === "string") {
        message = (err as Error).message;
      }

      error.value = message;
      loading.value = false;
      return { success: false, error: message };
    }
  };

  const signInWithGoogle = async () => {
    loading.value = true;
    error.value = null;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Profile sync to Firestore happens automatically in onAuthStateChanged after Firebase Auth
      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser ?? false;

      if (isNewUser) {
        console.log("🎉 New user authenticated with Firebase Auth");
      }

      // Loading will be cleared when onAuthStateChanged updates the user; we don't await here to avoid blocking
      return { success: true, isNewUser };
    } catch (error: any) {
      error.value = (error as Error).message ?? "Error desconocido";
      loading.value = false;
      return { success: false, error: error.value };
    }
  };

  const logout = async () => {
    if (isDevAuthBypass) {
      console.warn(
        "[dev] Quita VITE_DEV_BYPASS_AUTH para poder cerrar sesión con Firebase.",
      );
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      useQuoteDraftStore().clearDraft();
      // Block UI immediately so the previous role never flashes during sign-out.
      profile.value = null;
      profileLoading.value = true;
      await signOut(auth);
      useOrganizationStore().clearOrganization();
    } catch (error: any) {
      error.value = (error as Error).message ?? "Error desconocido";
      profileLoading.value = false;
    } finally {
      loading.value = false;
    }
  };

  // Clear error state
  const clearError = () => {
    error.value = null;
  };

  return {
    user,
    profile,
    displayName,
    photoURL,
    isAdmin,
    role,
    isFieldRole,
    loading,
    error,
    authReady,
    profileLoading,
    isAuthenticated,
    initAuth,
    fetchProfile,
    waitForAuth,
    waitForProfile,
    signInWithGoogle,
    loginWithEmail,
    logout,
    clearError,
  };
});
