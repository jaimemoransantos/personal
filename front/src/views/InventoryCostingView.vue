<template>
  <div class="page">
    <header class="page-header">
      <button type="button" class="btn-back" @click="goBack">
        ← Inventario
      </button>
      <h1 class="page-title">Costeo de inventario</h1>
      <p class="page-subtitle">
        Asigna costos a productos por unidad y a rollos (por m²). Los ítems sin
        costear aparecen primero.
      </p>
    </header>

    <div class="tabs" role="tablist" aria-label="Tipo de producto">
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ active: tab === 'rolls' }"
        :aria-selected="tab === 'rolls'"
        @click="tab = 'rolls'"
      >
        Rollos
        <span v-if="rollUncostedTotal > 0" class="tab-badge">{{
          rollUncostedTotal
        }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="tab"
        :class="{ active: tab === 'units' }"
        :aria-selected="tab === 'units'"
        @click="tab = 'units'"
      >
        Unidades
        <span v-if="unitUncostedTotal > 0" class="tab-badge">{{
          unitUncostedTotal
        }}</span>
      </button>
    </div>

    <div class="toolbar">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        :placeholder="
          tab === 'rolls'
            ? 'Buscar producto o código de barras...'
            : 'Buscar por código o nombre...'
        "
      />
      <button
        type="button"
        class="btn-secondary"
        :disabled="loading"
        @click="refresh"
      >
        {{ loading ? "…" : "Actualizar" }}
      </button>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <!-- Units tab -->
    <template v-else-if="tab === 'units'">
      <div v-if="loading && unitItems.length === 0" class="empty">
        <p>Cargando…</p>
      </div>
      <div v-else-if="unitItems.length === 0" class="empty">
        <p>
          No hay productos por unidad. Créalos en Productos con tipo “Unidad”.
        </p>
      </div>
      <div v-else-if="filteredUnits.length === 0" class="empty">
        <p>No hay productos que coincidan con la búsqueda.</p>
      </div>
      <ul v-else class="cost-list">
        <li
          v-for="item in filteredUnits"
          :key="item.productId"
          class="cost-item"
          :class="{
            'cost-item--expanded': !!expandedUnitIds[item.productId],
            'cost-item--pending': item.unitCost == null,
          }"
        >
          <div
            class="unit-row"
            role="button"
            tabindex="0"
            @click="toggleUnitExpanded(item.productId)"
            @keydown.enter.prevent="toggleUnitExpanded(item.productId)"
            @keydown.space.prevent="toggleUnitExpanded(item.productId)"
          >
            <div class="cost-main">
              <span class="cost-code">{{ item.productCode }}</span>
              <p class="cost-name">{{ item.productName }}</p>
              <p class="cost-meta">
                Stock: {{ formatUnits(item.stockQuantity) }} u
                <span v-if="item.unitCost == null" class="badge badge--pending">
                  Sin costear
                </span>
              </p>
            </div>
            <div class="row-side">
              <span
                v-if="item.unitCost != null"
                class="cost-value"
                :title="'Clic para editar'"
              >
                {{ formatCurrency(item.unitCost) }}
              </span>
              <button
                v-else
                type="button"
                class="btn-costear"
                @click.stop="openUnitCosting(item.productId)"
              >
                Costear
              </button>
              <span class="chevron-sm" aria-hidden="true">{{
                expandedUnitIds[item.productId] ? "▾" : "▸"
              }}</span>
            </div>
          </div>

          <form
            v-if="expandedUnitIds[item.productId]"
            class="cost-form cost-form--expanded"
            @submit.prevent="saveUnitCost(item)"
          >
            <label class="cost-field">
              <span class="cost-label">Costo unitario</span>
              <input
                :ref="(el) => setUnitInputRef(item.productId, el)"
                v-model="unitDrafts[item.productId]"
                type="text"
                class="cost-input"
                inputmode="decimal"
                placeholder="—"
                :disabled="savingUnitId === item.productId"
              />
            </label>
            <button
              type="submit"
              class="btn-save"
              :disabled="
                savingUnitId === item.productId || !isUnitDraftDirty(item)
              "
            >
              {{ savingUnitId === item.productId ? "…" : "Guardar" }}
            </button>
          </form>
        </li>
      </ul>
    </template>

    <!-- Rolls tab -->
    <template v-else>
      <div v-if="loading && rollProducts.length === 0" class="empty">
        <p>Cargando…</p>
      </div>
      <div v-else-if="rollProducts.length === 0" class="empty">
        <p>No hay rollos registrados todavía.</p>
      </div>
      <div v-else-if="filteredRollProducts.length === 0" class="empty">
        <p>No hay productos que coincidan con la búsqueda.</p>
      </div>
      <ul v-else class="product-list">
        <li
          v-for="product in filteredRollProducts"
          :key="product.productId"
          class="product-card"
        >
          <button
            type="button"
            class="product-header"
            @click="toggleProduct(product.productId)"
          >
            <div class="product-header-main">
              <p class="cost-name">{{ product.productName }}</p>
              <p class="cost-meta">
                {{ product.totalRolls }} rollo{{
                  product.totalRolls === 1 ? "" : "s"
                }}
                <span
                  v-if="product.uncostedRolls > 0"
                  class="badge badge--pending"
                >
                  {{ product.uncostedRolls }} sin costear
                </span>
              </p>
            </div>
            <span class="chevron" aria-hidden="true">{{
              expandedProductId === product.productId ? "▾" : "▸"
            }}</span>
          </button>

          <div
            v-if="expandedProductId === product.productId"
            class="product-body"
          >
            <div class="sort-bar">
              <label class="sort-label">
                <span class="sort-label-text">Ordenar</span>
                <select
                  v-model="rollSortMode"
                  class="sort-select"
                  aria-label="Orden de rollos"
                >
                  <option value="default">Más recientes primero</option>
                  <option value="emptiest">Más vacíos primero</option>
                  <option value="oldest">Más antiguos primero</option>
                </select>
              </label>
            </div>

            <section
              v-for="(group, gIdx) in sortedGroupsForProduct(product)"
              :key="`${product.productId}-${group.batchNumber ?? ''}-${group.receivedDate}-${gIdx}`"
              class="group"
            >
              <h3 class="group-title">
                <template v-if="group.batchNumber">
                  Lote {{ group.batchNumber }}
                </template>
                <template v-else>Sin lote</template>
                · {{ formatReceivedDate(group.receivedDate) }}
              </h3>

              <ul class="roll-list">
                <li
                  v-for="roll in group.rolls"
                  :id="`roll-${roll.id}`"
                  :key="roll.id"
                  class="roll-card"
                  :class="{
                    'roll-card--expanded': !!expandedRollIds[roll.id],
                    'roll-card--highlight': highlightedRollId === roll.id,
                    'roll-card--pending': roll.unitCost == null,
                  }"
                >
                  <div
                    class="roll-row"
                    role="button"
                    tabindex="0"
                    @click="toggleRollExpanded(roll.id)"
                    @keydown.enter.prevent="toggleRollExpanded(roll.id)"
                    @keydown.space.prevent="toggleRollExpanded(roll.id)"
                  >
                    <div class="roll-row-main">
                      <p class="roll-code">{{ roll.barcodeValue }}</p>
                      <p class="roll-meta-line">
                        <span>{{
                          formatReceivedDate(group.receivedDate)
                        }}</span>
                        <span class="meta-sep">·</span>
                        <span>
                          {{ formatArea(roll.rollLength) }} ×
                          {{ formatArea(roll.rollWidth) }} m ({{
                            formatArea(roll.totalArea)
                          }}
                          m²)
                        </span>
                        <span class="meta-sep">·</span>
                        <span>{{
                          group.batchNumber
                            ? `Lote ${group.batchNumber}`
                            : "Sin lote"
                        }}</span>
                      </p>
                    </div>
                    <div class="row-side">
                      <div
                        class="roll-remaining"
                        :title="`${formatArea(roll.remainingArea)} de ${formatArea(roll.totalArea)} m² disponibles`"
                      >
                        <p class="roll-remaining-value">
                          {{ formatArea(roll.remainingArea) }}
                          <span class="roll-remaining-unit">m²</span>
                        </p>
                        <div
                          class="roll-progress"
                          role="progressbar"
                          :aria-valuenow="remainingPercent(roll)"
                          aria-valuemin="0"
                          aria-valuemax="100"
                          :aria-label="`Disponible ${remainingPercent(roll)}%`"
                        >
                          <div
                            class="roll-progress-fill"
                            :style="{
                              width: `${remainingPercent(roll)}%`,
                            }"
                          />
                        </div>
                      </div>
                      <span
                        v-if="roll.unitCost != null"
                        class="cost-value"
                        :title="'Clic para editar'"
                      >
                        {{ formatCurrency(roll.unitCost) }}/m²
                      </span>
                      <button
                        v-else
                        type="button"
                        class="btn-costear"
                        @click.stop="openRollCosting(roll.id)"
                      >
                        Costear
                      </button>
                      <span class="chevron-sm" aria-hidden="true">{{
                        expandedRollIds[roll.id] ? "▾" : "▸"
                      }}</span>
                    </div>
                  </div>

                  <form
                    v-if="expandedRollIds[roll.id]"
                    class="roll-cost-form"
                    @submit.prevent="saveRollCost(roll)"
                  >
                    <div
                      class="segmented-control"
                      role="group"
                      aria-label="Modo de costeo"
                    >
                      <button
                        type="button"
                        class="segmented-option"
                        :class="{
                          active: rollCostMode[roll.id] !== 'perM2',
                        }"
                        @click="setRollMode(roll, 'total')"
                      >
                        Costo total
                      </button>
                      <button
                        type="button"
                        class="segmented-option"
                        :class="{
                          active: rollCostMode[roll.id] === 'perM2',
                        }"
                        @click="setRollMode(roll, 'perM2')"
                      >
                        Por m²
                      </button>
                    </div>

                    <label class="cost-field">
                      <span class="cost-label">
                        {{
                          rollCostMode[roll.id] === "perM2"
                            ? "Costo por m²"
                            : "Costo total del rollo"
                        }}
                      </span>
                      <input
                        :ref="(el) => setRollInputRef(roll.id, el)"
                        v-model="rollDrafts[roll.id]"
                        type="text"
                        class="cost-input cost-input--wide"
                        inputmode="decimal"
                        placeholder="0.00"
                        :disabled="savingRollId === roll.id"
                        @input="onRollDraftInput(roll)"
                      />
                    </label>

                    <p v-if="rollPreview(roll) != null" class="labor-preview">
                      <template v-if="rollCostMode[roll.id] === 'perM2'">
                        Total del rollo:
                        <strong>{{
                          formatCurrency(rollPreview(roll)!.total)
                        }}</strong>
                      </template>
                      <template v-else>
                        Costo por m²:
                        <strong>{{
                          formatCurrency(rollPreview(roll)!.perM2)
                        }}</strong>
                      </template>
                    </p>

                    <button
                      type="submit"
                      class="btn-save"
                      :disabled="savingRollId === roll.id || !canSaveRoll(roll)"
                    >
                      {{ savingRollId === roll.id ? "…" : "Guardar costo" }}
                    </button>
                  </form>
                </li>
              </ul>
            </section>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  watch,
  type ComponentPublicInstance,
} from "vue";
import { useRouter } from "vue-router";
import {
  useUnitStock,
  type UnitProductStock,
} from "../composables/useUnitStock";
import {
  useRolls,
  type Roll,
  type RollCostingGroup,
  type RollCostingProduct,
} from "../composables/useRolls";
import { useToastStore } from "../stores/toast";
import { formatCurrency, parseDecimal } from "../utils/format";

