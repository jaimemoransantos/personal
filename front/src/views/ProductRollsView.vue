<template>
  <div class="page">
    <nav class="page-back">
      <button
        type="button"
        class="back-link"
        @click="router.push('/inventario')"
      >
        <span aria-hidden="true">←</span>
        Volver a inventario
      </button>
    </nav>

    <header class="detail-header">
      <h1 class="page-title">{{ productTitle }}</h1>
      <p
        v-if="!loading && !error && productType === 'roll'"
        class="stock-total"
      >
        <span class="stock-total-value">{{
          formatArea(totalAvailableArea)
        }}</span>
        <span class="stock-total-unit">m² disponibles</span>
      </p>
      <p
        v-else-if="!loading && !error && productType === 'unit'"
        class="stock-total"
      >
        <span class="stock-total-value">{{
          formatUnits(unitStockQuantity)
        }}</span>
        <span class="stock-total-unit">unidades disponibles</span>
      </p>
    </header>

    <div v-if="productType === 'roll' && showSearch" class="rolls-toolbar">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Buscar por código o lote…"
      />
    </div>

    <p v-if="loading" class="rolls-status">Cargando…</p>
    <p v-else-if="error" class="rolls-error">{{ error }}</p>

    <!-- Unit product: summary + expandable movement history -->
    <template v-else-if="productType === 'unit'">
      <section class="roll-card">
        <div class="roll-card-row">
          <div class="roll-col">
            <span class="roll-col-label">Código</span>
            <p class="roll-col-value code-value">
              {{ unitProductCode || "—" }}
            </p>
          </div>
          <div class="roll-col roll-col--area">
            <span class="roll-col-label">Stock</span>
            <p class="roll-area">
              {{ formatUnits(unitStockQuantity) }}
              <span class="roll-area-of">u</span>
            </p>
          </div>
        </div>

        <div class="history-toggle-row">
          <button
            v-if="unitMovementsLoading"
            type="button"
            class="history-toggle"
            disabled
          >
            Cargando historial…
          </button>
          <button
            v-else-if="unitMovements.length === 0 && !unitMovementsError"
            type="button"
            class="history-toggle history-toggle--empty"
            disabled
          >
            Sin movimientos todavía
          </button>
          <button
            v-else
            type="button"
            class="history-toggle"
            :aria-expanded="unitHistoryExpanded"
            @click="unitHistoryExpanded = !unitHistoryExpanded"
          >
            <span aria-hidden="true" class="history-toggle-chevron">
              {{ unitHistoryExpanded ? "▾" : "▸" }}
            </span>
            {{
              unitHistoryExpanded
                ? `Ocultar historial (${unitMovements.length})`
                : `Ver historial (${unitMovements.length} movimiento${
                    unitMovements.length === 1 ? "" : "s"
                  })`
            }}
          </button>
        </div>

        <transition name="accordion-fade">
          <section
            v-show="unitHistoryExpanded"
            class="history-section history-accordion"
          >
            <p v-if="unitMovementsError" class="history-error">
              {{ unitMovementsError }}
            </p>
            <p v-else-if="unitMovements.length === 0" class="history-empty">
              Este producto no tiene movimientos todavía.
            </p>
            <ul v-else class="history-list">
              <li
                v-for="m in unitMovements"
                :key="m.id"
                class="history-item"
                :class="{ 'history-item--reversed': m.reversed }"
              >
                <div class="history-item-main">
                  <div class="history-item-top">
                    <span
                      class="history-kind"
                      :class="
                        m.type === 'in'
                          ? 'history-kind--in'
                          : 'history-kind--out'
                      "
                    >
                      {{ m.type === "in" ? "Entrada" : "Salida" }}
                    </span>
                    <span v-if="m.reversed" class="history-reversed-badge">
                      Revertido
                    </span>
                    <span
                      v-if="m.type === 'out' && m.projectId"
                      class="history-project"
                    >
                      <router-link
                        :to="`/proyectos/${m.projectId}`"
                        class="history-project-link"
                      >
                        {{ m.projectName || "Proyecto" }}
                      </router-link>
                    </span>
                    <span
                      v-else-if="m.type === 'in'"
                      class="history-project muted"
                    >
                      Ingreso a stock
                    </span>
                  </div>
                  <p class="history-meta">
                    <span>{{ formatUnits(m.quantity) }} u.</span>
                    <span aria-hidden="true">·</span>
                    <span>{{ formatDateTime(m.createdAt) }}</span>
                    <span aria-hidden="true">·</span>
                    <span>{{ performerLabel(m) }}</span>
                    <template v-if="isAdmin && m.totalCost != null">
                      <span aria-hidden="true">·</span>
                      <span>{{ formatCurrency(m.totalCost) }}</span>
                    </template>
                  </p>
                </div>
                <button
                  v-if="isAdmin && m.type === 'out' && !m.reversed"
                  type="button"
                  class="btn-secondary btn-sm history-reverse-btn"
                  :disabled="reversing"
                  @click="askReverseUnit(m.id)"
                >
                  Revertir
                </button>
              </li>
            </ul>
          </section>
        </transition>
      </section>
    </template>

    <!-- Roll product: roll cards with per-roll accordion history -->
    <template v-else-if="productType === 'roll'">
      <p v-if="availableRolls.length === 0" class="rolls-status">
        No hay rollos disponibles
      </p>
      <p v-else-if="filteredRolls.length === 0" class="rolls-status">
        No se encontraron rollos con ese criterio
      </p>
      <ul v-else class="rolls-list">
        <li v-for="roll in filteredRolls" :key="roll.id" class="roll-card">
          <div class="roll-card-header">
            <p class="roll-barcode">{{ roll.barcodeValue }}</p>
            <p v-if="roll.batchNumber" class="roll-batch">
              Lote: {{ roll.batchNumber }}
            </p>
          </div>

          <div class="roll-card-row">
            <div class="roll-col roll-col--area">
              <span class="roll-col-label">Disponible</span>
              <p class="roll-area">
                {{ formatArea(roll.remainingArea) }}
                <span class="roll-area-of"
                  >/ {{ formatArea(roll.totalArea) }} m²</span
                >
              </p>
            </div>
            <div class="roll-col">
              <span class="roll-col-label">Dimensiones</span>
              <p class="roll-col-value">
                {{ formatArea(roll.rollLength) }}m ×
                {{ formatArea(roll.rollWidth) }}m
              </p>
            </div>
            <div class="roll-col roll-col--date">
              <span class="roll-col-label">Ingreso</span>
              <p class="roll-col-value">{{ formatIngreso(roll.receivedAt) }}</p>
            </div>
          </div>

          <div
            v-if="isPartial(roll)"
            class="roll-progress"
            role="progressbar"
            :aria-valuenow="remainingPercent(roll)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="roll-progress-fill"
              :style="{ width: `${remainingPercent(roll)}%` }"
            />
          </div>

          <div class="history-toggle-row">
            <button
              v-if="historyLoading[roll.id]"
              type="button"
              class="history-toggle"
              disabled
            >
              Cargando historial…
            </button>
            <button
              v-else-if="
                !historyByRollId[roll.id]?.length && !historyError[roll.id]
              "
              type="button"
              class="history-toggle history-toggle--empty"
              disabled
            >
              Sin retiros todavía
            </button>
            <button
              v-else
              type="button"
              class="history-toggle"
              :aria-expanded="!!expandedRollIds[roll.id]"
              @click="toggleRollHistory(roll.id)"
            >
              <span aria-hidden="true" class="history-toggle-chevron">
                {{ expandedRollIds[roll.id] ? "▾" : "▸" }}
              </span>
              {{ rollHistoryToggleLabel(roll.id) }}
            </button>
          </div>

          <transition name="accordion-fade">
            <section
              v-show="expandedRollIds[roll.id]"
              class="history-section history-accordion"
            >
              <p v-if="historyError[roll.id]" class="history-error">
                {{ historyError[roll.id] }}
              </p>
              <p
                v-else-if="!historyByRollId[roll.id]?.length"
                class="history-empty"
              >
                Este rollo no ha sido retirado todavía.
              </p>
              <ul v-else class="history-list">
                <li
                  v-for="w in historyByRollId[roll.id]"
                  :key="w.id"
                  class="history-item"
                  :class="{ 'history-item--reversed': w.reversed }"
                >
                  <div class="history-item-main">
                    <div class="history-item-top">
                      <router-link
                        v-if="w.projectId"
                        :to="`/proyectos/${w.projectId}`"
                        class="history-project-link"
                      >
                        {{ w.projectName || "Proyecto" }}
                      </router-link>
                      <span v-else class="history-project">
                        {{ w.projectName || "Proyecto" }}
                      </span>
                      <span v-if="w.reversed" class="history-reversed-badge">
                        Revertido
                      </span>
                    </div>
                    <p class="history-meta">
                      <span>{{ formatArea(w.withdrawnArea) }} m²</span>
                      <span aria-hidden="true">·</span>
                      <span>{{ formatDateTime(w.withdrawnAt) }}</span>
                      <span aria-hidden="true">·</span>
                      <span>{{ performerLabel(w) }}</span>
                      <template v-if="isAdmin && w.totalCost != null">
                        <span aria-hidden="true">·</span>
                        <span>{{ formatCurrency(w.totalCost) }}</span>
                      </template>
                    </p>
                  </div>
                  <button
                    v-if="isAdmin && !w.reversed"
                    type="button"
                    class="btn-secondary btn-sm history-reverse-btn"
                    :disabled="reversing"
                    @click="askReverseRoll(roll.id, w.id)"
                  >
                    Revertir
                  </button>
                </li>
              </ul>
            </section>
          </transition>
        </li>
      </ul>
    </template>

    <AppModal
      v-model="showReverseConfirmModal"
      title="¿Revertir este retiro?"
      variant="danger"
    >
      <p>
        El material volverá al inventario y se ajustará el rubro de materiales
        si aplica. Esta acción no se puede deshacer.
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="reversing"
          @click="showReverseConfirmModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="reversing"
          @click="confirmReverse"
        >
          {{ reversing ? "Revirtiendo…" : "Revertir" }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppModal from "../components/AppModal.vue";
import { useApi } from "../composables/useApi";
import {
  useRolls,
  type Roll,
  type RollWithdrawal,
} from "../composables/useRolls";
import {
  useUnitStock,
  type UnitStockMovement,
} from "../composables/useUnitStock";
import { useUserStore } from "../stores/index";
import { useToastStore } from "../stores/toast";
import { formatCurrency } from "../utils/format";

const SEARCH_THRESHOLD = 5;

type ReverseKind = "roll" | "unit";

const route = useRoute();
const router = useRouter();
const api = useApi();
const userStore = useUserStore();
const toastStore = useToastStore();
const { listByProduct, listWithdrawalsByRoll, reverseWithdrawal } = useRolls();
const { listMovementsByProduct, reverseOutMovement } = useUnitStock();

const isAdmin = computed(() => userStore.isAdmin);

const showReverseConfirmModal = ref(false);
const reversePendingKind = ref<ReverseKind | null>(null);
const reversePendingId = ref<string | null>(null);
const reversePendingRollId = ref<string | null>(null);
const reversing = ref(false);

const rolls = ref<Roll[]>([]);
const loading = ref(false);
const error = ref("");
const searchQuery = ref("");

type ProductType = "roll" | "unit" | null;
const productType = ref<ProductType>(null);
const unitProductCode = ref("");
const unitStockQuantity = ref(0);
const unitMovements = ref<UnitStockMovement[]>([]);
const unitMovementsLoading = ref(false);
const unitMovementsError = ref("");
const unitHistoryExpanded = ref(false);

const historyByRollId = reactive<Record<string, RollWithdrawal[]>>({});
const historyLoading = reactive<Record<string, boolean>>({});
const historyError = reactive<Record<string, string>>({});
const expandedRollIds = reactive<Record<string, boolean>>({});

const productId = computed(() => String(route.params.productId ?? ""));

const productTitle = computed(() => {
  const name = route.query.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  const fromRoll = rolls.value.find((r) => r.productName)?.productName;
  return fromRoll || "Detalle de producto";
});

const availableRolls = computed(() => {
  return [...rolls.value]
    .filter((r) => r.remainingArea > 0)
    .sort((a, b) => fechaMs(a.receivedAt) - fechaMs(b.receivedAt));
});

const totalAvailableArea = computed(() =>
  availableRolls.value.reduce(
    (sum, roll) => sum + (Number(roll.remainingArea) || 0),
    0,
  ),
);

const showSearch = computed(
  () =>
    !loading.value &&
    !error.value &&
    availableRolls.value.length >= SEARCH_THRESHOLD,
);

const filteredRolls = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return availableRolls.value;
  return availableRolls.value.filter((roll) => {
    const barcode = (roll.barcodeValue ?? "").toLowerCase();
    const batch = (roll.batchNumber ?? "").toLowerCase();
    return barcode.includes(q) || batch.includes(q);
  });
});

