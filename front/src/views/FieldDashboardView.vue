<template>
  <div class="field-page">
    <header class="field-header">
      <h1 class="field-greeting">Hola, {{ greetingName }}</h1>
      <p class="field-subtitle">¿Qué necesitas hacer?</p>
    </header>

    <div class="field-cards">
      <button type="button" class="field-card" @click="goTo('/disenos')">
        <span class="field-card-icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </span>
        <span class="field-card-label">Diseños</span>
        <span class="field-card-hint">Ver y editar diseños</span>
      </button>

      <button type="button" class="field-card" @click="goTo('/proyectos')">
        <span class="field-card-icon" aria-hidden="true">
          <svg
            fill="currentColor"
            viewBox="0 0 489.347 489.347"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M412.642,345.939l-59.523-14.229l-66.352-66.352l51.12-51.055c11.874,4.167,24.216,6.203,36.499,6.202 c28.736-0.002,57.122-11.149,78.233-32.221c32.686-32.626,41.544-82.646,22.043-124.466l-9.042-19.391l-53.807,53.682 l-24.986-24.941l53.822-53.696L421.17,10.42C379.3-9.036,329.218-0.195,296.546,32.417 c-30.131,30.078-40.012,74.943-26.092,114.534l-20.111,20.086L102.13,18.837C91.061,7.731,76.32,1.605,60.621,1.587 c-0.023,0-0.044,0-0.067,0c-15.696,0-30.45,6.104-41.553,17.195C7.886,29.897,1.77,44.669,1.778,60.378 c0.008,15.697,6.129,30.456,17.233,41.553L167.18,250.094l-20.155,20.129c-39.652-13.917-84.597-4.061-114.733,26.02 C-0.393,328.869-9.252,378.888,10.25,420.708l9.042,19.391l53.806-53.681l24.986,24.94l-53.822,53.697l19.48,9.051 c14.814,6.883,30.652,10.224,46.388,10.224c28.738-0.001,57.124-11.148,78.235-32.221c30.132-30.078,40.013-74.943,26.093-114.534 l51.082-51.018l66.366,66.366l14.229,59.523l76.705,76.706l66.507-66.507L412.642,345.939z M301.691,144.194 c-14.181-30.419-7.73-66.807,16.05-90.545c18.28-18.246,44.036-26.278,68.827-22.6l-42.211,42.113l67.451,67.328l42.24-42.142 c3.697,24.738-4.343,50.456-22.622,68.702c-23.802,23.759-60.288,30.197-90.793,16.02l-9.505-4.417l-34.603,34.559l-24.968-24.965 l34.573-34.529L301.691,144.194z M31.778,60.362c-0.004-7.69,2.992-14.923,8.43-20.362c5.433-5.426,12.657-8.414,20.347-8.414 c7.711,0.009,14.918,3.002,20.345,8.446l194.398,194.38l-40.711,40.659L40.221,80.714C34.781,75.277,31.782,68.049,31.778,60.362z M167.171,430.877c-18.28,18.246-44.038,26.278-68.827,22.6l42.211-42.112l-67.451-67.329l-42.24,42.142 c-3.698-24.737,4.343-50.455,22.623-68.702c23.801-23.758,60.288-30.197,90.792-16.021l9.505,4.417l34.609-34.565l24.967,24.966 l-34.578,34.534l4.44,9.525C197.403,370.751,190.952,407.138,167.171,430.877z M373.342,397.227l-7.564-31.645l31.646,7.564 l49.498,49.499l-24.081,24.081L373.342,397.227z"
            />
          </svg>
        </span>
        <span class="field-card-label">Proyectos</span>
        <span class="field-card-hint">Ver tus obras y agregar fotos</span>
      </button>

      <button
        type="button"
        class="field-card"
        @click="goTo('/inventario?action=registrar')"
      >
        <span class="field-card-icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <polyline points="9 11 12 8 15 11" />
          </svg>
        </span>
        <span class="field-card-label">Registrar rollos</span>
        <span class="field-card-hint">Importación de material</span>
      </button>

      <button
        type="button"
        class="field-card"
        @click="goTo('/inventario?action=retirar')"
      >
        <span class="field-card-icon" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
            <line x1="12" y1="10" x2="12" y2="16" />
            <polyline points="9 13 12 16 15 13" />
          </svg>
        </span>
        <span class="field-card-label">Retirar material</span>
        <span class="field-card-hint">Descontar a un proyecto</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../stores/index";

const router = useRouter();
const userStore = useUserStore();

const greetingName = computed(() => {
  const name = userStore.displayName?.trim();
  if (name) return name;
  return "equipo";
});

function goTo(path: string) {
  router.push(path);
}
</script>

<style scoped>
.field-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  min-height: 100%;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.field-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-greeting {
  margin: 0;
  font-size: clamp(1.5rem, 5vw, 1.85rem);
  font-weight: 700;
  color: #053f51;
  line-height: 1.2;
}

.field-subtitle {
  margin: 0;
  font-size: 1rem;
  color: #64748b;
}

.field-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.field-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  width: 100%;
  min-height: 8.5rem;
  padding: 1.1rem 1.15rem;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.field-card:hover,
.field-card:focus-visible {
  border-color: #0f9f70;
  box-shadow: 0 8px 20px rgba(5, 63, 81, 0.1);
  outline: none;
  transform: translateY(-1px);
}

.field-card:active {
  transform: scale(0.985);
}

.field-card-icon {
  display: inline-flex;
  color: #053f51;
  margin-bottom: 0.35rem;
}

.field-card-icon svg {
  width: 2rem;
  height: 2rem;
}

.field-card-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.field-card-hint {
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.35;
}

@media (min-width: 720px) {
  .field-cards {
    gap: 1rem;
  }

  .field-card {
    min-height: 10rem;
    padding: 1.35rem 1.5rem;
  }

  .field-card-label {
    font-size: 1.2rem;
  }

  .field-card-hint {
    font-size: 0.95rem;
  }
}
</style>
