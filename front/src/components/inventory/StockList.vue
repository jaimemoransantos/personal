<template>
  <section class="stock">
    <div class="stock-toolbar">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="Buscar producto..."
      />
      <button
        type="button"
        class="btn-refresh"
        :disabled="loading"
        @click="fetchStock"
      >
        {{ loading ? "…" : "Actualizar" }}
      </button>
    </div>

    <p v-if="error" class="stock-error">{{ error }}</p>
    <div v-else-if="loading && rows.length === 0" class="stock-empty">
      <p>Cargando stock…</p>
    </div>
    <div v-else-if="rows.length === 0" class="stock-empty">
      <p>No hay stock disponible</p>
    </div>
    <div v-else-if="filteredRows.length === 0" class="stock-empty">
      <p>No se encontraron productos con ese criterio</p>
    </div>
    <ul v-else class="stock-list">
      <li
        v-for="item in filteredRows"
        :key="`${item.kind}-${item.productId}`"
        class="stock-item"
        role="button"
        tabindex="0"
        @click="goToProductDetail(item)"
        @keydown.enter.prevent="goToProductDetail(item)"
        @keydown.space.prevent="goToProductDetail(item)"
      >
        <div class="stock-main">
          <p class="stock-name">{{ item.productName }}</p>
          <p class="stock-meta">
            <template v-if="item.kind === 'roll'">
              <span class="stock-type">Rollo</span>
              · {{ item.availableRollCount }}
              rollo{{ item.availableRollCount === 1 ? "" : "s" }} disponible{{
                item.availableRollCount === 1 ? "" : "s"
              }}
            </template>
            <template v-else>
              <span class="stock-type">Unidad</span>
              <span
                v-if="isAdmin && item.unitCost != null"
                class="stock-cost"
              >
                · Costo {{ formatCurrency(item.unitCost) }}
              </span>
              <span
                v-else-if="isAdmin && item.unitCost === null"
                class="stock-cost stock-cost--pending"
              >
                · Sin costear
              </span>
            </template>
          </p>
        </div>
        <p class="stock-meters">
          <template v-if="item.kind === 'roll'">
            {{ formatArea(item.availableArea) }}
            <span class="stock-unit">m²</span>
          </template>
          <template v-else>
            {{ formatUnits(item.stockQuantity) }}
            <span class="stock-unit">u</span>
          </template>
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useRolls, type ProductStock } from "../../composables/useRolls";
import {
  useUnitStock,
  type UnitProductStock,
} from "../../composables/useUnitStock";
import { useUserStore } from "../../stores/index";
import { formatCurrency } from "../../utils/format";

type StockRow =
  | (ProductStock & { kind: "roll" })
  | (UnitProductStock & { kind: "unit" });

const router = useRouter();
const userStore = useUserStore();
const { getStock: getRollStock, listAll: listAllRolls } = useRolls();
const { getStock: getUnitStock } = useUnitStock();

const isAdmin = computed(() => userStore.isAdmin);

