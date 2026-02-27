<script setup lang="ts">
import { onMounted, watch, ref, computed } from "vue";
import { useUserStore } from "./stores/index";
import { useToastStore } from "./stores/toast";
import AppLoader from "./components/AppLoader.vue";
import router from "./router";

const userStore = useUserStore();
const toastStore = useToastStore();

// Fallback local: si tras 2s sigue el loader, mostrar app igual (evita quedar atascado)
const forceHideLoader = ref(false);
onMounted(() => {
  userStore.initAuth();
  window.setTimeout(() => {
    forceHideLoader.value = true;
  }, 2000);
});

const showLoader = computed(() => !userStore.authReady && !forceHideLoader.value);

// Cuando la sesión está lista, re-ejecutar el guard para redirigir según auth
watch(
  () => userStore.authReady,
  (ready) => {
    if (!ready) return;
    router.isReady().then(() => {
      router.replace(router.currentRoute.value.fullPath);
    });
  }
);
</script>

<template>
  <div id="app">
    <AppLoader v-if="showLoader" />

    <template v-else>
      <router-view />

      <transition name="toast-fade">
      <div
        v-if="toastStore.visible && toastStore.message"
        :class="['global-toast', `global-toast--${toastStore.type}`]"
      >
        {{ toastStore.message }}
      </div>
    </transition>
    </template>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.global-toast {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  max-width: 320px;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  font-size: 0.9rem;
  z-index: 1000;
}

.global-toast--error {
  background: #fee;
  color: #c33;
  border-left: 4px solid #c33;
}

.global-toast--success {
  background: #e6ffed;
  color: #176f3d;
  border-left: 4px solid #2f855a;
}

.global-toast--info {
  background: #e6f0ff;
  color: #1a4b82;
  border-left: 4px solid #3182ce;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
