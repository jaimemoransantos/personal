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
        <span class="nav-icon">📊</span>
        <span class="nav-label">Inicio</span>
      </button>
      <button
        class="nav-item"
        :class="{ active: isActive('/cotizaciones') }"
        @click="goTo('/cotizaciones')"
      >
        <span class="nav-icon">📄</span>
        <span class="nav-label">Cotizaciones</span>
      </button>
      <!-- Aquí se agregarán más botones después -->
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <img
          v-if="userStore.user?.photoURL"
          :src="userStore.user.photoURL"
          :alt="userStore.user.displayName || 'Usuario'"
          class="user-avatar-small"
        />
        <div v-else class="user-avatar-placeholder-small">
          {{ userInitial }}
        </div>
        <div class="user-details">
          <p class="user-name">
            {{ userStore.user?.displayName || userStore.user?.email }}
          </p>
          <p class="user-email-small">{{ userStore.user?.email }}</p>
        </div>
      </div>
      <button @click="handleLogout" class="logout-button">Cerrar Sesión</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "../stores/index";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { logout } = userStore;

const userInitial = computed(() => {
  if (!userStore.user?.email) return "?";
  return userStore.user.email.charAt(0).toUpperCase();
});

const handleLogout = async () => {
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
/* Sidebar - 1/5 del ancho */
.sidebar {
  width: 20%;
  background: #053f51;
  border-right: none;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
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
  flex: 1;
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.nav-label {
  flex: 1;
}

.sidebar-footer {
  padding: 1.5rem;
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