function formatArea(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUnits(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

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

function fechaMs(raw: unknown): number {
  return parseDate(raw)?.getTime() ?? Number.POSITIVE_INFINITY;
}

function formatIngreso(raw: unknown): string {
  const d = parseDate(raw);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTime(raw: unknown): string {
  const d = parseDate(raw);
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function performerLabel(row: {
  performedByName?: string | null;
  performedBy?: string;
}): string {
  if (row.performedByName?.trim()) return row.performedByName.trim();
  if (row.performedBy?.trim()) return row.performedBy.trim();
  return "—";
}

function isPartial(roll: Roll): boolean {
  return (
    Number.isFinite(roll.remainingArea) &&
    Number.isFinite(roll.totalArea) &&
    roll.totalArea > 0 &&
    roll.remainingArea < roll.totalArea
  );
}

function remainingPercent(roll: Roll): number {
  if (!(roll.totalArea > 0)) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((roll.remainingArea / roll.totalArea) * 100)),
  );
}

function toggleRollHistory(rollId: string) {
  expandedRollIds[rollId] = !expandedRollIds[rollId];
}

function rollHistoryToggleLabel(rollId: string): string {
  const count = historyByRollId[rollId]?.length ?? 0;
  const expanded = !!expandedRollIds[rollId];
  if (expanded) {
    return `Ocultar historial (${count})`;
  }
  return `Ver historial (${count} retiro${count === 1 ? "" : "s"})`;
}

async function loadRollHistories(rollList: Roll[]) {
  await Promise.all(
    rollList.map(async (roll) => {
      historyLoading[roll.id] = true;
      historyError[roll.id] = "";
      try {
        historyByRollId[roll.id] = await listWithdrawalsByRoll(roll.id);
      } catch (e: unknown) {
        historyByRollId[roll.id] = [];
        historyError[roll.id] =
          e instanceof Error ? e.message : "No se pudo cargar el historial.";
      } finally {
        historyLoading[roll.id] = false;
      }
    }),
  );
}

async function refreshRollHistory(rollId: string) {
  historyError[rollId] = "";
  try {
    historyByRollId[rollId] = await listWithdrawalsByRoll(rollId);
  } catch (e: unknown) {
    historyError[rollId] =
      e instanceof Error ? e.message : "No se pudo cargar el historial.";
  }
}

function askReverseRoll(rollId: string, withdrawalId: string) {
  if (!isAdmin.value) return;
  reversePendingKind.value = "roll";
  reversePendingId.value = withdrawalId;
  reversePendingRollId.value = rollId;
  showReverseConfirmModal.value = true;
}

function askReverseUnit(movementId: string) {
  if (!isAdmin.value) return;
  reversePendingKind.value = "unit";
  reversePendingId.value = movementId;
  reversePendingRollId.value = null;
  showReverseConfirmModal.value = true;
}

async function refreshUnitStockQuantity() {
  if (!productId.value) return;
  try {
    const productResult = await api.get(
      `/api/products/${encodeURIComponent(productId.value)}`,
    );
    const product = productResult?.data as { stockQuantity?: number } | null;
    unitStockQuantity.value =
      typeof product?.stockQuantity === "number" &&
      Number.isFinite(product.stockQuantity)
        ? product.stockQuantity
        : unitStockQuantity.value;
  } catch {
    /* keep previous stock display */
  }
}

async function confirmReverse() {
  if (!isAdmin.value || reversing.value || !reversePendingId.value) return;
  reversing.value = true;
  try {
    if (reversePendingKind.value === "roll") {
      await reverseWithdrawal(reversePendingId.value);
      toastStore.show("Retiro revertido.", "success");
      showReverseConfirmModal.value = false;
      const rollId = reversePendingRollId.value;
      rolls.value = await listByProduct(productId.value);
      if (rollId) {
        await refreshRollHistory(rollId);
      }
    } else if (reversePendingKind.value === "unit") {
      await reverseOutMovement(reversePendingId.value);
      toastStore.show("Retiro revertido.", "success");
      showReverseConfirmModal.value = false;
      await Promise.all([
        loadUnitMovements(productId.value),
        refreshUnitStockQuantity(),
      ]);
    }
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "No se pudo revertir el retiro.",
      "error",
    );
  } finally {
    reversing.value = false;
  }
}

async function loadUnitMovements(id: string) {
  unitMovementsLoading.value = true;
  unitMovementsError.value = "";
  try {
    unitMovements.value = await listMovementsByProduct(id);
  } catch (e: unknown) {
    unitMovements.value = [];
    unitMovementsError.value =
      e instanceof Error ? e.message : "No se pudieron cargar los movimientos.";
  } finally {
    unitMovementsLoading.value = false;
  }
}

async function loadPage() {
  if (!productId.value) {
    error.value = "Producto no válido.";
    rolls.value = [];
    productType.value = null;
    return;
  }
  loading.value = true;
  error.value = "";
  searchQuery.value = "";
  productType.value = null;
  rolls.value = [];
  unitMovements.value = [];
  unitHistoryExpanded.value = false;
  for (const key of Object.keys(expandedRollIds)) {
    delete expandedRollIds[key];
  }

  try {
    const productResult = await api.get(
      `/api/products/${encodeURIComponent(productId.value)}`,
    );
    const product = productResult?.data as {
      type?: string;
      code?: string;
      name?: string;
      stockQuantity?: number;
    } | null;

    const type = product?.type === "unit" ? "unit" : "roll";

    if (type === "unit") {
      productType.value = "unit";
      unitProductCode.value = product?.code ?? "";
      unitStockQuantity.value =
        typeof product?.stockQuantity === "number" &&
        Number.isFinite(product.stockQuantity)
          ? product.stockQuantity
          : 0;
      loading.value = false;
      await loadUnitMovements(productId.value);
      return;
    }

    productType.value = "roll";
    rolls.value = await listByProduct(productId.value);
    loading.value = false;
    await loadRollHistories(rolls.value.filter((r) => r.remainingArea > 0));
  } catch (e: unknown) {
    rolls.value = [];
    productType.value = null;
    error.value =
      e instanceof Error ? e.message : "No se pudo cargar el producto.";
    loading.value = false;
  }
}

onMounted(() => {
  void loadPage();
});

watch(productId, () => {
  void loadPage();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 100%;
}

.page-back {
  margin-bottom: -0.25rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0;
  border: none;
  background: none;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.back-link:hover {
  color: #0f9f70;
}

.detail-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
}

.page-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #053f51;
}

.stock-total {
  margin: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.stock-total-value {
  font-size: 1.85rem;
  font-weight: 700;
  color: #053f51;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.stock-total-unit {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f9f70;
}

.rolls-toolbar {
  display: flex;
  gap: 0.65rem;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 0;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
  outline: none;
}

.search-input:focus {
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.3);
}

.rolls-status {
  margin: 0;
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
  padding: 2rem 1.25rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
}

.rolls-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.95rem;
  padding: 1rem 1.25rem;
  background: #fef2f2;
  border-radius: 12px;
  border: 1px solid #fecaca;
}