type RollSortMode = "default" | "emptiest" | "oldest";

const router = useRouter();
const toast = useToastStore();
const { getStock, updateUnitCost } = useUnitStock();
const { listForCosting, setCost } = useRolls();

const tab = ref<"rolls" | "units">("rolls");
const searchQuery = ref("");
const loading = ref(false);
const error = ref("");

const unitItems = ref<UnitProductStock[]>([]);
const unitDrafts = reactive<Record<string, string>>({});
const expandedUnitIds = reactive<Record<string, boolean>>({});
const savingUnitId = ref<string | null>(null);
const unitInputRefs = new Map<string, HTMLInputElement>();

const rollProducts = ref<RollCostingProduct[]>([]);
const expandedProductId = ref<string | null>(null);
const expandedRollIds = reactive<Record<string, boolean>>({});
const highlightedRollId = ref<string | null>(null);
const rollDrafts = reactive<Record<string, string>>({});
const rollCostMode = reactive<Record<string, "total" | "perM2">>({});
const savingRollId = ref<string | null>(null);
const rollInputRefs = new Map<string, HTMLInputElement>();
/** Global sort for expanded product lists (one product open at a time). */
const rollSortMode = ref<RollSortMode>("default");

const unitUncostedTotal = computed(
  () => unitItems.value.filter((i) => i.unitCost == null).length,
);

