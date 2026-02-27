<template>
  <div class="page">
    <header class="page-header">
      <p class="page-greeting">👋 Hola, {{ displayName }}</p>
      <div class="page-header-main">
        <div class="page-date">
          <p class="page-date-label">Hoy</p>
          <p class="page-date-value">{{ formattedDate }}</p>
        </div>
        <button class="primary-action" @click="goToNuevaCotizacion">
          + Nueva Cotización
        </button>
      </div>
    </header>

    <section class="kpi-section">
      <h2 class="kpi-title">Resumen rápido</h2>
      <div class="kpi-grid">
        <article class="kpi-card">
          <div class="kpi-icon kpi-icon-money">💰</div>
          <div class="kpi-content">
            <p class="kpi-label">Total cotizado este mes</p>
            <p class="kpi-value">$0</p>
            <p class="kpi-sub">Basado en cotizaciones registradas</p>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-icon kpi-icon-docs">📄</div>
          <div class="kpi-content">
            <p class="kpi-label">Cotizaciones este mes</p>
            <p class="kpi-value">0</p>
            <p class="kpi-sub">Total de cotizaciones creadas</p>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-icon kpi-icon-pending">🔄</div>
          <div class="kpi-content">
            <p class="kpi-label">Cotizaciones pendientes</p>
            <p class="kpi-value">0</p>
            <p class="kpi-sub">A la espera de respuesta</p>
          </div>
        </article>

        <article class="kpi-card">
          <div class="kpi-icon kpi-icon-done">✅</div>
          <div class="kpi-content">
            <p class="kpi-label">Cotizaciones aceptadas</p>
            <p class="kpi-value">0</p>
            <p class="kpi-sub">Cotizaciones ganadas</p>
          </div>
        </article>
      </div>
    </section>

    <section class="recent-section">
      <div class="recent-header">
        <h2 class="recent-title">Últimas cotizaciones</h2>
        <p class="recent-sub">
          Vista rápida de las últimas cotizaciones actualizadas.
        </p>
      </div>

      <div class="recent-groups">
        <div
          v-for="group in recentGroups"
          :key="group.label"
          class="recent-group"
        >
          <p class="recent-group-label">{{ group.label }}</p>
          <ul class="recent-list">
            <li
              v-for="quote in group.items"
              :key="quote.id"
              class="recent-item"
            >
              <div class="recent-main">
                <p class="recent-title-text">
                  {{ quote.title }}
                </p>
                <p class="recent-client">
                  {{ quote.client }}
                </p>
              </div>
              <div class="recent-meta">
                <span class="recent-status" :data-status="quote.status">
                  {{ quote.statusLabel }}
                </span>
                <span class="recent-amount">{{ quote.amount }}</span>
                <span class="recent-updated">{{ quote.updatedLabel }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../stores/index";

const router = useRouter();
const userStore = useUserStore();

const displayName = computed(() => {
  const user = userStore.user;
  if (!user) return "usuario";
  return user.displayName || user.email || "usuario";
});

const formattedDate = computed(() => {
  const now = new Date();
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
});

const goToNuevaCotizacion = () => {
  router.push("/cotizaciones");
};

// TODO: estos datos son de ejemplo; luego se sustituirán por datos reales desde la API
const recentGroups = ref([
  {
    label: "Hoy",
    items: [
      {
        id: "1",
        title: "Estudio geotécnico - Proyecto A",
        client: "Cliente Ejemplo S.A.",
        amount: "$120,000",
        status: "pending",
        statusLabel: "Pendiente",
        updatedLabel: "Hace 2 horas",
      },
      {
        id: "2",
        title: "Monitoreo de taludes - Mina Norte",
        client: "Minería del Norte",
        amount: "$85,500",
        status: "accepted",
        statusLabel: "Aceptada",
        updatedLabel: "Hace 5 horas",
      },
    ],
  },
  {
    label: "Ayer",
    items: [
      {
        id: "3",
        title: "Instrumentación piezométrica - Presa X",
        client: "Infraestructura MX",
        amount: "$230,000",
        status: "pending",
        statusLabel: "Pendiente",
        updatedLabel: "Ayer, 16:20",
      },
      {
        id: "4",
        title: "Ensayos de laboratorio - Lote 24",
        client: "Desarrollos del Sur",
        amount: "$45,800",
        status: "rejected",
        statusLabel: "Rechazada",
        updatedLabel: "Ayer, 10:05",
      },
    ],
  },
]);
</script>

<style scoped>
.page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page-greeting {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.page-header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.page-date {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.page-date-label {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.page-date-value {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: #053f51;
  &::first-letter {
    text-transform: capitalize;
  }
}

.primary-action {
  padding: 0.9rem 1.6rem;
  border-radius: 999px;
  border: none;
  background: #0f9f70;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  box-shadow: 0 8px 18px rgba(15, 159, 112, 0.35);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease-out;
}

.primary-action:hover:not(:disabled) {
  background: #0c7a57;
  box-shadow: 0 10px 24px rgba(15, 159, 112, 0.45);
  transform: translateY(-1px);
}

.primary-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.kpi-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.kpi-title {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.kpi-card {
  display: flex;
  gap: 0.9rem;
  padding: 1rem 1.1rem;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  border: 1px solid #e2e8f0;
}

.kpi-icon {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.kpi-icon-money {
  background: rgba(16, 185, 129, 0.12);
}

.kpi-icon-docs {
  background: rgba(59, 130, 246, 0.12);
}

.kpi-icon-pending {
  background: rgba(234, 179, 8, 0.14);
}

.kpi-icon-done {
  background: rgba(34, 197, 94, 0.12);
}

.kpi-content {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.kpi-label {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.kpi-value {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  color: #053f51;
}

.kpi-sub {
  margin: 0;
  font-size: 0.78rem;
  color: #94a3b8;
}

.recent-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.recent-header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.recent-title {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.recent-sub {
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
}

.recent-groups {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recent-group-label {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.recent-list {
  list-style: none;
  padding: 0;
  margin: 0.35rem 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.recent-main {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.recent-title-text {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-client {
  margin: 0;
  font-size: 0.82rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: #64748b;
}

.recent-status {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid transparent;
}

.recent-status[data-status="pending"] {
  background: rgba(234, 179, 8, 0.12);
  color: #854d0e;
  border-color: rgba(234, 179, 8, 0.4);
}

.recent-status[data-status="accepted"] {
  background: rgba(22, 163, 74, 0.12);
  color: #166534;
  border-color: rgba(22, 163, 74, 0.4);
}

.recent-status[data-status="rejected"] {
  background: rgba(248, 113, 113, 0.12);
  color: #b91c1c;
  border-color: rgba(248, 113, 113, 0.4);
}

.recent-amount {
  font-weight: 600;
  color: #053f51;
}

.recent-updated {
  color: #94a3b8;
}

@media (max-width: 640px) {
  .page-header-main {
    align-items: flex-start;
  }

  .page-date-value {
    font-size: 1.35rem;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recent-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .recent-meta {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