.rolls-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.roll-card {
  padding: 1.1rem 1.25rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.roll-card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.roll-barcode {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  word-break: break-all;
}

.roll-batch {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
}

.roll-card-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  margin-top: 0.85rem;
  flex-wrap: wrap;
}

.roll-card > .roll-card-row:first-child {
  margin-top: 0;
}

.history-toggle-row {
  margin-top: 0.95rem;
  padding-top: 0.85rem;
  border-top: 1px solid #e2e8f0;
}

.history-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #053f51;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.history-toggle:hover:not(:disabled) {
  color: #0f9f70;
}

.history-toggle:disabled {
  cursor: default;
  opacity: 0.85;
}

.history-toggle--empty {
  color: #64748b;
  font-weight: 500;
}

.history-toggle-chevron {
  font-size: 0.75rem;
  line-height: 1;
  width: 0.85rem;
}

.history-accordion {
  margin-top: 0.75rem;
}

.accordion-fade-enter-active,
.accordion-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.accordion-fade-enter-from,
.accordion-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.roll-col {
  min-width: 0;
  flex: 1 1 8rem;
}

.roll-col--area {
  flex: 1.4 1 10rem;
}

.roll-col--date {
  flex: 0.9 1 7rem;
  text-align: right;
}

.roll-col-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.roll-area {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #053f51;
  line-height: 1.2;
}

