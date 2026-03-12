<template>
  <div class="page">
    <Transition name="pdf-overlay">
      <div
        v-if="pdfDownloading"
        class="pdf-download-overlay"
        role="status"
        aria-live="polite"
        aria-label="Descargando PDF"
      >
        <div class="pdf-download-overlay__box">
          <div class="pdf-download-overlay__spinner" aria-hidden="true"></div>
          <p class="pdf-download-overlay__text">Descargando PDF…</p>
        </div>
      </div>
    </Transition>

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
        <div class="actions-right">
          <button class="primary-action" type="button" @click="goToNewQuote">
            + Nueva cotización
          </button>
        </div>
      </div>
    </header>

    <section class="list-section">
      <div v-if="quotesLoading" class="list-empty">
        <p>Cargando cotizaciones...</p>
      </div>
      <div v-else-if="quotesError" class="list-empty">
        <p>{{ quotesError }}</p>
        <button class="primary-action" type="button" @click="fetchQuotes">
          Reintentar
        </button>
      </div>
      <div v-else-if="filteredQuotes.length === 0" class="list-empty">
        <p>
          {{
            searchQuery.trim()
              ? "No hay cotizaciones que coincidan con la búsqueda."
              : "Aún no hay cotizaciones."
          }}
        </p>
        <button class="primary-action" @click="goToNewQuote">
          {{
            searchQuery.trim() ? "Nueva cotización" : "Crear primera cotización"
          }}
        </button>
      </div>

      <ul v-else class="quote-list">
        <li
          v-for="quote in filteredQuotes"
          :key="quote.id"
          class="quote-item"
          :class="{ 'menu-open': openMenuId === quote.id }"
          @click="openQuote(quote)"
        >
          <div class="quote-main">
            <p class="quote-number" v-if="quote.quoteNumber">
              {{ quote.quoteNumber }}
            </p>
            <p class="quote-title">{{ quote.title }}</p>
            <p class="quote-client">{{ quote.client }}</p>
            <p v-if="quote.reference || quote.project" class="quote-ref">
              <span v-if="quote.reference">{{ quote.reference }}</span>
              <span v-if="quote.reference && quote.project"> · </span>
              <span v-if="quote.project">{{ quote.project }}</span>
            </p>
          </div>
          <div class="quote-meta">
            <div class="status-badge-wrap" @click.stop>
              <button
                type="button"
                class="status-badge"
                :class="`status-badge--${quote.status}`"
                aria-haspopup="listbox"
                :aria-expanded="openStatusId === quote.id"
                @click="toggleStatusDropdown(quote.id)"
              >
                <span class="status-badge-dot" aria-hidden="true"></span>
                {{ quote.statusLabel }}
                <span class="status-badge-chevron" aria-hidden="true">▼</span>
              </button>
              <transition name="dropdown-fade">
                <div
                  v-show="openStatusId === quote.id"
                  class="status-dropdown"
                  role="listbox"
                >
                  <button
                    type="button"
                    role="option"
                    :aria-selected="quote.status === 'pending'"
                    class="status-dropdown-option status-dropdown-option--pending"
                    @click="onChangeStatus(quote, 'pending')"
                  >
                    <span class="status-option-dot"></span>
                    Pendiente
                  </button>
                  <button
                    type="button"
                    role="option"
                    :aria-selected="quote.status === 'accepted'"
                    class="status-dropdown-option status-dropdown-option--accepted"
                    @click="onChangeStatus(quote, 'accepted')"
                  >
                    <span class="status-option-dot"></span>
                    Aceptada
                  </button>
                  <button
                    type="button"
                    role="option"
                    :aria-selected="quote.status === 'rejected'"
                    class="status-dropdown-option status-dropdown-option--rejected"
                    @click="onChangeStatus(quote, 'rejected')"
                  >
                    <span class="status-option-dot"></span>
                    Rechazada
                  </button>
                </div>
              </transition>
            </div>
            <div class="quote-menu-wrap" @click.stop>
                <button
                  type="button"
                  class="quote-menu-btn"
                  :aria-expanded="openMenuId === quote.id"
                  aria-haspopup="true"
                  aria-label="Abrir menú"
                  @click="toggleMenu(quote.id)"
                >
                  <span class="quote-menu-dots" aria-hidden="true">⋯</span>
                </button>
                <div
                  v-if="openMenuId === quote.id"
                  class="quote-menu-dropdown"
                  role="menu"
                >
                  <button
                    type="button"
                    class="quote-menu-option"
                    role="menuitem"
                    @click="onEdit(quote)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="quote-menu-option"
                    role="menuitem"
                    :disabled="pdfDownloading"
                    @click="onDownloadPdf(quote)"
                  >
                    {{ pdfDownloading ? "Descargando…" : "Descargar PDF" }}
                  </button>
                  <button
                    type="button"
                    class="quote-menu-option quote-menu-option--danger"
                    role="menuitem"
                    @click="onDelete(quote)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            <span class="quote-amount">{{ quote.amount }}</span>
          </div>
        </li>
      </ul>
    </section>

    <div ref="pdfContainerRef" class="pdf-download-mount" aria-hidden="true">
      <QuotePdfTemplate
        v-if="pdfDownloadPayload"
        :payload="pdfDownloadPayload"
      />
    </div>

    <AppModal
      v-model="showDeleteModal"
      title="¿Eliminar cotización?"
      variant="danger"
    >
      <p class="delete-modal-intro">
        ¿Está seguro que desea eliminar la cotización? Esta acción no se puede
        deshacer.
      </p>
      <dl v-if="quoteToDelete" class="delete-modal-details">
        <dt>Cliente</dt>
        <dd>{{ quoteToDelete.client }}</dd>
        <dt v-if="quoteToDelete.reference">Referencia</dt>
        <dd v-if="quoteToDelete.reference">{{ quoteToDelete.reference }}</dd>
        <dt v-if="quoteToDelete.project">Proyecto</dt>
        <dd v-if="quoteToDelete.project">{{ quoteToDelete.project }}</dd>
      </dl>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="showDeleteModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="deleting"
          @click="confirmDelete"
        >
          {{ deleting ? "Eliminando…" : "Eliminar" }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import html2pdf from "html2pdf.js";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";
import { useOrganizationStore } from "../stores/organization";
import AppModal from "../components/AppModal.vue";
import QuotePdfTemplate, {
  type QuotePdfPayload,
} from "../components/QuotePdfTemplate.vue";
import { formatCurrency } from "../utils/format";

const router = useRouter();
const api = useApi();
const toast = useToastStore();
const organizationStore = useOrganizationStore();
const searchQuery = ref("");
const openMenuId = ref<string | null>(null);
const openStatusId = ref<string | null>(null);
const showDeleteModal = ref(false);
const quoteToDelete = ref<QuoteRow | null>(null);
const deleting = ref(false);
const pdfContainerRef = ref<HTMLElement | null>(null);
const pdfDownloadPayload = ref<QuotePdfPayload | null>(null);
const pdfDownloading = ref(false);

function formatQuoteDateForPdf(raw: unknown): string {
  if (!raw) return "";
  let date: Date;
  if (typeof raw === "string") {
    date = new Date(raw);
  } else if (
    typeof raw === "object" &&
    raw !== null &&
    (typeof (raw as { seconds?: number }).seconds === "number" ||
      typeof (raw as { _seconds?: number })._seconds === "number")
  ) {
    const sec =
      (raw as { seconds?: number }).seconds ??
      (raw as { _seconds?: number })._seconds;
    date = new Date((sec ?? 0) * 1000);
  } else {
    return "";
  }
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function toggleMenu(quoteId: string) {
  openMenuId.value = openMenuId.value === quoteId ? null : quoteId;
}

function closeMenu() {
  openMenuId.value = null;
}

function onStatusDropdownClickOutside(event: MouseEvent) {
  if (
    openStatusId.value &&
    !(event.target as Element)?.closest(".status-badge-wrap")
  ) {
    openStatusId.value = null;
  }
}

watch(openStatusId, (open: string | null) => {
  if (open) {
    setTimeout(() => {
      document.addEventListener("click", onStatusDropdownClickOutside);
    }, 0);
  } else {
    document.removeEventListener("click", onStatusDropdownClickOutside);
  }
});

function handleClickOutside(event: MouseEvent) {
  if (
    openMenuId.value &&
    !(event.target as Element)?.closest(".quote-menu-wrap")
  ) {
    closeMenu();
  }
}

type QuoteItem = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  quantity: number;
  price: number;
};

type QuoteFromApi = {
  id: string;
  quoteNumber?: string;
  client: {
    name?: string;
    document?: string;
    reference?: string;
    project?: string;
  };
  items: QuoteItem[];
  discount: number;
  amount: number;
  status?: "pending" | "accepted" | "rejected";
};

type QuoteRow = {
  id: string;
  quoteNumber: string;
  title: string;
  client: string;
  reference: string;
  project: string;
  amount: string;
  status: string;
  statusLabel: string;
};

function totalFromQuote(q: QuoteFromApi): number {
  return q.amount;
}

const QUOTE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

function mapQuoteToRow(q: QuoteFromApi): QuoteRow {
  const total = totalFromQuote(q);
  const ref = q.client?.reference?.trim() ?? "";
  const proj = q.client?.project?.trim() ?? "";
  const title = ref || proj || `Cotización - ${q.client?.name ?? "Sin nombre"}`;
  const status =
    q.status && QUOTE_STATUS_LABELS[q.status] ? q.status : "pending";
  return {
    id: q.id,
    quoteNumber: q.quoteNumber ?? "",
    title,
    client: q.client?.name ?? "—",
    reference: ref,
    project: proj,
    amount: formatCurrency(total),
    status,
    statusLabel: QUOTE_STATUS_LABELS[status] ?? "Pendiente",
  };
}

const quotes = ref<QuoteRow[]>([]);
const quotesLoading = ref(true);
const quotesError = ref<string | null>(null);

async function fetchQuotes() {
  quotesLoading.value = true;
  quotesError.value = null;
  try {
    const result = await api.get("/api/quotes");
    const data = (result?.data ?? []) as QuoteFromApi[];
    quotes.value = data.map(mapQuoteToRow);
  } catch (err: any) {
    quotesError.value = err?.message ?? "Error al cargar cotizaciones";
    quotes.value = [];
  } finally {
    quotesLoading.value = false;
  }
}

const goToNewQuote = () => {
  router.push("/cotizaciones/nueva");
};

const filteredQuotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return quotes.value;
  return quotes.value.filter(
    (quote) =>
      (quote.quoteNumber && quote.quoteNumber.toLowerCase().includes(q)) ||
      quote.title.toLowerCase().includes(q) ||
      quote.client.toLowerCase().includes(q) ||
      quote.reference.toLowerCase().includes(q) ||
      quote.project.toLowerCase().includes(q),
  );
});

