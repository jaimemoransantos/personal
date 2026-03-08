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
import { useUserStore } from "../stores/index";
import { useOrganizationStore } from "../stores/organization";

const userStore = useUserStore();
const organizationStore = useOrganizationStore();

onMounted(() => {
  if (userStore.isAuthenticated && !organizationStore.hasOrganization) {
    organizationStore.fetchCurrentOrganization();
  }
});

watch(
  () => userStore.isAuthenticated,
  (isAuth) => {
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f5f5f5;
  margin: 0;
  padding: 0;
}

.main-content {
  flex: 1;
  width: 80%;
  overflow-y: auto;
  background: #f5f5f5;
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