const rollUncostedTotal = computed(() =>
  rollProducts.value.reduce((sum, p) => sum + p.uncostedRolls, 0),
);

const filteredUnits = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const sorted = [...unitItems.value].sort((a, b) => {
    const aUncosted = a.unitCost == null ? 0 : 1;
    const bUncosted = b.unitCost == null ? 0 : 1;
    if (aUncosted !== bUncosted) return aUncosted - bUncosted;
    return (a.productName ?? "").localeCompare(b.productName ?? "");
  });
  if (!q) return sorted;
  return sorted.filter(
    (item) =>
      item.productName?.toLowerCase().includes(q) ||
      item.productCode?.toLowerCase().includes(q),
  );
});

const filteredRollProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return rollProducts.value;

  const result: RollCostingProduct[] = [];
  for (const product of rollProducts.value) {
    const nameMatch = product.productName?.toLowerCase().includes(q) ?? false;
    if (nameMatch) {
      result.push(product);
      continue;
    }

    const groups = product.groups
      .map((g) => ({
        ...g,
        rolls: g.rolls.filter((r) => r.barcodeValue?.toLowerCase().includes(q)),
      }))
      .filter((g) => g.rolls.length > 0);

    if (groups.length === 0) continue;

    const totalRolls = groups.reduce((sum, g) => sum + g.rolls.length, 0);
    const uncostedRolls = groups.reduce(
      (sum, g) => sum + g.rolls.filter((r) => r.unitCost == null).length,
      0,
    );
    result.push({
      ...product,
      groups,
      totalRolls,
      uncostedRolls,
    });
  }
  return result;
});