const openQuote = (quote: QuoteRow) => {
  router.push({ name: "EditQuote", params: { id: quote.id } });
};

function onEdit(quote: QuoteRow) {
  closeMenu();
  router.push({ name: "EditQuote", params: { id: quote.id } });
}

function toggleStatusDropdown(quoteId: string) {
  openStatusId.value = openStatusId.value === quoteId ? null : quoteId;
}

async function onChangeStatus(
  quote: QuoteRow,
  newStatus: "pending" | "accepted" | "rejected",
) {
  if (quote.status === newStatus) {
    openStatusId.value = null;
    return;
  }

  const oldStatus = quote.status;
  const oldLabel = quote.statusLabel;
  const newLabel = QUOTE_STATUS_LABELS[newStatus] ?? newStatus;

  // Optimistic update
  quotes.value = quotes.value.map((q) =>
    q.id === quote.id ? { ...q, status: newStatus, statusLabel: newLabel } : q,
  );
  openStatusId.value = null;

  try {
    await api.put(`/api/quotes/${quote.id}`, { status: newStatus });

    // Fetch fresh quote from backend to stay fully in sync
    const res = await api.get(`/api/quotes/${quote.id}`);
    const body = res != null ? res : undefined;
    const data =
      body && typeof body === "object" && "data" in body && body.data != null
        ? (body as { data: unknown }).data
        : body;
    const freshQuote = data as QuoteFromApi;
    const freshRow = mapQuoteToRow(freshQuote);

    quotes.value = quotes.value.map((q) =>
      q.id === freshRow.id ? freshRow : q,
    );
  } catch (err: any) {
    // Revert on error
    quotes.value = quotes.value.map((q) =>
      q.id === quote.id ? { ...q, status: oldStatus, statusLabel: oldLabel } : q,
    );
    toast.show(
      err?.message ?? "No se pudo actualizar el estado.",
      "error",
    );
  }
}