const rows = ref<StockRow[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref("");

const filteredRows = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const sorted = [...rows.value].sort((a, b) => {
    const aVal = a.kind === "roll" ? a.availableArea : a.stockQuantity;
    const bVal = b.kind === "roll" ? b.availableArea : b.stockQuantity;
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    const safeA = Number.isFinite(aNum) ? aNum : 0;
    const safeB = Number.isFinite(bNum) ? bNum : 0;
    return safeB - safeA;
  });
  if (!q) return sorted;
  return sorted.filter((item) =>
    (item.productName ?? "").toLowerCase().includes(q),
  );
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

function normalizeRollStock(items: ProductStock[]): Array<ProductStock & { kind: "roll" }> {
  return items.map((s) => ({
    productId: String(s.productId ?? ""),
    productName: s.productName || "Producto",
    availableArea: Number(s.availableArea) || 0,
    availableRollCount: Number(s.availableRollCount) || 0,
    kind: "roll" as const,
  }));
}

function normalizeUnitStock(
  items: UnitProductStock[],
): Array<UnitProductStock & { kind: "unit" }> {
  return items.map((s) => ({
    productId: String(s.productId ?? ""),
    productName: s.productName || "Producto",
    productCode: s.productCode || "",
    stockQuantity: Number(s.stockQuantity) || 0,
    unitCost: s.unitCost,
    kind: "unit" as const,
  }));
}

/** Client-side fallback if /rolls/stock fails or returns empty while rolls exist. */
function aggregateRollsFromList(
  rolls: Awaited<ReturnType<typeof listAllRolls>>,
): Array<ProductStock & { kind: "roll" }> {
  const byProduct = new Map<
    string,
    { productName: string; availableArea: number; availableRollCount: number }
  >();
  for (const roll of rolls) {
    const available = Number(roll.remainingArea);
    if (!(available > 0)) continue;
    const existing = byProduct.get(roll.productId);
    if (existing) {
      existing.availableArea += available;
      existing.availableRollCount += 1;
    } else {
      byProduct.set(roll.productId, {
        productName: roll.productName || "Producto",
        availableArea: available,
        availableRollCount: 1,
      });
    }
  }
  return Array.from(byProduct.entries()).map(([productId, stock]) => ({
    productId,
    productName: stock.productName,
    availableArea: Math.round(stock.availableArea * 100) / 100,
    availableRollCount: stock.availableRollCount,
    kind: "roll" as const,
  }));
}

function goToProductDetail(item: StockRow) {
  router.push({
    path: `/inventario/producto/${item.productId}`,
    query: item.productName ? { name: item.productName } : undefined,
  });
}

async function fetchStock() {
  loading.value = true;
  error.value = "";
  try {
    const [rollResult, unitResult] = await Promise.allSettled([
      getRollStock(),
      getUnitStock(),
    ]);

    let rollRows: Array<ProductStock & { kind: "roll" }> = [];
    let unitRows: Array<UnitProductStock & { kind: "unit" }> = [];
    const errors: string[] = [];

    if (rollResult.status === "fulfilled") {
      rollRows = normalizeRollStock(
        Array.isArray(rollResult.value) ? rollResult.value : [],
      );
    } else {
      errors.push(
        rollResult.reason instanceof Error
          ? rollResult.reason.message
          : "Error al cargar stock de rollos",
      );
    }

    if (unitResult.status === "fulfilled") {
      unitRows = normalizeUnitStock(
        Array.isArray(unitResult.value) ? unitResult.value : [],
      );
    } else {
      errors.push(
        unitResult.reason instanceof Error
          ? unitResult.reason.message
          : "Error al cargar stock por unidad",
      );
    }

    // Fallback: if roll endpoint failed or returned nothing, try listing rolls.
    if (rollRows.length === 0) {
      try {
        const rolls = await listAllRolls(true);
        const fallback = aggregateRollsFromList(rolls);
        if (fallback.length > 0) {
          rollRows = fallback;
          if (rollResult.status === "rejected") {
            const rollErrMsg =
              rollResult.reason instanceof Error
                ? rollResult.reason.message
                : "Error al cargar stock de rollos";
            const idx = errors.indexOf(rollErrMsg);
            if (idx >= 0) errors.splice(idx, 1);
          }
        }
      } catch {
        // Keep original roll error if any.
      }
    }

    rows.value = [...rollRows, ...unitRows];

    if (rows.value.length === 0 && errors.length > 0) {
      error.value = errors.join(" · ");
    } else if (errors.length > 0 && rows.value.length > 0) {
      error.value = `Carga parcial: ${errors.join(" · ")}`;
    }
  } catch (e: unknown) {
    error.value =
      e instanceof Error ? e.message : "No se pudo cargar el stock.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchStock();
});
</script>

<style scoped>
.stock {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.stock-toolbar {
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

.btn-refresh {
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

.btn-refresh:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.stock-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.95rem;
}

.stock-empty {
  padding: 2rem 1.25rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
}

.stock-empty p {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.stock-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stock-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.15rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.stock-item:hover,
.stock-item:focus-visible {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  outline: none;
}

.stock-main {
  min-width: 0;
}

.stock-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.stock-meta {
  margin: 0.2rem 0 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.stock-type {
  font-weight: 700;
  color: #053f51;
}

.stock-cost {
  color: #053f51;
  font-weight: 600;
}

.stock-cost--pending {
  color: #b45309;
}

.stock-meters {
  margin: 0;
  flex-shrink: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #053f51;
}

.stock-unit {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}
</style>
