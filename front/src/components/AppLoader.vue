<template>
  <div class="app-loader" role="status" aria-label="Cargando">
    <img
      src="/patron_geomtech_no_background.webp"
      alt=""
      class="app-loader__logo"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-loader {
  position: fixed;
  inset: 0;
  background-color: #053f51;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.app-loader__logo {
  width: 72px;
  height: auto;
  object-fit: contain;
  opacity: 0.9;
  animation: app-loader-pulse 1.6s ease-in-out infinite;
}

@keyframes app-loader-pulse {
  0%,
  100% {
    transform: scale(0.92);
  }
  50% {
    transform: scale(1.08);
  }
}
</style>