async function onDownloadPdf(quote: QuoteRow) {
  closeMenu();
  pdfDownloading.value = true;
  try {
    const res = await api.get(`/api/quotes/${quote.id}`);
    // Backend can return { success: true, data: quote } or the quote object directly
    const body = res != null ? res : undefined;
    const data =
      body && typeof body === "object" && "data" in body && body.data != null
        ? (body as { data: unknown }).data
        : body;
    const quoteData = data as {
      quoteNumber?: string;
      updatedAt?: unknown;
      client?: {
        name?: string;
        document?: string;
        phone?: string;
        email?: string;
        address?: string;
        directedTo?: string;
        reference?: string;
        project?: string;
      };
      items?: {
        id: string;
        code: string;
        name: string;
        subtitle?: string;
        quantity: number;
        price: number;
      }[];
      discount?: number;
      validity?: string;
      deliveryPlace?: string;
      deliveryTime?: string;
      paymentMethod?: string;
      disclaimer?: string;
      notes?: string;
    };
    if (!quoteData?.client || !Array.isArray(quoteData?.items)) {
      toast.show("No se pudo cargar la cotización para el PDF.", "error");
      return;
    }
    const quoteDateFormatted = formatQuoteDateForPdf(quoteData.updatedAt);
    const payload: QuotePdfPayload = {
      quote: {
        client: quoteData.client,
        items: quoteData.items,
        discount: Number(quoteData.discount) ?? 0,
        quoteNumber: quoteData.quoteNumber,
        quoteDate: quoteDateFormatted || undefined,
        validity: quoteData.validity,
        deliveryPlace: quoteData.deliveryPlace,
        deliveryTime: quoteData.deliveryTime,
        paymentMethod: quoteData.paymentMethod,
        disclaimer: quoteData.disclaimer,
        notes: quoteData.notes,
      },
      organization: organizationStore.organization,
    };
    pdfDownloadPayload.value = payload;
    await nextTick();
    await new Promise((r) => setTimeout(r, 300));
    const el = pdfContainerRef.value?.querySelector(".quote-pdf-root");
    if (!el) {
      toast.show("Error al generar el PDF.", "error");
      return;
    }
    const opt = {
      margin: 0,
      filename: "cotizacion-geomtech.pdf",
      image: { type: "jpeg" as const, quality: 1.0 },
      html2canvas: { scale: 2.2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["css"] as const },
    };
    const worker = html2pdf()
      .set(opt)
      .from(el as HTMLElement);
    await worker
      .toPdf()
      .get("pdf")
      .then(
        (pdf: {
          internal: { getNumberOfPages: () => number };
          deletePage: (n: number) => void;
        }) => {
          const totalPages = pdf.internal.getNumberOfPages();
          if (totalPages > 1) pdf.deletePage(totalPages);
        },
      );
    await worker.save();
    toast.show("PDF descargado.", "success");
  } catch (err: unknown) {
    toast.show(
      err instanceof Error ? err.message : "Error al generar el PDF.",
      "error",
    );
  } finally {
    pdfDownloadPayload.value = null;
    pdfDownloading.value = false;
  }
}

