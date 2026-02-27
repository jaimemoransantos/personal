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
  /** true cuando Firebase Auth ya resolvió el estado inicial (sesión válida o no) */
  const authReady = ref(false);
  const isAuthenticated = computed(() => user.value !== null);

  // Sincronizar perfil del usuario en Firestore (después de autenticación con Firebase Auth)
  const syncUserProfile = async (firebaseUser: User) => {
    try {
      const api = useApi();
      const result = await api.post("/api/users/sync-profile", {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });

      if (result.isNewUser) {
        console.log("🎉 Perfil nuevo creado en Firestore");
      } else {
        console.log("✅ Perfil actualizado en Firestore");
      }

      return result;
    } catch (err) {
      console.error("Error al sincronizar perfil:", err);
      throw err;
    }
  };

  const initAuth = () => {
    // Persistencia en segundo plano; no bloquear por si tarda o falla (p. ej. iOS/PWA)
    setPersistence(auth, indexedDBLocalPersistence).catch((err) => {
      console.error("Error configurando la persistencia de Firebase Auth:", err);
    });

    // Fallback: si Firebase no responde en 1.2s, mostrar app para no quedarse en loader
    const fallbackTimer = window.setTimeout(() => {
      if (!authReady.value) authReady.value = true;
    }, 1200);

    onAuthStateChanged(auth, (firebaseUser: User | null) => {
      window.clearTimeout(fallbackTimer);
      user.value = firebaseUser;
      authReady.value = true;
      loading.value = false;
      if (firebaseUser) {
        syncUserProfile(firebaseUser).catch((err) => {
          console.error("Error al sincronizar perfil con Firestore:", err);
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
        console.log("🎉 Usuario nuevo autenticado con email/contraseña");
      }

      // El loading se desactivará cuando onAuthStateChanged actualice el usuario
      return { success: true, isNewUser };
    } catch (err: any) {
      // Normalizar códigos de error de Firebase Auth a mensajes de usuario
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

      // La sincronización del perfil en Firestore se hará automáticamente
      // en onAuthStateChanged después de que Firebase Auth autentique al usuario
      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser ?? false;

      if (isNewUser) {
        console.log("🎉 Usuario nuevo autenticado con Firebase Auth");
      }

      // El loading se desactivará cuando onAuthStateChanged actualice el usuario
      // No esperamos aquí para no bloquear
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
    } catch (error: any) {
      error.value = (error as Error).message ?? "Error desconocido";
    } finally {
      loading.value = false;
    }
  };

  // Limpiar error
  const clearError = () => {
    error.value = null;
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    initAuth,
    signInWithGoogle,
    loginWithEmail,
    logout,
    clearError,
  };
});
