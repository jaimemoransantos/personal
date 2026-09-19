<template>
  <div class="page">
    <header class="page-header">
      <p class="page-greeting">👋 Hola, {{ displayName }}</p>
      <div class="page-header-main">
        <div class="page-date">
          <p class="page-date-label">Hoy</p>
          <p class="page-date-value">{{ formattedDate }}</p>
        </div>
        <button class="primary-action" @click="goToNewQuote">
          + Nueva Cotización
        </button>
      </div>
    </header>

    <div v-if="quotesLoading" class="state-box">
      <p>Cargando…</p>
    </div>

    <div v-else-if="quotes.length === 0" class="state-box state-box--empty">
      <p>Aún no tienes cotizaciones. Crea la primera.</p>
      <button class="primary-action" type="button" @click="goToNewQuote">
        + Nueva Cotización
      </button>
    </div>

    <template v-else>
      <section class="kpi-section">
        <div class="kpi-section-header">
          <h2 class="kpi-title">Resumen rápido</h2>
          <div class="segmented-control">
            <button
              type="button"
              class="segmented-option"
              :class="{ active: kpiPeriod === 'month' }"
              @click="kpiPeriod = 'month'"
            >
              Este mes
            </button>
            <button
              type="button"
              class="segmented-option"
              :class="{ active: kpiPeriod === 'all' }"
              @click="kpiPeriod = 'all'"
            >
              Histórico
            </button>
          </div>
        </div>
        <div class="kpi-grid">
          <article class="kpi-card">
            <div class="kpi-icon kpi-icon-money">💰</div>
            <div class="kpi-content">
              <p class="kpi-label">{{ totalQuotedLabel }}</p>
              <p class="kpi-value">{{ totalQuoted }}</p>
              <p class="kpi-sub">Basado en cotizaciones registradas</p>
            </div>
          </article>

          <article
            class="kpi-card kpi-card--clickable"
            role="link"
            tabindex="0"
            @click="goToQuotesFilter('accepted')"
            @keydown.enter.prevent="goToQuotesFilter('accepted')"
          >
            <div class="kpi-icon kpi-icon-approved">🏆</div>
            <div class="kpi-content">
              <p class="kpi-label">{{ totalApprovedLabel }}</p>
              <p class="kpi-value">{{ totalApprovedQuoted }}</p>
              <p class="kpi-sub">{{ totalApprovedSubLabel }}</p>
            </div>
          </article>

          <article
            class="kpi-card kpi-card--clickable"
            role="link"
            tabindex="0"
            @click="goToQuotesFilter('all')"
            @keydown.enter.prevent="goToQuotesFilter('all')"
          >
            <div class="kpi-icon kpi-icon-docs">📄</div>
            <div class="kpi-content">
              <p class="kpi-label">{{ quotesCountLabel }}</p>
              <p class="kpi-value">{{ quotesCount }}</p>
              <p class="kpi-sub">{{ quotesCountSubLabel }}</p>
            </div>
          </article>

          <article
            class="kpi-card kpi-card--clickable"
            role="link"
            tabindex="0"
            @click="goToQuotesFilter('pending')"
            @keydown.enter.prevent="goToQuotesFilter('pending')"
          >
            <div class="kpi-icon kpi-icon-pending">🔄</div>
            <div class="kpi-content">
              <p class="kpi-label">Cotizaciones pendientes</p>
              <p class="kpi-value">{{ pendingQuotesCount }}</p>
              <p class="kpi-sub">A la espera de respuesta</p>
            </div>
          </article>

          <article
            class="kpi-card kpi-card--clickable"
            role="link"
            tabindex="0"
            @click="goToQuotesFilter('accepted')"
            @keydown.enter.prevent="goToQuotesFilter('accepted')"
          >
            <div class="kpi-icon kpi-icon-done">✅</div>
            <div class="kpi-content">
              <p class="kpi-label">{{ acceptedCountLabel }}</p>
              <p class="kpi-value">{{ acceptedCount }}</p>
              <p class="kpi-sub">{{ acceptedSubLabel }}</p>
            </div>
          </article>

          <article
            class="kpi-card kpi-card--clickable"
            role="link"
            tabindex="0"
            @click="goToQuotesFilter('por-cobrar')"
            @keydown.enter.prevent="goToQuotesFilter('por-cobrar')"
          >
            <div class="kpi-icon kpi-icon-receivable">🧾</div>
            <div class="kpi-content">
              <p class="kpi-label">{{ porCobrarLabel }}</p>
              <p class="kpi-value">{{ porCobrarTotal }}</p>
              <p class="kpi-sub">{{ porCobrarSubLabel }}</p>
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

        <div
          v-if="recentGroups.length === 0"
          class="state-box state-box--inline"
        >
          <p>No hay cotizaciones recientes para mostrar.</p>
        </div>

        <div v-else class="recent-groups">
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
                role="button"
                tabindex="0"
                @click="openQuote(quote.id)"
                @keydown.enter.prevent="openQuote(quote.id)"
                @keydown.space.prevent="openQuote(quote.id)"
              >
                <div class="recent-main">
                  <p class="recent-title-text">
                    {{ quote.client }}
                  </p>
                  <p v-if="quote.quoteNumber" class="recent-client">
                    {{ quote.quoteNumber }}
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "../composables/useApi";
import { useUserStore } from "../stores/index";
import { useToastStore } from "../stores/toast";
import { formatCurrency } from "../utils/format";

