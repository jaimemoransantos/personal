<template>
  <div
    class="dashboard-container"
    :class="{ 'nav-drawer-open': mobileNavOpen }"
  >
    <header class="mobile-topbar">
      <img src="/logo_geomtech.jpg" alt="Geomtech" class="mobile-topbar-logo" />
      <button
        type="button"
        class="mobile-menu-btn"
        aria-label="Abrir menú"
        :aria-expanded="mobileNavOpen"
        @click="mobileNavOpen = true"
      >
        <span aria-hidden="true">☰</span>
      </button>
    </header>

    <div
      class="drawer-overlay"
      :class="{ 'drawer-overlay--visible': mobileNavOpen }"
      aria-hidden="true"
      @click="mobileNavOpen = false"
    />

    <AppSidebar :mobile-open="mobileNavOpen" @close="mobileNavOpen = false" />

    <main class="main-content">
      <div class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" :key="$route.path" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppSidebar from "../components/AppSidebar.vue";
import { useUserStore, isDevAuthBypass } from "../stores/index";
import { useOrganizationStore } from "../stores/organization";

const userStore = useUserStore();
const organizationStore = useOrganizationStore();
const route = useRoute();

const mobileNavOpen = ref(false);

watch(
  () => route.fullPath,
  () => {
    mobileNavOpen.value = false;
  },
);

onMounted(() => {
  if (isDevAuthBypass) return;
  if (userStore.isAuthenticated && !organizationStore.hasOrganization) {
    organizationStore.fetchCurrentOrganization();
  }
});

watch(
  () => userStore.isAuthenticated,
  (isAuth) => {
    if (isDevAuthBypass) return;
    if (isAuth && !organizationStore.hasOrganization) {
      organizationStore.fetchCurrentOrganization();
    }
    if (!isAuth) {
      organizationStore.clearOrganization();
    }
  },
);
</script>

<style scoped>
.dashboard-container {
  position: fixed;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
  /* iOS/iPad: evita franja blanca debajo de un bloque con height:100dvh vs viewport real */
  min-height: 100vh;
  min-height: -webkit-fill-available;
  overflow: hidden;
  background: #f5f5f5;
  margin: 0;
  padding: 0;
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  box-sizing: border-box;
}

.mobile-topbar {
  display: none;
}

.drawer-overlay {
  display: none;
}

.main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 80%;
  overflow-y: auto;
  background: #f5f5f5;
  -webkit-overflow-scrolling: touch;
  /* Área segura inferior sin encoger el contenedor fijo (evita “banda” vacía) */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.content-area {
  padding: 2rem;
  min-height: 100%;
}

/* Transición sutil al cambiar de vista: solo fade suave */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .dashboard-container {
    flex-direction: column;
  }

  .dashboard-container.nav-drawer-open {
    overflow: hidden;
  }

  .mobile-topbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    height: 4.5rem;
    padding: 0 1rem;
    padding-top: 16px;
    padding-bottom: 16px;
    background: #053f51;
    border-bottom: 1px solid rgba(148, 163, 184, 0.25);
    z-index: 40;
  }

  .mobile-topbar-logo {
    height: 2rem;
    width: auto;
    display: block;
    object-fit: contain;
  }

  .mobile-menu-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #f9fafb;
    font-size: 2.5rem;
    cursor: pointer;
  }

  .mobile-menu-btn:hover,
  .mobile-menu-btn:focus-visible {
    background: #06475b;
    outline: none;
  }

  .drawer-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(15, 23, 42, 0.45);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.22s ease;
  }

  .drawer-overlay--visible {
    opacity: 1;
    pointer-events: auto;
  }

  .main-content {
    width: 100%;
    flex: 1;
  }

  .content-area {
    padding: 1.5rem;
  }
}
</style>