function receivedAtMillis(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof value === "object") {
    const obj = value as {
      toMillis?: () => number;
      toDate?: () => Date;
      _seconds?: number;
      seconds?: number;
    };
    if (typeof obj.toMillis === "function") return obj.toMillis();
    if (typeof obj.toDate === "function") return obj.toDate().getTime();
    if (typeof obj._seconds === "number") return obj._seconds * 1000;
    if (typeof obj.seconds === "number") return obj.seconds * 1000;
  }
  return 0;
}

function compareRolls(a: Roll, b: Roll, mode: RollSortMode): number {
  if (mode === "emptiest") {
    const byArea = (a.remainingArea ?? 0) - (b.remainingArea ?? 0);
    if (byArea !== 0) return byArea;
    return receivedAtMillis(a.receivedAt) - receivedAtMillis(b.receivedAt);
  }
  if (mode === "oldest") {
    const byDate =
      receivedAtMillis(a.receivedAt) - receivedAtMillis(b.receivedAt);
    if (byDate !== 0) return byDate;
    return (a.remainingArea ?? 0) - (b.remainingArea ?? 0);
  }
  // default: newest first (matches backend costing order)
  return receivedAtMillis(b.receivedAt) - receivedAtMillis(a.receivedAt);
}

function compareGroups(
  a: RollCostingGroup,
  b: RollCostingGroup,
  mode: RollSortMode,
): number {
  if (mode === "emptiest") {
    const minA = Math.min(...a.rolls.map((r) => r.remainingArea ?? 0));
    const minB = Math.min(...b.rolls.map((r) => r.remainingArea ?? 0));
    if (minA !== minB) return minA - minB;
    return receivedAtMillis(a.receivedAt) - receivedAtMillis(b.receivedAt);
  }
  if (mode === "oldest") {
    return receivedAtMillis(a.receivedAt) - receivedAtMillis(b.receivedAt);
  }
  return receivedAtMillis(b.receivedAt) - receivedAtMillis(a.receivedAt);
}

function sortedGroupsForProduct(
  product: RollCostingProduct,
): RollCostingGroup[] {
  const mode = rollSortMode.value;
  const groups = product.groups.map((group) => ({
    ...group,
    rolls: [...group.rolls].sort((a, b) => compareRolls(a, b, mode)),
  }));
  groups.sort((a, b) => compareGroups(a, b, mode));
  return groups;
}

function formatUnits(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatArea(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function remainingPercent(roll: Roll): number {
  if (!(roll.totalArea > 0)) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((roll.remainingArea / roll.totalArea) * 100)),
  );
}