.roll-area-of {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.roll-col-value {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
  line-height: 1.3;
}

.code-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
}

.roll-progress {
  margin-top: 0.9rem;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.roll-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #053f51;
  transition: width 0.2s ease;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.history-empty {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.history-error {
  margin: 0;
  font-size: 0.85rem;
  color: #b91c1c;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.history-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.history-reverse-btn {
  flex-shrink: 0;
  align-self: center;
}

.history-item--reversed {
  opacity: 0.72;
  background: #f1f5f9;
}

.history-item--reversed .history-meta,
.history-item--reversed .history-project-link,
.history-item--reversed .history-project {
  text-decoration: line-through;
}

.history-item-main {
  min-width: 0;
}

.history-item-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
}

.history-kind {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.history-kind--in {
  color: #047857;
  background: #ecfdf5;
}

.history-kind--out {
  color: #053f51;
  background: rgba(5, 63, 81, 0.08);
}

.history-reversed-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.12rem 0.4rem;
  border-radius: 6px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  text-decoration: none !important;
}

.history-project {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.history-project.muted {
  font-weight: 500;
  color: #64748b;
}

.history-project-link {
  font-size: 0.9rem;
  font-weight: 600;
  color: #053f51;
  text-decoration: none;
}

.history-project-link:hover {
  text-decoration: underline;
  color: #0f9f70;
}

.history-meta {
  margin: 0.3rem 0 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.45rem;
  font-size: 0.8rem;
  color: #64748b;
}

@media (max-width: 640px) {
  .roll-card-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .roll-col,
  .roll-col--area,
  .roll-col--date {
    flex: 1 1 auto;
    width: 100%;
    text-align: left;
  }

  .stock-total-value {
    font-size: 1.55rem;
  }
}
</style>