type QuoteStatus = "pending" | "accepted" | "rejected";

type QuoteFromApi = {
  id: string;
  quoteNumber?: string;
  client?: {
    name?: string;
    reference?: string;
    project?: string;
  };
  amount?: number;
  paidAmount?: number;
  writtenOff?: boolean;
  status?: QuoteStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type RecentQuoteItem = {
  id: string;
  quoteNumber: string;
  client: string;
  amount: string;
  status: QuoteStatus;
  statusLabel: string;
  updatedLabel: string;
  updatedAt: Date;
};

const router = useRouter();
const api = useApi();
const userStore = useUserStore();
const toastStore = useToastStore();

const quotes = ref<QuoteFromApi[]>([]);
const quotesLoading = ref(true);
const kpiPeriod = ref<"month" | "all">("month");

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

const displayName = computed(() => {
  if (userStore.displayName) return userStore.displayName;
  if (userStore.user?.email) return userStore.user.email;
  return "usuario";
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

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === "object" && raw !== null) {
    const sec =
      (raw as { seconds?: number; _seconds?: number }).seconds ??
      (raw as { seconds?: number; _seconds?: number })._seconds;
    if (typeof sec === "number") return new Date(sec * 1000);
  }
  return null;
}

function quoteCreatedAt(q: QuoteFromApi): Date | null {
  return parseDate(q.createdAt) ?? parseDate(q.updatedAt);
}

function quoteUpdatedAt(q: QuoteFromApi): Date | null {
  return parseDate(q.updatedAt) ?? parseDate(q.createdAt);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInCurrentMonth(d: Date, now: Date): boolean {
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - diff);
  return start;
}

function normalizeStatus(raw?: QuoteStatus): QuoteStatus {
  if (raw && QUOTE_STATUS_LABELS[raw]) return raw;
  return "pending";
}

function formatRelativeUpdated(d: Date, now: Date): string {
  if (isSameCalendarDay(d, now)) {
    const diffMs = Math.max(0, now.getTime() - d.getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Hace un momento";
    if (mins < 60) {
      return `Hace ${mins} minuto${mins === 1 ? "" : "s"}`;
    }
    const hrs = Math.floor(mins / 60);
    return `Hace ${hrs} hora${hrs === 1 ? "" : "s"}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(d, yesterday)) {
    const time = new Intl.DateTimeFormat("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return `Ayer, ${time}`;
  }

  const weekStart = startOfWeekMonday(now);
  if (d >= weekStart) {
    const days = Math.floor(
      (startOfDay(now).getTime() - startOfDay(d).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (days <= 6) {
      return `Hace ${days} día${days === 1 ? "" : "s"}`;
    }
  }

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupLabelForDate(d: Date, now: Date): string {
  if (isSameCalendarDay(d, now)) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(d, yesterday)) return "Ayer";

  const weekStart = startOfWeekMonday(now);
  if (d >= weekStart) return "Esta semana";

  return "Anteriores";
}

const nowRef = computed(() => new Date());

const quotesForKpiPeriod = computed(() => {
  if (kpiPeriod.value === "all") return quotes.value;
  const now = nowRef.value;
  return quotes.value.filter((q) => {
    const created = quoteCreatedAt(q);
    return created ? isInCurrentMonth(created, now) : false;
  });
});

const totalQuotedLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Total cotizado este mes"
    : "Total cotizado (histórico)",
);

const totalQuoted = computed(() => {
  const sum = quotesForKpiPeriod.value.reduce(
    (acc, q) => acc + (Number(q.amount) || 0),
    0,
  );
  return formatCurrency(sum);
});

const acceptedQuotesForPeriod = computed(() => {
  const source =
    kpiPeriod.value === "month" ? quotesForKpiPeriod.value : quotes.value;
  return source.filter((q) => normalizeStatus(q.status) === "accepted");
});

const totalApprovedLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Total cotizado aprobado este mes"
    : "Total cotizado aprobado (histórico)",
);

const totalApprovedSubLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Suma de cotizaciones aceptadas del mes"
    : "Suma histórica de cotizaciones aceptadas",
);

const totalApprovedQuoted = computed(() => {
  const sum = acceptedQuotesForPeriod.value.reduce(
    (acc, q) => acc + (Number(q.amount) || 0),
    0,
  );
  return formatCurrency(sum);
});

const quotesCountLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Cotizaciones este mes"
    : "Cotizaciones totales",
);

const quotesCountSubLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Creadas en el mes calendario actual"
    : "Todas las cotizaciones registradas",
);

const quotesCount = computed(() => quotesForKpiPeriod.value.length);

// Pendientes: siempre el total actual con status pending, sin acotar por periodo
// (es un estado vigente, no tiene sentido filtrar por mes de creación).
const pendingQuotesCount = computed(
  () =>
    quotes.value.filter((q) => normalizeStatus(q.status) === "pending").length,
);

const acceptedCountLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Cotizaciones aceptadas este mes"
    : "Cotizaciones aceptadas (totales)",
);

const acceptedSubLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Aceptadas creadas este mes"
    : "Aceptadas en total histórico",
);

const acceptedCount = computed(() => acceptedQuotesForPeriod.value.length);

function quoteOutstanding(q: QuoteFromApi): number {
  if (normalizeStatus(q.status) !== "accepted" || q.writtenOff) return 0;
  const amount = Number(q.amount) || 0;
  const paid = Number(q.paidAmount) || 0;
  const diff = amount - paid;
  return diff > 0 ? diff : 0;
}

const porCobrarSource = computed(() => {
  const source =
    kpiPeriod.value === "month" ? quotesForKpiPeriod.value : quotes.value;
  return source.filter((q) => normalizeStatus(q.status) === "accepted");
});

const porCobrarLabel = computed(() =>
  kpiPeriod.value === "month" ? "Por cobrar este mes" : "Por cobrar (total)",
);

const porCobrarSubLabel = computed(() =>
  kpiPeriod.value === "month"
    ? "Aceptadas del mes con saldo pendiente"
    : "Saldo pendiente histórico",
);

const porCobrarTotal = computed(() => {
  const sum = porCobrarSource.value.reduce(
    (acc, q) => acc + quoteOutstanding(q),
    0,
  );
  return formatCurrency(sum);
});

const recentGroups = computed(() => {
  const now = nowRef.value;
  const sorted = [...quotes.value]
    .map((q) => {
      const updated = quoteUpdatedAt(q);
      if (!updated) return null;
      const status = normalizeStatus(q.status);
      return {
        id: q.id,
        quoteNumber: q.quoteNumber?.trim() ?? "",
        client: q.client?.name?.trim() || "Sin cliente",
        amount: formatCurrency(Number(q.amount) || 0),
        status,
        statusLabel: QUOTE_STATUS_LABELS[status],
        updatedLabel: formatRelativeUpdated(updated, now),
        updatedAt: updated,
      } satisfies RecentQuoteItem;
    })
    .filter((item): item is RecentQuoteItem => item !== null)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);

  const groupOrder = ["Hoy", "Ayer", "Esta semana", "Anteriores"] as const;
  const buckets = new Map<string, RecentQuoteItem[]>();

  for (const item of sorted) {
    const label = groupLabelForDate(item.updatedAt, now);
    const list = buckets.get(label) ?? [];
    list.push(item);
    buckets.set(label, list);
  }

  return groupOrder
    .filter((label) => (buckets.get(label)?.length ?? 0) > 0)
    .map((label) => ({
      label,
      items: buckets.get(label) ?? [],
    }));
});

const goToNewQuote = () => {
  router.push("/cotizaciones/nueva");
};

function goToQuotesFilter(filter: string) {
  router.push({
    path: "/cotizaciones",
    query: { filter, period: kpiPeriod.value },
  });
}

function openQuote(id: string) {
  router.push({ name: "EditQuote", params: { id } });
}

async function fetchQuotes() {
  quotesLoading.value = true;
  try {
    const result = await api.get("/api/quotes");
    quotes.value = (result?.data ?? []) as QuoteFromApi[];
  } catch (e: unknown) {
    quotes.value = [];
    toastStore.show(
      e instanceof Error ? e.message : "Error al cargar cotizaciones.",
      "error",
    );
  } finally {
    quotesLoading.value = false;
  }
}

onMounted(() => {
  // Backup: field roles must never fetch admin quotes (guard should prevent mount).
  if (userStore.isFieldRole) return;
  void fetchQuotes();
});
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
  border-radius: 8px;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.35);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease-out;
}

.primary-action:hover:not(:disabled) {
  background: #1d4ed8;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.45);
  transform: translateY(-1px);
}

.primary-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.state-box {
  padding: 2rem 1.25rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
  color: #64748b;
}

.state-box p {
  margin: 0;
}

.state-box--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.state-box--inline {
  margin-top: 0.25rem;
}

.kpi-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.kpi-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.kpi-title {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}

.segmented-control {
  display: inline-flex;
  padding: 4px;
  border-radius: 12px;
  background: #eef2f6;
  gap: 2px;
}

.segmented-option {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.segmented-option:focus-visible {
  box-shadow: 0 0 0 2px rgba(5, 63, 81, 0.35);
}

.segmented-option.active {
  background: #ffffff;
  color: #053f51;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
}

.segmented-option.active:focus-visible {
  box-shadow:
    0 2px 8px rgba(15, 23, 42, 0.12),
    0 0 0 2px rgba(5, 63, 81, 0.35);
}

.segmented-option:hover:not(.active) {
  color: #334155;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.kpi-card--clickable {
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.kpi-card--clickable:hover,
.kpi-card--clickable:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
  border-color: #cbd5e1;
  outline: none;
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

.kpi-icon-approved {
  background: rgba(22, 163, 74, 0.16);
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

.kpi-icon-receivable {
  background: rgba(249, 115, 22, 0.14);
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
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.recent-item:hover,
.recent-item:focus-visible {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  outline: none;
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

@media (max-width: 400px) {
  .kpi-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