function formatReceivedDate(dateKey: string): string {
  if (!dateKey || dateKey === "unknown") return "Fecha desconocida";
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function goBack() {
  void router.push("/inventario");
}

function toggleProduct(productId: string) {
  expandedProductId.value =
    expandedProductId.value === productId ? null : productId;
}

function toggleUnitExpanded(productId: string) {
  expandedUnitIds[productId] = !expandedUnitIds[productId];
  if (expandedUnitIds[productId]) {
    void focusUnitInput(productId);
  }
}

function openUnitCosting(productId: string) {
  expandedUnitIds[productId] = true;
  void focusUnitInput(productId);
}

function toggleRollExpanded(rollId: string) {
  expandedRollIds[rollId] = !expandedRollIds[rollId];
  if (expandedRollIds[rollId]) {
    void focusRollInput(rollId);
  }
}

function openRollCosting(rollId: string) {
  expandedRollIds[rollId] = true;
  void focusRollInput(rollId);
}

function setUnitInputRef(
  productId: string,
  el: Element | ComponentPublicInstance | null,
) {
  if (el instanceof HTMLInputElement) {
    unitInputRefs.set(productId, el);
  } else {
    unitInputRefs.delete(productId);
  }
}

function setRollInputRef(
  rollId: string,
  el: Element | ComponentPublicInstance | null,
) {
  if (el instanceof HTMLInputElement) {
    rollInputRefs.set(rollId, el);
  } else {
    rollInputRefs.delete(rollId);
  }
}

async function focusUnitInput(productId: string) {
  await nextTick();
  unitInputRefs.get(productId)?.focus();
}

async function focusRollInput(rollId: string) {
  await nextTick();
  rollInputRefs.get(rollId)?.focus();
}

function findBarcodeMatch(
  query: string,
): { productId: string; rollId: string } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let exact: { productId: string; rollId: string } | null = null;
  let partial: { productId: string; rollId: string } | null = null;

  for (const product of rollProducts.value) {
    for (const group of product.groups) {
      for (const roll of group.rolls) {
        const barcode = roll.barcodeValue?.toLowerCase() ?? "";
        if (!barcode.includes(q)) continue;
        if (barcode === q) {
          exact = { productId: product.productId, rollId: roll.id };
        } else if (!partial) {
          partial = { productId: product.productId, rollId: roll.id };
        }
      }
    }
  }

  return exact ?? partial;
}

