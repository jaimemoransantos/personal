<template>
  <div class="dashboard-container">
    <AppSidebar />

    <main class="main-content">
      <div class="content-area">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from "../components/AppSidebar.vue";
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