function onDelete(quote: QuoteRow) {
  closeMenu();
  quoteToDelete.value = quote;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!quoteToDelete.value) return;
  const id = quoteToDelete.value.id;
  deleting.value = true;
  try {
    await api.delete(`/api/quotes/${id}`);
    toast.show("Cotización eliminada.", "success");
    showDeleteModal.value = false;
    quoteToDelete.value = null;
    await fetchQuotes();
  } catch (err: any) {
    toast.show(err?.message ?? "Error al eliminar la cotización.", "error");
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  fetchQuotes();
});
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.pdf-download-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.pdf-download-overlay__box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 2rem;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.pdf-download-overlay__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #0f9f70;
  border-radius: 50%;
  animation: pdf-overlay-spin 0.8s linear infinite;
}

.pdf-download-overlay__text {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: #334155;
}

@keyframes pdf-overlay-spin {
  to {
    transform: rotate(360deg);
  }
}

.pdf-overlay-enter-active,
.pdf-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.pdf-overlay-enter-from,
.pdf-overlay-leave-to {
  opacity: 0;
}

.pdf-download-mount {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 210mm;
  z-index: -1;
  pointer-events: none;
}

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

.actions-right {
  margin-left: auto;
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
  position: relative;
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

.quote-number {
  display: inline-block;
  width: auto;
  margin: 0.05rem 0 0.3rem 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  background: #e5edff;
  border-radius: 999px;
  padding: 0.2rem 0.8rem;
  flex-shrink: 0;
}

.quote-title {
  margin: 0;
  padding-left: 0.35rem;
  font-size: 1rem;
  font-weight: 500;
  color: #0f172a;
}

.quote-client {
  margin: 0.25rem 0 0 0;
  padding-left: 0.35rem;
  font-size: 0.85rem;
  color: #64748b;
}

.quote-ref {
  margin: 0.2rem 0 0 0;
  padding-left: 0.35rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.quote-meta {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  align-self: stretch;
  flex-shrink: 0;
}

.quote-menu-wrap {
  position: relative;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.quote-item:hover .quote-menu-wrap,
.quote-item.menu-open .quote-menu-wrap {
  opacity: 1;
}

.quote-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.quote-menu-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.quote-menu-dots {
  font-size: 1.25rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.05em;
}

.quote-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  min-width: 10rem;
  padding: 0.35rem 0;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
  z-index: 20;
}

.quote-menu-option {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  font-size: 0.9rem;
  color: #334155;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s ease;
}

.quote-menu-option:hover {
  background: #f8fafc;
}

.quote-menu-option--danger:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.quote-amount {
  font-size: 1rem;
  font-weight: 600;
  color: #053f51;
}

/* Status badge / dropdown – same look as Edit view */
.status-badge-wrap {
  position: relative;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    transform 0.1s ease;
}

.status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.status-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge--pending {
  background: rgba(234, 179, 8, 0.15);
  color: #b45309;
  border-color: rgba(234, 179, 8, 0.35);
}
.status-badge--pending .status-badge-dot {
  background: #b45309;
}

.status-badge--accepted {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.35);
}
.status-badge--accepted .status-badge-dot {
  background: #15803d;
}

.status-badge--rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.3);
}
.status-badge--rejected .status-badge-dot {
  background: #b91c1c;
}

.status-badge-chevron {
  font-size: 0.55rem;
  opacity: 0.8;
}

.status-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: auto;
  min-width: 140px;
  padding: 0.35rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  border: 1px solid #e2e8f0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.status-dropdown-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.status-dropdown-option:hover {
  background: #f1f5f9;
}

.status-dropdown-option--pending .status-option-dot {
  background: #b45309;
}
.status-dropdown-option--accepted .status-option-dot {
  background: #15803d;
}
.status-dropdown-option--rejected .status-option-dot {
  background: #b91c1c;
}

.status-option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
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

.delete-modal-intro {
  margin: 0 0 1rem 0;
  color: #334155;
}

.delete-modal-details {
  margin: 0;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 0.9rem;
}

.delete-modal-details dt {
  margin: 0.5rem 0 0.15rem 0;
  font-weight: 600;
  color: #64748b;
}

.delete-modal-details dt:first-child {
  margin-top: 0;
}

.delete-modal-details dd {
  margin: 0;
  color: #0f172a;
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
    justify-content: flex-end;
  }
}
</style>
