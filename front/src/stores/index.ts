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
} from "firebase/auth";
import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { auth } from "../firebase/config";
import { useApi } from "../composables/useApi";

export const useUserStore = defineStore("user", () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  /** true when Firebase Auth has resolved initial auth state (valid session or not) */
  const authReady = ref(false);
  const isAuthenticated = computed(() => user.value !== null);

  // Sync user profile to Firestore (after Firebase Auth authentication)
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const api = useApi();
      const result = await api.post("/api/users/sync-profile", {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });

      if (result.isNewUser) {
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

  const initAuth = () => {
    // Persistence in background; do not block if it fails or is slow (e.g. iOS/PWA)
    setPersistence(auth, indexedDBLocalPersistence).catch((err) => {
      console.error("Error setting Firebase Auth persistence:", err);
    });

    // Firebase calls the callback at least once (state from persistence).
    // Fallback if it takes too long (e.g. PWA reopened, iOS): do not block more than 2s.
    const fallbackTimer = window.setTimeout(() => {
      if (!authReady.value) authReady.value = true;
    }, 2000);

    onAuthStateChanged(auth, (firebaseUser: User | null) => {
      clearTimeout(fallbackTimer);
      user.value = firebaseUser;
      authReady.value = true;
      loading.value = false;
      if (firebaseUser) {
        syncUserProfile(firebaseUser).catch((err) => {
          console.error("Error syncing profile with Firestore:", err);
        });
      }
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
    loading.value = true;
    error.value = null;
    try {
      await signOut(auth);
      const { useOrganizationStore } = await import("./organization");
      useOrganizationStore().clearOrganization();
    } catch (error: any) {
      error.value = (error as Error).message ?? "Error desconocido";
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
    loading,
    error,
    authReady,
    isAuthenticated,
    initAuth,
    signInWithGoogle,
    loginWithEmail,
    logout,
    clearError,
  };
});
