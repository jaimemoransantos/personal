<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">Cotizaciones</h1>
      <div class="page-header-actions">
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Ej: Buscar por cliente, referencia..."
          />
        </div>
      </div>
    </header>

    <section class="list-section">
      <div v-if="filteredQuotes.length === 0" class="list-empty">
        <p>
          {{
            searchQuery.trim()
              ? "No hay cotizaciones que coincidan con la búsqueda."
              : "Aún no hay cotizaciones."
          }}
        </p>
        <button class="primary-action" @click="goToNewQuote">
          {{ searchQuery.trim() ? "Nueva cotización" : "Crear primera cotización" }}
        </button>
      </div>

      <ul v-else class="quote-list">
        <li
          v-for="quote in filteredQuotes"
          :key="quote.id"
          class="quote-item"
          @click="openQuote(quote)"
        >
          <div class="quote-main">
            <p class="quote-title">{{ quote.title }}</p>
            <p class="quote-client">{{ quote.client }}</p>
          </div>
          <div class="quote-meta">
            <span class="quote-amount">{{ quote.amount }}</span>
            <span class="quote-status" :class="`quote-status--${quote.status}`">
              {{ quote.statusLabel }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const searchQuery = ref("");

const goToNewQuote = () => {
  router.push("/cotizaciones/nueva");
};

// TODO: mock data; replace with API
const quotes = ref([
  {
    id: "1",
    title: "Geomembrana y soldadura - Obra Norte",
    client: "Constructora Andina",
    amount: "$12,450.00",
    status: "pending",
    statusLabel: "Pendiente",
  },
  {
    id: "2",
    title: "Geotextil y geodrén - Proyecto Sur",
    client: "Municipalidad de Cuenca",
    amount: "$8,320.50",
    status: "accepted",
    statusLabel: "Aceptada",
  },
  {
    id: "3",
    title: "Embed channel y geomembrana HDPE 1.5mm",
    client: "Geomtech S.A.",
    amount: "$22,100.00",
    status: "pending",
    statusLabel: "Pendiente",
  },
  {
    id: "4",
    title: "Suministro geomembrana 0.75mm - Lote 5",
    client: "Ing. Carlos Pérez",
    amount: "$5,680.00",
    status: "pending",
    statusLabel: "Pendiente",
  },
]);

const filteredQuotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return quotes.value;
  return quotes.value.filter(
    (quote) =>
      quote.title.toLowerCase().includes(q) ||
      quote.client.toLowerCase().includes(q),
  );
});

const openQuote = (_quote: (typeof quotes.value)[0]) => {
  // TODO: navigate to view/edit quote
};
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
  gap: 1rem;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-wrap {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.search-input:focus {
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.3);
}

.search-input::placeholder {
  color: #b8c4d4;
}

.primary-action {
  padding: 0.65rem 1.25rem;
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

.list-section {
  flex: 1;
}

.list-empty {
  padding: 3rem 1.5rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
}

.list-empty p {
  margin: 0 0 1rem 0;
  color: #64748b;
  font-size: 0.95rem;
}

.quote-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quote-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.quote-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.quote-main {
  min-width: 0;
}

.quote-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #0f172a;
}

.quote-client {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.quote-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.quote-amount {
  font-size: 1rem;
  font-weight: 600;
  color: #053f51;
}

.quote-status {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-weight: 500;
}

.quote-status--pending {
  background: rgba(234, 179, 8, 0.15);
  color: #b45309;
}

.quote-status--accepted {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.quote-status--rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

@media (max-width: 640px) {
  .page-header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .search-wrap {
    max-width: none;
  }

  .quote-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .quote-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