async function scrollToRoll(rollId: string) {
  await nextTick();
  // Wait one more frame so the expanded product body is painted.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  document
    .getElementById(`roll-${rollId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

watch(searchQuery, (value) => {
  if (tab.value !== "rolls") {
    highlightedRollId.value = null;
    return;
  }

  const q = value.trim();
  if (!q) {
    highlightedRollId.value = null;
    return;
  }

  const match = findBarcodeMatch(q);
  if (!match) {
    highlightedRollId.value = null;
    return;
  }

  expandedProductId.value = match.productId;
  highlightedRollId.value = match.rollId;
  void scrollToRoll(match.rollId);
});

function isUnitDraftDirty(item: UnitProductStock): boolean {
  const draft = (unitDrafts[item.productId] ?? "").trim();
  const current = item.unitCost == null ? "" : String(item.unitCost).trim();
  if (draft === "" && current === "") return false;
  if (draft === "" && current !== "") return true;
  if (draft !== "" && current === "") return true;
  return parseDecimal(draft) !== parseDecimal(current);
}

function initRollDraft(roll: Roll) {
  if (rollDrafts[roll.id] !== undefined) return;
  const mode = rollCostMode[roll.id] ?? "total";
  rollCostMode[roll.id] = mode;
  if (roll.unitCost != null && Number.isFinite(roll.unitCost)) {
    if (mode === "perM2") {
      rollDrafts[roll.id] = String(roll.unitCost);
    } else {
      rollDrafts[roll.id] = String(
        Math.round(roll.unitCost * roll.totalArea * 100) / 100,
      );
    }
  } else {
    rollDrafts[roll.id] = "";
  }
}

function setRollMode(roll: Roll, mode: "total" | "perM2") {
  const prev = rollCostMode[roll.id] ?? "total";
  if (prev === mode) return;
  const preview = rollPreview(roll);
  rollCostMode[roll.id] = mode;
  if (preview) {
    rollDrafts[roll.id] =
      mode === "perM2" ? String(preview.perM2) : String(preview.total);
  } else if (roll.unitCost != null) {
    initRollDraft(roll);
    rollDrafts[roll.id] =
      mode === "perM2"
        ? String(roll.unitCost)
        : String(Math.round(roll.unitCost * roll.totalArea * 100) / 100);
  }
}

function onRollDraftInput(roll: Roll) {
  initRollDraft(roll);
}

function rollPreview(roll: Roll): { perM2: number; total: number } | null {
  initRollDraft(roll);
  const raw = (rollDrafts[roll.id] ?? "").trim();
  if (raw === "") return null;
  const n = parseDecimal(raw);
  if (!(n >= 0) || !(roll.totalArea > 0)) return null;
  const mode = rollCostMode[roll.id] ?? "total";
  if (mode === "perM2") {
    return {
      perM2: n,
      total: Math.round(n * roll.totalArea * 100) / 100,
    };
  }
  return {
    total: n,
    perM2: Math.round((n / roll.totalArea) * 100) / 100,
  };
}

function canSaveRoll(roll: Roll): boolean {
  const preview = rollPreview(roll);
  if (!preview) return false;
  if (roll.unitCost == null) return true;
  return Math.abs(preview.perM2 - roll.unitCost) > 0.0001;
}

async function refresh() {
  loading.value = true;
  error.value = "";
  try {
    const [units, rolls] = await Promise.all([getStock(), listForCosting()]);
    unitItems.value = units;
    for (const item of units) {
      unitDrafts[item.productId] =
        item.unitCost == null ? "" : String(item.unitCost);
    }
    rollProducts.value = rolls;
    for (const product of rolls) {
      for (const group of product.groups) {
        for (const roll of group.rolls) {
          if (rollCostMode[roll.id] === undefined) {
            rollCostMode[roll.id] = "total";
          }
          if (rollDrafts[roll.id] === undefined) {
            if (roll.unitCost != null) {
              rollDrafts[roll.id] = String(
                Math.round(roll.unitCost * roll.totalArea * 100) / 100,
              );
            } else {
              rollDrafts[roll.id] = "";
            }
          }
        }
      }
    }
    if (
      expandedProductId.value &&
      !rolls.some((p) => p.productId === expandedProductId.value)
    ) {
      expandedProductId.value = null;
    }
  } catch (e: unknown) {
    error.value =
      e instanceof Error ? e.message : "No se pudo cargar el costeo.";
  } finally {
    loading.value = false;
  }
}

async function saveUnitCost(item: UnitProductStock) {
  if (!isUnitDraftDirty(item)) return;
  const raw = (unitDrafts[item.productId] ?? "").trim();
  const unitCost = raw === "" ? null : parseDecimal(raw);
  if (raw !== "" && unitCost !== null && unitCost < 0) {
    toast.show("El costo no puede ser negativo", "error");
    return;
  }
  savingUnitId.value = item.productId;
  try {
    const updated = await updateUnitCost(item.productId, unitCost);
    item.unitCost =
      typeof updated.unitCost === "number" ? updated.unitCost : null;
    unitDrafts[item.productId] =
      item.unitCost == null ? "" : String(item.unitCost);
    expandedUnitIds[item.productId] = false;
    toast.show("Costo actualizado", "success");
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudo guardar el costo",
      "error",
    );
  } finally {
    savingUnitId.value = null;
  }
}

async function saveRollCost(roll: Roll) {
  const preview = rollPreview(roll);
  if (!preview || !canSaveRoll(roll)) return;
  const mode = rollCostMode[roll.id] ?? "total";
  savingRollId.value = roll.id;
  try {
    const updated = await setCost(roll.id, {
      mode,
      ...(mode === "total"
        ? { totalCost: preview.total }
        : { unitCost: preview.perM2 }),
    });
    roll.unitCost = updated.unitCost ?? null;
    expandedRollIds[roll.id] = false;
    // Refresh product uncosted counts
    await refresh();
    toast.show("Costo del rollo guardado", "success");
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudo guardar el costo",
      "error",
    );
  } finally {
    savingRollId.value = null;
  }
}

onMounted(() => {
  void refresh();
});
</script>

<style scoped>
.page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.btn-back {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: #053f51;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
}

.page-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
}

.tabs {
  display: flex;
  gap: 0.35rem;
  padding: 4px;
  background: #eef2f6;
  border-radius: 12px;
  width: fit-content;
  max-width: 100%;
}

.tab {
  position: relative;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.tab.active {
  background: #fff;
  color: #053f51;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
}

.tab-badge {
  margin-left: 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: #fffbeb;
  color: #b45309;
}

.toolbar {
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
}

.btn-secondary {
  flex-shrink: 0;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.error-text {
  margin: 0;
  color: #b91c1c;
}

.empty {
  padding: 2rem 1.25rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
  color: #64748b;
}

.cost-list,
.product-list,
.roll-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cost-item,
.product-card {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
}

.roll-card {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
}

.cost-item--pending,
.roll-card--pending {
  border-color: #f59e0b;
  background: #fffdf7;
}

.cost-item--expanded,
.roll-card--expanded {
  border-color: #94a3b8;
}

.roll-card--highlight {
  border-color: #053f51;
  box-shadow: 0 0 0 2px rgba(5, 63, 81, 0.18);
  animation: roll-highlight-pulse 1.2s ease-out 1;
}

@keyframes roll-highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(5, 63, 81, 0.35);
  }
  100% {
    box-shadow: 0 0 0 2px rgba(5, 63, 81, 0.18);
  }
}

.unit-row,
.roll-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.8rem 1rem;
  cursor: pointer;
  text-align: left;
}

.unit-row:focus-visible,
.roll-row:focus-visible {
  outline: 2px solid #053f51;
  outline-offset: -2px;
  border-radius: 10px;
}

.cost-main,
.roll-row-main {
  min-width: 0;
  flex: 1;
}

.cost-code {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  background: #053f51;
  color: #fff;
}

.cost-name {
  margin: 0.35rem 0 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.cost-meta {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.row-side {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 0;
}

.roll-remaining {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  min-width: 5.5rem;
}

.roll-remaining-value {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #053f51;
  line-height: 1.15;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.roll-remaining-unit {
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f9f70;
}

.roll-progress {
  width: 5.5rem;
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

.cost-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: #047857;
  white-space: nowrap;
  min-width: 4.75rem;
  text-align: right;
}

.btn-costear {
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #f59e0b;
  background: #fffbeb;
  color: #b45309;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.btn-costear:hover {
  background: #fef3c7;
}

.chevron-sm {
  color: #64748b;
  font-size: 0.85rem;
  width: 1rem;
  text-align: center;
}

.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.badge--pending {
  background: #fffbeb;
  color: #b45309;
}

.badge--ok {
  background: #ecfdf5;
  color: #047857;
}

.cost-form {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.cost-form--expanded {
  padding: 0 1rem 0.9rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 0.75rem;
}

.cost-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cost-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.cost-input {
  width: 7.5rem;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
}

.cost-input--wide {
  width: 100%;
  max-width: 12rem;
}

.btn-save {
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: none;
  background: #053f51;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.product-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.product-header-main .cost-name {
  margin-top: 0;
}

.chevron {
  color: #475569;
  font-size: 1rem;
}

.product-body {
  padding: 0 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border-top: 1px solid #e2e8f0;
  background: #f5f5f5;
  border-radius: 0 0 11px 11px;
}

.sort-bar {
  display: flex;
  align-items: center;
  padding-top: 0.85rem;
}

.sort-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.sort-label-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.sort-select {
  min-width: 0;
  max-width: 100%;
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.group-title {
  margin: 0.15rem 0.15rem 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #334155;
}

.roll-code {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  word-break: break-all;
}

.roll-meta-line {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  line-height: 1.35;
}

.meta-sep {
  color: #94a3b8;
}

.roll-cost-form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0 1rem 0.9rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 0.75rem;
  background: #fff;
}

.segmented-control {
  display: inline-flex;
  padding: 4px;
  border-radius: 12px;
  background: #eef2f6;
  gap: 2px;
}

.segmented-option {
  padding: 0.45rem 0.85rem;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.segmented-option.active {
  background: #fff;
  color: #053f51;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
}

.labor-preview {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.labor-preview strong {
  color: #053f51;
}

@media (max-width: 560px) {
  .unit-row,
  .roll-row {
    align-items: flex-start;
  }

  .row-side {
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
  }

  .cost-form {
    width: 100%;
    flex-wrap: wrap;
  }

  .cost-input {
    flex: 1;
    width: auto;
  }

  .tabs {
    width: 100%;
  }

  .tab {
    flex: 1;
  }
}
</style>
