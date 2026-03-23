<template>
  <div class="dashboard-container">
    <AppSidebar />

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
import { onMounted, watch } from "vue";
import AppSidebar from "../components/AppSidebar.vue";
import { useUserStore, isDevAuthBypass } from "../stores/index";
import { useOrganizationStore } from "../stores/organization";

const userStore = useUserStore();
const organizationStore = useOrganizationStore();

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
  }
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

@media (max-width: 768px) {
  .dashboard-container {
    flex-direction: column;
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

