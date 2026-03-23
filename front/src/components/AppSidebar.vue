<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <img src="/logo_geomtech.jpg" alt="Geomtech" class="sidebar-logo" />
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item"
        :class="{ active: isActive('/inicio') }"
        @click="goTo('/inicio')"
      >
        <span class="nav-icon nav-icon-svg" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span class="nav-label">Inicio</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: route.path.startsWith('/cotizaciones') }"
        @click="goTo('/cotizaciones')"
      >
        <span class="nav-icon nav-icon-svg" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="16" x2="16" y2="16" />
            <line x1="8" y1="20" x2="12" y2="20" />
          </svg>
        </span>
        <span class="nav-label">Cotizaciones</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: isActive('/clientes') }"
        @click="goTo('/clientes')"
      >
        <span class="nav-icon nav-icon-svg" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span class="nav-label">Clientes</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: isActive('/productos') }"
        @click="goTo('/productos')"
      >
        <span class="nav-icon nav-icon-svg" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </span>
        <span class="nav-label">Productos</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <img
          v-if="avatarSrc && !avatarImgError"
          :src="avatarSrc"
          :alt="userStore.displayName || 'Usuario'"
          class="user-avatar-small"
          referrerpolicy="no-referrer"
          @load="onAvatarLoad"
          @error="onAvatarError"
        />
        <div v-else class="user-avatar-placeholder-small">
          {{ userInitial }}
        </div>
        <div class="user-details">
          <p class="user-name">
            {{ userStore.displayName || userStore.user?.email }}
          </p>
          <p class="user-email-small">{{ userStore.user?.email }}</p>
        </div>
      </div>
      <button @click="handleLogout" class="logout-button">Cerrar Sesión</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore, isDevAuthBypass } from "../stores/index";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const api = useApi();
const toastStore = useToastStore();
const { logout } = userStore;

const avatarImgError = ref(false);
/** Avatar image src: blob URL (when proxied from Google) or direct photoURL */
const avatarSrc = ref<string | null>(null);

const isGooglePhoto = (url: string | null | undefined) =>
  !!url && url.includes("lh3.googleusercontent.com");

function revokeAvatarBlob() {
  if (avatarSrc.value?.startsWith("blob:")) {
    URL.revokeObjectURL(avatarSrc.value);
  }
  avatarSrc.value = null;
}

async function loadAvatar() {
  revokeAvatarBlob();
  avatarImgError.value = false;
  const photoURL = userStore.photoURL;
  if (!photoURL) return;

  if (isGooglePhoto(photoURL)) {
    try {
      const blob = await api.getBlob("/api/users/me/avatar");
      avatarSrc.value = URL.createObjectURL(blob);
    } catch {
      avatarImgError.value = true;
    }
  } else {
    avatarSrc.value = photoURL;
  }
}

watch(
  () => userStore.photoURL,
  (url) => {
    if (!url) {
      revokeAvatarBlob();
      return;
    }
    loadAvatar();
  },
  { immediate: true },
);

onUnmounted(() => {
  revokeAvatarBlob();
});

function onAvatarLoad() {
  if (import.meta.env.DEV) console.log("[Sidebar Avatar] Image loaded OK");
}
function onAvatarError() {
  if (import.meta.env.DEV) console.warn("[Sidebar Avatar] Image failed to load");
  avatarImgError.value = true;
}

onMounted(() => {
  userStore.fetchProfile();
});

const userInitial = computed(() => {
  const name = userStore.displayName;
  if (name?.length) return name.charAt(0).toUpperCase();
  if (userStore.user?.email) return userStore.user.email.charAt(0).toUpperCase();
  return "?";
});

const handleLogout = async () => {
  if (isDevAuthBypass) {
    toastStore.show(
      "Quita VITE_DEV_BYPASS_AUTH del .env para cerrar sesión con Firebase.",
      "info",
    );
    return;
  }
  await logout();
  router.push("/login");
};

const isActive = (path: string) => route.path === path;

const goTo = (path: string) => {
  if (route.path !== path) {
    router.push(path);
  }
};
</script>

<style scoped>
/* Sidebar - 1/5 width */
.sidebar {
  width: 20%;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  background: #053f51;
  border-right: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  flex-shrink: 0;
  padding: 1.5rem 1.5rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sidebar-logo {
  width: 140px;
  height: auto;
  display: block;
  object-fit: contain;
}

.sidebar-nav {
  flex: 1 1 auto;
  min-height: 0;
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.nav-item {
  width: 100%;
  padding: 0.9rem 1.1rem;
  background: #053f51;
  border: 1px solid transparent;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s ease-out;
  color: #e2e8f0;
  font-size: 1rem;
  outline: none;
  transform: translateY(0);
}

.nav-item:hover,
.nav-item:focus,
.nav-item:focus-visible {
  background: #06475b;
  border-color: rgba(148, 163, 184, 0.6);
  outline: none;
  transform: translateY(-1px);
}

.nav-item.active {
  background: #0f9f70;
  border-color: #0f9f70;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}

.nav-icon {
  font-size: 1.25rem;
}

.nav-icon-svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.nav-icon-svg svg {
  width: 1.25rem;
  height: 1.25rem;
}

.nav-label {
  flex: 1;
}

.sidebar-footer {
  flex-shrink: 0;
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(148, 163, 184, 0.25);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.user-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.user-avatar-placeholder-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #0f9f70;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f9fafb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email-small {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: #cbd5f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-button {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  color: #fee2e2;
  border: 1px solid rgba(248, 113, 113, 0.7);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-button:hover {
  background: rgba(248, 113, 113, 0.15);
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 50vh;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .sidebar-header {
    padding: 1.5rem 1rem;
  }

  .sidebar-logo {
    width: 60px;
  }

  .sidebar-nav {
    padding: 0.5rem 0;
  }

  .nav-item {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .sidebar-footer {
    padding: 1rem;
  }
}
</style>
