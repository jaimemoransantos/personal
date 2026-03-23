<template>
  <div class="login-container">
    <div class="login-card">
      <img src="/logo_geomtech.jpg" alt="Geomtech" class="logo" />
      <h1>Iniciar Sesión</h1>
      <p class="subtitle">
        Accede a tu cuenta con tu correo electrónico para crear y gestionar
        cotizaciones.
      </p>

      <form class="form" @submit.prevent="handleEmailLogin">
        <div class="form-group">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="tu@empresa.com"
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            minlength="6"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" :disabled="loading" class="primary-button">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Entrar</span>
        </button>
      </form>

      <!-- <p class="info-text">
        Al iniciar sesión, aceptas nuestros términos de servicio y política de
        privacidad.
      </p> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "../stores/index";
import { useToastStore } from "../stores/toast";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toastStore = useToastStore();
const { loading, loginWithEmail, clearError } = userStore;

const email = ref("");
const password = ref("");

// Redirect when user becomes authenticated
watch(
  () => userStore.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      toastStore.show("Inicio de sesión correcto. ¡Bienvenido!", "success");
      const redirect = route.query.redirect;
      const path =
        typeof redirect === "string" &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//")
          ? redirect
          : "/inicio";
      router.push(path);
    }
  }
);

const handleEmailLogin = async () => {
  clearError();
  const result = await loginWithEmail(email.value, password.value);

  if (!result.success && result.error) {
    toastStore.show(result.error, "error");
  }
  // Redirect is handled by the watcher when isAuthenticated becomes true
};
</script>

<style scoped>
.login-container {
  position: fixed;
  inset: 0;
  min-height: 100vh;
  min-height: 100dvh;
  max-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: 1rem;
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.login-card {
  background: #053f51;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 450px;
  text-align: center;
  margin: auto;
}

.logo {
  width: 120px;
  height: auto;
  margin: 0 auto 1.5rem;
  display: block;
  object-fit: contain;
}

/* Desktop: centered modal with more space */
@media (min-width: 768px) {
  .login-container {
    padding: 3rem 2rem;
  }

  .login-card {
    padding: 3.5rem;
    max-width: 450px;
    margin: 0;
  }

  .logo {
    width: 150px;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2.25rem;
  }
}

h1 {
  margin: 0 0 0.5rem 0;
  color: #ffffff;
  font-size: 2rem;
  font-weight: 700;
}

.subtitle {
  color: #e2e8f0;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.85rem;
  color: #e2e8f0;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 0.85rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  color: #053f51;
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-group input:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.35);
}

.primary-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: #0f9f70;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.2s;
  margin-bottom: 1.5rem;
}

.primary-button:hover:not(:disabled) {
  background: #0c7a57;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.info-text {
  font-size: 0.75rem;
  color: #cbd5f5;
  margin: 0;
  line-height: 1.4;
}
</style>
