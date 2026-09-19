<template>
  <div class="inv-page">
    <!-- Home -->
    <template v-if="mode === 'home'">
      <header class="inv-header">
        <h1 class="inv-title">Inventario</h1>
        <p class="inv-subtitle">
          {{
            canUseActions
              ? "Registra o retira material (rollos o productos por unidad)"
              : "Stock disponible por producto"
          }}
        </p>
        <button
          v-if="userStore.isAdmin"
          type="button"
          class="btn-costing-link"
          @click="goToCosting"
        >
          Costeo de inventario →
        </button>
      </header>

      <StockList v-if="canSeeStock" :key="stockListKey" />

      <div v-if="canUseActions" class="inv-cards">
        <button type="button" class="inv-card" @click="startRegister">
          <span class="inv-card-label">Registrar</span>
          <span class="inv-card-hint">Importación / ingreso de material</span>
        </button>
        <button type="button" class="inv-card" @click="startWithdraw">
          <span class="inv-card-label">Retirar material</span>
          <span class="inv-card-hint">Descontar hacia un proyecto</span>
        </button>
      </div>
    </template>

    <!-- Register: choose roll vs unit -->
    <template v-else-if="mode === 'register-type'">
      <header class="inv-header inv-header--row">
        <button type="button" class="btn-back" @click="goHome">← Volver</button>
      </header>
      <h2 class="inv-section-title">¿Qué vas a registrar?</h2>
      <div class="inv-cards">
        <button type="button" class="inv-card" @click="chooseRegisterRoll">
          <span class="inv-card-label">Rollo (código de barras)</span>
          <span class="inv-card-hint">Geomembrana y productos por área</span>
        </button>
        <button type="button" class="inv-card" @click="chooseRegisterUnit">
          <span class="inv-card-label">Producto por unidad</span>
          <span class="inv-card-hint">Cantidad numérica (sin escaneo)</span>
        </button>
      </div>
    </template>

    <!-- Register: unit quantity form -->
    <template v-else-if="mode === 'register-unit'">
      <header class="inv-header inv-header--row">
        <button type="button" class="btn-back" @click="startRegister">
          ← Volver
        </button>
        <p class="session-count">
          {{ sessionUnitRegistered }} unidad{{
            sessionUnitRegistered === 1 ? "" : "es"
          }}
          en esta sesión
        </p>
      </header>
      <h2 class="inv-section-title">Registrar stock</h2>

      <form class="inv-form" @submit.prevent="saveUnitRegister">
        <label class="form-field">
          <span class="form-label">Producto</span>
          <div class="product-search">
            <input
              v-model="unitProductQuery"
              type="text"
              class="form-input"
              placeholder="Buscar producto por unidad..."
              autocomplete="off"
              @focus="showUnitProductSuggestions = true"
            />
            <ul
              v-if="showUnitProductSuggestions && filteredUnitProducts.length"
              class="suggestions"
            >
              <li
                v-for="p in filteredUnitProducts"
                :key="p.id"
                class="suggestion"
                @mousedown.prevent="selectUnitProduct(p)"
              >
                <span class="suggestion-code">{{ p.code }}</span>
                <span class="suggestion-name">{{ p.name }}</span>
              </li>
            </ul>
          </div>
          <p v-if="selectedUnitProduct" class="selected-product">
            Seleccionado: <strong>{{ selectedUnitProduct.name }}</strong>
            <span v-if="selectedUnitProduct.stockQuantity != null">
              · Stock actual:
              {{ formatUnits(selectedUnitProduct.stockQuantity) }}
            </span>
          </p>
        </label>

        <label class="form-field">
          <span class="form-label">Cantidad</span>
          <input
            v-model.number="unitQuantity"
            type="number"
            class="form-input"
            min="1"
            step="1"
            required
            inputmode="numeric"
          />
        </label>

        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            :disabled="saving"
            @click="startRegister"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="saving || !canSaveUnitRegister"
          >
            {{ saving ? "Guardando…" : "Registrar entrada" }}
          </button>
        </div>
      </form>
    </template>

    <!-- Register: scanning -->
    <template v-else-if="mode === 'register-scan'">
      <header class="inv-header inv-header--row">
        <button type="button" class="btn-back" @click="goHome">← Volver</button>
        <p class="session-count">
          {{ sessionRegistered }} rollo{{ sessionRegistered === 1 ? "" : "s" }}
          en esta sesión
        </p>
      </header>
      <p class="step-hint">Escanea el siguiente rollo</p>
      <BarcodeScanner :key="scannerKey" @scan="onRegisterScan" />
      <p v-if="busy" class="busy-text">Buscando código…</p>
    </template>

    <!-- Register: already exists -->
    <template v-else-if="mode === 'register-exists' && existingRoll">
      <header class="inv-header">
        <h2 class="inv-section-title">Código ya registrado</h2>
      </header>
      <div class="result-card result-card--warn">
        <p class="result-alert">Este código ya está registrado</p>
        <p class="result-code">{{ existingRoll.barcodeValue }}</p>
        <p class="result-line">
          <strong>{{ existingRoll.productName }}</strong>
        </p>
        <p class="result-line">
          Restan {{ formatMeters(existingRoll.remainingArea) }} m² de
          {{ formatMeters(existingRoll.totalArea) }} m²
        </p>
        <p class="result-line muted result-dims">
          Rollo de {{ formatMeters(existingRoll.rollLength) }}m ×
          {{ formatMeters(existingRoll.rollWidth) }}m
        </p>
      </div>
      <button type="button" class="btn-primary" @click="resumeRegisterScan">
        Seguir escaneando
      </button>
    </template>

    <!-- Register: form for new roll -->
    <template v-else-if="mode === 'register-form'">
      <header class="inv-header">
        <h2 class="inv-section-title">Registrar rollo</h2>
        <p class="result-code">{{ pendingBarcode }}</p>
      </header>

      <form class="inv-form" @submit.prevent="saveRegister">
        <label class="form-field">
          <span class="form-label">Producto</span>
          <div class="product-search">
            <input
              v-model="productQuery"
              type="text"
              class="form-input"
              placeholder="Buscar producto..."
              autocomplete="off"
              @focus="showProductSuggestions = true"
            />
            <ul
              v-if="showProductSuggestions && filteredProducts.length"
              class="suggestions"
            >
              <li
                v-for="p in filteredProducts"
                :key="p.id"
                class="suggestion"
                @mousedown.prevent="selectProduct(p)"
              >
                <span class="suggestion-code">{{ p.code }}</span>
                <span class="suggestion-name">{{ p.name }}</span>
              </li>
            </ul>
          </div>
          <p v-if="selectedProduct" class="selected-product">
            Seleccionado: <strong>{{ selectedProduct.name }}</strong>
          </p>
        </label>

        <label class="form-field">
          <span class="form-label">Largo (m)</span>
          <input
            v-model="largoInput"
            type="text"
            class="form-input"
            inputmode="decimal"
            required
            @input="onLargoInput"
            @blur="onLargoBlur"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Ancho (m)</span>
          <input
            v-model="anchoInput"
            type="text"
            class="form-input"
            inputmode="decimal"
            required
            @input="onAnchoInput"
            @blur="onAnchoBlur"
          />
        </label>

        <p v-if="registerAreaPreview != null" class="area-preview">
          = {{ formatMeters(registerAreaPreview) }} m²
        </p>

        <label class="form-field">
          <span class="form-label">Lote (opcional)</span>
          <input v-model="registerBatchNumber" type="text" class="form-input" />
        </label>

        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            :disabled="saving"
            @click="resumeRegisterScan"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="saving || !canSaveRegister"
          >
            {{ saving ? "Guardando…" : "Guardar rollo" }}
          </button>
        </div>
      </form>
    </template>

    <!-- Withdraw: pick project -->
    <template v-else-if="mode === 'withdraw-project'">
      <header class="inv-header inv-header--row">
        <button type="button" class="btn-back" @click="goHome">← Volver</button>
      </header>
      <h2 class="inv-section-title">Selecciona el proyecto</h2>

      <div class="product-search">
        <input
          v-model="projectQuery"
          type="text"
          class="form-input"
          placeholder="Buscar proyecto..."
          autocomplete="off"
        />
      </div>

      <p v-if="projectsLoading" class="busy-text">Cargando proyectos…</p>
      <ul v-else-if="filteredProjects.length" class="project-list">
        <li v-for="p in filteredProjects" :key="p.id">
          <button type="button" class="project-item" @click="selectProject(p)">
            <span class="project-name">{{ p.name }}</span>
            <span class="project-status">{{ statusLabel(p.status) }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="empty-text">
        No hay proyectos activos (planificado / instalando).
      </p>
    </template>

    <!-- Withdraw: pick product from quotation -->
    <template v-else-if="mode === 'withdraw-product'">
      <header class="inv-header inv-header--row">
        <button type="button" class="btn-back" @click="startWithdraw">
          ← Proyecto
        </button>
      </header>
      <p class="step-hint">
        Proyecto: <strong>{{ selectedProject?.name }}</strong>
      </p>
      <h2 class="inv-section-title">Producto a retirar</h2>
      <p class="step-hint">
        Solo productos incluidos en la cotización de este proyecto.
      </p>

      <div class="product-search">
        <input
          v-model="allowedProductQuery"
          type="text"
          class="form-input"
          placeholder="Buscar producto de la cotización..."
          autocomplete="off"
        />
      </div>

      <p v-if="allowedProductsLoading" class="busy-text">
        Cargando productos…
      </p>
      <ul v-else-if="filteredAllowedProducts.length" class="project-list">
        <li v-for="p in filteredAllowedProducts" :key="p.productId">
          <button
            type="button"
            class="project-item product-pick-item"
            @click="selectAllowedProduct(p)"
          >
            <span class="product-pick-main">
              <span class="suggestion-code">{{ p.code }}</span>
              <span class="product-pick-name">{{ p.name }}</span>
            </span>
            <span class="product-pick-meta">
              <span class="product-pick-kind">
                {{ p.type === "unit" ? "Unidad" : "Rollo" }}
              </span>
              <span
                v-if="p.type === 'unit' && p.stockQuantity != null"
                class="product-pick-stock"
              >
                {{ formatUnits(p.stockQuantity) }} disp.
              </span>
              <span
                v-else-if="p.type !== 'unit' && p.availableArea != null"
                class="product-pick-stock"
              >
                {{ formatMeters(p.availableArea) }} m²
              </span>
            </span>
          </button>
        </li>
      </ul>
      <p v-else class="empty-text">
        {{
          allowedProductQuery.trim()
            ? "No hay productos que coincidan."
            : "Esta cotización no tiene productos de inventario vinculados."
        }}
      </p>
      <p
        v-if="unmatchedQuoteCodes.length"
        class="field-error"
        style="text-align: center"
      >
        Códigos en cotización sin producto en catálogo:
        {{ unmatchedQuoteCodes.join(", ") }}
      </p>
      <p
        v-if="excludedServices.length"
        class="step-hint"
        style="text-align: center"
      >
        Servicios en la cotización (no se retiran de inventario):
        {{
          excludedServices.map((s) => s.code || s.name).join(", ")
        }}
      </p>
    </template>

    <!-- Withdraw: unit quantity form -->
    <template v-else-if="mode === 'withdraw-unit'">
      <header class="inv-header inv-header--row">
        <button type="button" class="btn-back" @click="backToWithdrawProduct">
          ← Producto
        </button>
      </header>
      <p class="step-hint">
        Proyecto: <strong>{{ selectedProject?.name }}</strong>
      </p>
      <h2 class="inv-section-title">Retirar por unidad</h2>

      <div class="result-card">
        <p class="result-line">
          <strong>{{ selectedUnitProduct?.name }}</strong>
        </p>
        <p class="result-line muted">
          Código: {{ selectedUnitProduct?.code }}
        </p>
        <p class="result-line">
          Disponibles:
          <strong>{{
            formatUnits(selectedUnitProduct?.stockQuantity ?? 0)
          }}</strong>
        </p>
      </div>

      <form class="inv-form" @submit.prevent="saveUnitWithdraw">
        <label class="form-field">
          <span class="form-label">Cantidad</span>
          <input
            v-model.number="unitQuantity"
            type="number"
            class="form-input"
            min="1"
            step="1"
            required
            inputmode="numeric"
          />
          <p v-if="unitWithdrawExceeds" class="field-error">
            No puede superar
            {{ formatUnits(selectedUnitProduct?.stockQuantity ?? 0) }}
            disponibles
          </p>
        </label>

        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            :disabled="saving"
            @click="backToWithdrawProduct"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="saving || !canSaveUnitWithdraw"
          >
            {{ saving ? "Retirando…" : "Confirmar retiro" }}
          </button>
        </div>
      </form>
    </template>

    <!-- Withdraw: scanning -->
    <template v-else-if="mode === 'withdraw-scan'">
      <header class="inv-header inv-header--row">
        <button type="button" class="btn-back" @click="backToWithdrawProduct">
          ← Producto
        </button>
      </header>
      <p class="step-hint">
        Proyecto: <strong>{{ selectedProject?.name }}</strong>
      </p>
      <p class="step-hint">
        Producto: <strong>{{ selectedAllowedProduct?.name }}</strong>
      </p>
      <p class="step-hint">Escanea un rollo de este producto</p>
      <BarcodeScanner :key="scannerKey" @scan="onWithdrawScan" />
      <p v-if="busy" class="busy-text">Buscando código…</p>
    </template>

    <!-- Withdraw: form -->
    <template v-else-if="mode === 'withdraw-form' && withdrawRoll">
      <header class="inv-header">
        <h2 class="inv-section-title">Retirar material</h2>
        <p class="result-code">{{ withdrawRoll.barcodeValue }}</p>
      </header>

      <div class="result-card">
        <p class="result-line">
          <strong>{{ withdrawRoll.productName }}</strong>
        </p>
        <p class="result-line">
          Disponibles:
          <strong>{{ formatMeters(withdrawRoll.remainingArea) }} m²</strong>
        </p>
        <p class="result-line muted result-dims">
          Rollo de {{ formatMeters(withdrawRoll.rollLength) }}m ×
          {{ formatMeters(withdrawRoll.rollWidth) }}m
        </p>
        <p class="result-line muted">
          Proyecto: {{ selectedProject?.name }}
        </p>
      </div>

      <form class="inv-form" @submit.prevent="saveWithdraw">
        <div class="withdraw-unit-control">
          <div class="segmented-control" role="group" aria-label="Unidad de retiro">
            <button
              type="button"
              class="segmented-option"
              :class="{ active: withdrawUnit === 'm2' }"
              @click="setWithdrawUnit('m2')"
            >
              m²
            </button>
            <button
              type="button"
              class="segmented-option"
              :class="{ active: withdrawUnit === 'linear' }"
              @click="setWithdrawUnit('linear')"
            >
              Metros lineales
            </button>
          </div>
        </div>

        <label v-if="withdrawUnit === 'm2'" class="form-field">
          <span class="form-label">m² a retirar</span>
          <input
            v-model.number="withdrawArea"
            type="number"
            class="form-input"
            min="0.01"
            step="0.01"
            required
            inputmode="decimal"
          />
          <p v-if="withdrawExceeds" class="field-error">
            No puede superar {{ formatMeters(withdrawRoll.remainingArea) }} m²
          </p>
        </label>

        <label v-else class="form-field">
          <span class="form-label">Metros lineales a retirar</span>
          <input
            v-model="withdrawLinearInput"
            type="text"
            class="form-input"
            inputmode="decimal"
            autocomplete="off"
            required
            @input="onWithdrawLinearInput"
            @blur="onWithdrawLinearBlur"
          />
          <p
            v-if="withdrawLinearAreaPreview != null"
            class="conversion-hint"
          >
            = {{ formatMeters(withdrawLinearAreaPreview) }} m²
          </p>
          <p v-if="withdrawExceeds" class="field-error">
            No puede superar {{ formatMeters(withdrawRoll.remainingArea) }} m²
          </p>
        </label>

        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            :disabled="saving"
            @click="resumeWithdrawScan"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="saving || !canSaveWithdraw"
          >
            {{ saving ? "Retirando…" : "Confirmar retiro" }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BarcodeScanner from "../components/inventory/BarcodeScanner.vue";
import StockList from "../components/inventory/StockList.vue";
import { useRolls, type Roll } from "../composables/useRolls";
import { useUnitStock } from "../composables/useUnitStock";
import {
  useProjects,
  type Project,
  type ProjectInventoryProduct,
  type ProjectStatus,
} from "../composables/useProjects";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";
import { useUserStore } from "../stores/index";

interface Product {
  id: string;
  code: string;
  name: string;
  subtitle?: string;
  price?: number;
  kind?: "producto" | "servicio";
  type?: "roll" | "unit";
  stockQuantity?: number;
  unitCost?: number | null;
}

type Mode =
  | "home"
  | "register-type"
  | "register-scan"
  | "register-exists"
  | "register-form"
  | "register-unit"
  | "withdraw-project"
  | "withdraw-product"
  | "withdraw-scan"
  | "withdraw-form"
  | "withdraw-unit";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { lookupByBarcode, register, withdraw } = useRolls();
const { stockIn, stockOut } = useUnitStock();
const { list: listProjects, listInventoryProducts } = useProjects();
const api = useApi();
const toast = useToastStore();

/** Admin + chief see stock list. */
const canSeeStock = computed(
  () => userStore.role === "admin" || userStore.role === "chief",
);

/** Chief + technician can register / withdraw. */
const canUseActions = computed(
  () => userStore.role === "chief" || userStore.role === "technician",
);

const mode = ref<Mode>("home");
const scannerKey = ref(0);
const stockListKey = ref(0);
const busy = ref(false);
const saving = ref(false);
const sessionRegistered = ref(0);
const sessionUnitRegistered = ref(0);

const pendingBarcode = ref("");
const existingRoll = ref<Roll | null>(null);

const products = ref<Product[]>([]);
const productQuery = ref("");
const showProductSuggestions = ref(false);
const selectedProduct = ref<Product | null>(null);
const largoInput = ref("");
const anchoInput = ref("");
const registerLength = ref<number | null>(null);
const registerWidth = ref<number | null>(null);
const registerBatchNumber = ref("");

const unitProductQuery = ref("");
const showUnitProductSuggestions = ref(false);
const selectedUnitProduct = ref<Product | null>(null);
const unitQuantity = ref<number | null>(null);

const DIM_MIN = 0.1;

const projects = ref<Project[]>([]);
const projectsLoading = ref(false);
const projectQuery = ref("");
const selectedProject = ref<Project | null>(null);

const allowedProducts = ref<ProjectInventoryProduct[]>([]);
const allowedProductsLoading = ref(false);
const allowedProductQuery = ref("");
const unmatchedQuoteCodes = ref<string[]>([]);
const excludedServices = ref<
  Array<{ productId: string; code: string; name: string }>
>([]);
const selectedAllowedProduct = ref<ProjectInventoryProduct | null>(null);

const withdrawRoll = ref<Roll | null>(null);
const withdrawArea = ref<number | null>(null);
const withdrawUnit = ref<"m2" | "linear">("m2");
const withdrawLinearInput = ref("");
const withdrawLinearMeters = ref<number | null>(null);

const ACTIVE_STATUSES: ProjectStatus[] = ["planificado", "instalando"];

/** Legacy missing kind = physical product. */
function isPhysicalProduct(p: Product): boolean {
  return p.kind !== "servicio";
}

function isUnitProduct(p: Product): boolean {
  return isPhysicalProduct(p) && p.type === "unit";
}

function isRollProduct(p: Product): boolean {
  return isPhysicalProduct(p) && !isUnitProduct(p);
}

function formatUnits(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Coma → punto; rechaza strings con más de un separador decimal. */
function parseDecimalInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const normalized = trimmed.replace(/,/g, ".");
  if ((normalized.match(/\./g) ?? []).length > 1) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Permite "3," o "3." como paso intermedio sin emitir todavía. */
function isIncompleteDecimal(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return true;
  return /[.,]$/.test(trimmed);
}

function onLargoInput() {
  const text = largoInput.value;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n <= 0) return;
  registerLength.value = n;
}

function onLargoBlur() {
  const n = parseDecimalInput(largoInput.value);
  const final = n === null || n <= 0 ? DIM_MIN : Math.max(DIM_MIN, n);
  largoInput.value = String(final);
  registerLength.value = final;
}

function onAnchoInput() {
  const text = anchoInput.value;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n <= 0) return;
  registerWidth.value = n;
}

function onAnchoBlur() {
  const n = parseDecimalInput(anchoInput.value);
  const final = n === null || n <= 0 ? DIM_MIN : Math.max(DIM_MIN, n);
  anchoInput.value = String(final);
  registerWidth.value = final;
}

function resetRegisterDims() {
  largoInput.value = "";
  anchoInput.value = "";
  registerLength.value = null;
  registerWidth.value = null;
}

function resetWithdrawAmount() {
  withdrawArea.value = null;
  withdrawLinearInput.value = "";
  withdrawLinearMeters.value = null;
}

function setWithdrawUnit(unit: "m2" | "linear") {
  if (withdrawUnit.value === unit) return;
  withdrawUnit.value = unit;
  resetWithdrawAmount();
}

function onWithdrawLinearInput() {
  const text = withdrawLinearInput.value;
  if (text.trim() === "" || text.trim() === "-") {
    withdrawLinearMeters.value = null;
    return;
  }
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n <= 0) {
    withdrawLinearMeters.value = null;
    return;
  }
  withdrawLinearMeters.value = n;
}

function onWithdrawLinearBlur() {
  const n = parseDecimalInput(withdrawLinearInput.value);
  if (n === null || n <= 0) {
    withdrawLinearInput.value = "";
    withdrawLinearMeters.value = null;
    return;
  }
  withdrawLinearInput.value = String(n);
  withdrawLinearMeters.value = n;
}

const filteredProducts = computed(() => {
  const q = productQuery.value.trim().toLowerCase();
  if (!q) return [] as Product[];
  return products.value
    .filter(
      (p) =>
        isRollProduct(p) &&
        (p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          p.subtitle?.toLowerCase().includes(q)),
    )
    .slice(0, 10);
});

const filteredUnitProducts = computed(() => {
  const q = unitProductQuery.value.trim().toLowerCase();
  const units = products.value.filter(isUnitProduct);
  if (!q) return units.slice(0, 10);
  return units
    .filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.subtitle?.toLowerCase().includes(q),
    )
    .slice(0, 10);
});

const filteredAllowedProducts = computed(() => {
  const q = allowedProductQuery.value.trim().toLowerCase();
  if (!q) return allowedProducts.value;
  return allowedProducts.value.filter(
    (p) =>
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q),
  );
});

const filteredProjects = computed(() => {
  const active = projects.value.filter((p) =>
    ACTIVE_STATUSES.includes(p.status),
  );
  const q = projectQuery.value.trim().toLowerCase();
  if (!q) return active;
  return active.filter((p) => p.name?.toLowerCase().includes(q));
});

const registerAreaPreview = computed(() => {
  const length = registerLength.value;
  const width = registerWidth.value;
  if (
    typeof length !== "number" ||
    typeof width !== "number" ||
    !(length > 0) ||
    !(width > 0)
  ) {
    return null;
  }
  return Math.round(length * width * 100) / 100;
});

const canSaveRegister = computed(
  () =>
    Boolean(selectedProduct.value) &&
    typeof registerLength.value === "number" &&
    registerLength.value > 0 &&
    typeof registerWidth.value === "number" &&
    registerWidth.value > 0,
);

const canSaveUnitRegister = computed(
  () =>
    Boolean(selectedUnitProduct.value) &&
    typeof unitQuantity.value === "number" &&
    unitQuantity.value > 0,
);

const unitWithdrawExceeds = computed(() => {
  if (!selectedUnitProduct.value) return false;
  const qty = unitQuantity.value;
  if (typeof qty !== "number") return false;
  return qty > (selectedUnitProduct.value.stockQuantity ?? 0);
});

const canSaveUnitWithdraw = computed(
  () =>
    Boolean(selectedUnitProduct.value) &&
    Boolean(selectedProject.value) &&
    typeof unitQuantity.value === "number" &&
    unitQuantity.value > 0 &&
    !unitWithdrawExceeds.value,
);

const withdrawLinearAreaPreview = computed(() => {
  if (withdrawUnit.value !== "linear") return null;
  const meters = withdrawLinearMeters.value;
  const width = withdrawRoll.value?.rollWidth;
  if (
    typeof meters !== "number" ||
    typeof width !== "number" ||
    !(meters > 0) ||
    !(width > 0)
  ) {
    return null;
  }
  return round2(meters * width);
});

/** Área en m² que se enviará a withdraw(), según el modo activo. */
const withdrawAreaResolved = computed(() => {
  if (withdrawUnit.value === "linear") {
    return withdrawLinearAreaPreview.value;
  }
  const area = withdrawArea.value;
  if (typeof area !== "number" || !Number.isFinite(area)) return null;
  return area;
});

const withdrawExceeds = computed(() => {
  if (!withdrawRoll.value) return false;
  const area = withdrawAreaResolved.value;
  if (typeof area !== "number") return false;
  return area > withdrawRoll.value.remainingArea;
});

const canSaveWithdraw = computed(
  () =>
    typeof withdrawAreaResolved.value === "number" &&
    withdrawAreaResolved.value > 0 &&
    !withdrawExceeds.value &&
    Boolean(selectedProject.value) &&
    Boolean(withdrawRoll.value),
);

function formatMeters(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function statusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    planificado: "Planificado",
    instalando: "Instalando",
    liquidado: "Liquidado",
    cerrado: "Cerrado",
  };
  return labels[status] ?? status;
}

function bumpScanner() {
  scannerKey.value += 1;
}

function bumpStockList() {
  stockListKey.value += 1;
}

function resetUnitForm() {
  selectedUnitProduct.value = null;
  unitProductQuery.value = "";
  showUnitProductSuggestions.value = false;
  unitQuantity.value = null;
}

function goHome() {
  mode.value = "home";
  existingRoll.value = null;
  withdrawRoll.value = null;
  selectedProject.value = null;
  selectedAllowedProduct.value = null;
  allowedProducts.value = [];
  unmatchedQuoteCodes.value = [];
  excludedServices.value = [];
  pendingBarcode.value = "";
  resetUnitForm();
  bumpStockList();
  if (route.query.action) {
    void router.replace({ path: "/inventario" });
  }
}

function goToCosting() {
  void router.push("/inventario/costeo");
}

function startRegister() {
  if (!canUseActions.value) return;
  resetUnitForm();
  mode.value = "register-type";
}

function chooseRegisterRoll() {
  mode.value = "register-scan";
  bumpScanner();
}

function chooseRegisterUnit() {
  resetUnitForm();
  mode.value = "register-unit";
  void loadProducts();
}

function resumeRegisterScan() {
  existingRoll.value = null;
  pendingBarcode.value = "";
  selectedProduct.value = null;
  productQuery.value = "";
  resetRegisterDims();
  registerBatchNumber.value = "";
  mode.value = "register-scan";
  bumpScanner();
}

function startWithdraw() {
  if (!canUseActions.value) return;
  selectedProject.value = null;
  withdrawRoll.value = null;
  selectedAllowedProduct.value = null;
  allowedProducts.value = [];
  unmatchedQuoteCodes.value = [];
  excludedServices.value = [];
  allowedProductQuery.value = "";
  projectQuery.value = "";
  resetUnitForm();
  mode.value = "withdraw-project";
  void loadProjects();
}

function backToWithdrawProduct() {
  withdrawRoll.value = null;
  withdrawUnit.value = "m2";
  resetWithdrawAmount();
  resetUnitForm();
  selectedAllowedProduct.value = null;
  mode.value = "withdraw-product";
}

function resumeWithdrawScan() {
  withdrawRoll.value = null;
  withdrawUnit.value = "m2";
  resetWithdrawAmount();
  mode.value = "withdraw-scan";
  bumpScanner();
}

function selectProduct(p: Product) {
  selectedProduct.value = p;
  productQuery.value = `${p.code} — ${p.name}`;
  showProductSuggestions.value = false;
}

function selectUnitProduct(p: Product) {
  selectedUnitProduct.value = p;
  unitProductQuery.value = `${p.code} — ${p.name}`;
  showUnitProductSuggestions.value = false;
}

function selectAllowedProduct(p: ProjectInventoryProduct) {
  selectedAllowedProduct.value = p;
  if (p.type === "unit") {
    selectedUnitProduct.value = {
      id: p.productId,
      code: p.code,
      name: p.name,
      type: "unit",
      stockQuantity: p.stockQuantity ?? 0,
    };
    unitQuantity.value = null;
    mode.value = "withdraw-unit";
    return;
  }
  resetUnitForm();
  mode.value = "withdraw-scan";
  bumpScanner();
}

async function selectProject(p: Project) {
  selectedProject.value = p;
  selectedAllowedProduct.value = null;
  allowedProductQuery.value = "";
  mode.value = "withdraw-product";
  await loadAllowedProducts(p.id);
}

async function loadAllowedProducts(projectId: string) {
  allowedProductsLoading.value = true;
  allowedProducts.value = [];
  unmatchedQuoteCodes.value = [];
  excludedServices.value = [];
  excludedServices.value = [];
  try {
    const result = await listInventoryProducts(projectId);
    allowedProducts.value = result.products ?? [];
    unmatchedQuoteCodes.value = result.unmatchedCodes ?? [];
    excludedServices.value = result.excludedServices ?? [];
  } catch (e: unknown) {
    toast.show(
      e instanceof Error
        ? e.message
        : "No se pudieron cargar productos de la cotización",
      "error",
    );
  } finally {
    allowedProductsLoading.value = false;
  }
}

async function loadProducts() {
  try {
    const result = await api.get("/api/products");
    products.value = (result?.data ?? []) as Product[];
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudieron cargar productos",
      "error",
    );
  }
}

async function loadProjects() {
  projectsLoading.value = true;
  try {
    projects.value = await listProjects();
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudieron cargar proyectos",
      "error",
    );
  } finally {
    projectsLoading.value = false;
  }
}

async function onRegisterScan(barcode: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    const found = await lookupByBarcode(barcode);
    if (found) {
      existingRoll.value = found;
      mode.value = "register-exists";
      return;
    }
    pendingBarcode.value = barcode;
    selectedProduct.value = null;
    productQuery.value = "";
    resetRegisterDims();
    registerBatchNumber.value = "";
    mode.value = "register-form";
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "Error al buscar el código",
      "error",
    );
    bumpScanner();
  } finally {
    busy.value = false;
  }
}

async function saveRegister() {
  if (!canSaveRegister.value || !selectedProduct.value) return;
  saving.value = true;
  try {
    await register({
      productId: selectedProduct.value.id,
      barcodeValue: pendingBarcode.value,
      rollLength: Number(registerLength.value),
      rollWidth: Number(registerWidth.value),
      batchNumber: registerBatchNumber.value.trim() || undefined,
    });
    sessionRegistered.value += 1;
    toast.show("Rollo registrado.", "success");
    resumeRegisterScan();
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudo registrar el rollo",
      "error",
    );
  } finally {
    saving.value = false;
  }
}

async function onWithdrawScan(barcode: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    const found = await lookupByBarcode(barcode);
    if (!found) {
      toast.show("Rollo no encontrado", "error");
      bumpScanner();
      return;
    }
    if (
      selectedAllowedProduct.value &&
      found.productId !== selectedAllowedProduct.value.productId
    ) {
      toast.show(
        `Este rollo es de "${found.productName}", no del producto seleccionado.`,
        "error",
      );
      bumpScanner();
      return;
    }
    withdrawRoll.value = found;
    withdrawUnit.value = "m2";
    resetWithdrawAmount();
    mode.value = "withdraw-form";
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "Error al buscar el código",
      "error",
    );
    bumpScanner();
  } finally {
    busy.value = false;
  }
}

async function saveWithdraw() {
  if (!canSaveWithdraw.value || !selectedProject.value || !withdrawRoll.value) {
    return;
  }
  const withdrawnArea = withdrawAreaResolved.value;
  if (typeof withdrawnArea !== "number" || !(withdrawnArea > 0)) return;

  saving.value = true;
  try {
    await withdraw({
      barcodeValue: withdrawRoll.value.barcodeValue,
      projectId: selectedProject.value.id,
      withdrawnArea,
    });
    toast.show("Retiro registrado.", "success");
    resumeWithdrawScan();
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudo registrar el retiro",
      "error",
    );
  } finally {
    saving.value = false;
  }
}

async function saveUnitRegister() {
  if (!canSaveUnitRegister.value || !selectedUnitProduct.value) return;
  const quantity = unitQuantity.value;
  if (typeof quantity !== "number" || !(quantity > 0)) return;

  saving.value = true;
  try {
    const result = await stockIn({
      productId: selectedUnitProduct.value.id,
      quantity,
    });
    sessionUnitRegistered.value += quantity;
    selectedUnitProduct.value = {
      ...selectedUnitProduct.value,
      stockQuantity: result.product.stockQuantity,
    };
    unitQuantity.value = null;
    toast.show("Entrada registrada.", "success");
    // Refresh product list so stockQuantity stays current.
    void loadProducts();
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudo registrar la entrada",
      "error",
    );
  } finally {
    saving.value = false;
  }
}

async function saveUnitWithdraw() {
  if (
    !canSaveUnitWithdraw.value ||
    !selectedUnitProduct.value ||
    !selectedProject.value
  ) {
    return;
  }
  const quantity = unitQuantity.value;
  if (typeof quantity !== "number" || !(quantity > 0)) return;

  saving.value = true;
  try {
    const result = await stockOut({
      productId: selectedUnitProduct.value.id,
      quantity,
      projectId: selectedProject.value.id,
    });
    selectedUnitProduct.value = {
      ...selectedUnitProduct.value,
      stockQuantity: result.product.stockQuantity,
    };
    unitQuantity.value = null;
    toast.show("Retiro registrado.", "success");
    void loadProducts();
  } catch (e: unknown) {
    toast.show(
      e instanceof Error ? e.message : "No se pudo registrar el retiro",
      "error",
    );
  } finally {
    saving.value = false;
  }
}

function applyActionFromQuery() {
  if (!canUseActions.value) return;
  const action = route.query.action;
  if (action === "registrar") {
    startRegister();
  } else if (action === "retirar") {
    startWithdraw();
  }
}

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchProfile();
  }
  if (canUseActions.value) {
    void loadProducts();
  }
  applyActionFromQuery();
});
</script>

<style scoped>
.inv-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.inv-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.inv-header--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.inv-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #0f172a;
}

.inv-subtitle,
.step-hint {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
}

.btn-costing-link {
  align-self: flex-start;
  margin-top: 0.35rem;
  border: none;
  background: transparent;
  color: #053f51;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.btn-costing-link:hover {
  text-decoration: underline;
}

.suggestion-stock {
  color: #64748b;
  font-size: 0.8rem;
}

.inv-section-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #053f51;
}

.session-count {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f9f70;
}

.inv-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inv-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  width: 100%;
  min-height: 7rem;
  padding: 1.35rem 1.5rem;
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

.inv-card:hover,
.inv-card:focus-visible {
  border-color: #0f9f70;
  outline: none;
  transform: translateY(-1px);
}

.inv-card:active {
  transform: scale(0.985);
}

.inv-card-label {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

.inv-card-hint {
  font-size: 0.95rem;
  color: #64748b;
}

.btn-back {
  border: none;
  background: transparent;
  color: #053f51;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.25rem 0;
}

.btn-primary,
.btn-secondary {
  padding: 0.85rem 1.1rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #053f51;
  color: #fff;
  width: 100%;
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  flex: 1;
}

.busy-text,
.empty-text {
  margin: 0;
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
}

.result-card {
  padding: 1.1rem 1.25rem;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.result-card--warn {
  border-color: #fbbf24;
  background: #fffbeb;
}

.result-alert {
  margin: 0 0 0.5rem 0;
  font-weight: 700;
  color: #b45309;
}

.result-code {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95rem;
  color: #334155;
  word-break: break-all;
}

.result-line {
  margin: 0.35rem 0 0 0;
  color: #0f172a;
  font-size: 0.95rem;
}

.result-line.muted {
  color: #64748b;
}

.result-dims {
  font-size: 0.85rem;
}

.area-preview {
  margin: -0.35rem 0 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #053f51;
}

.conversion-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.withdraw-unit-control {
  display: flex;
}

.segmented-control {
  display: inline-flex;
  padding: 4px;
  border-radius: 12px;
  background: #eef2f6;
  gap: 2px;
}

.segmented-option {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
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

.inv-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.form-input {
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px #0f9f70;
}

.field-error {
  margin: 0;
  font-size: 0.85rem;
  color: #b91c1c;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.form-actions .btn-primary {
  flex: 1.4;
}

.product-search {
  position: relative;
}

.suggestions {
  list-style: none;
  margin: 0.35rem 0 0 0;
  padding: 0.35rem 0;
  position: absolute;
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

.suggestion {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  padding: 0.65rem 0.85rem;
  cursor: pointer;
}

.suggestion:hover {
  background: #f0fdf4;
}

.suggestion-code {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  background: #053f51;
  color: #fff;
}

.suggestion-name {
  font-size: 0.9rem;
  color: #0f172a;
}

.selected-product {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.project-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.15rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.project-item:hover,
.project-item:focus-visible {
  border-color: #0f9f70;
  outline: none;
}

.project-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 1rem;
  min-width: 0;
  word-break: break-word;
}

.project-status {
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #053f51;
  background: rgba(5, 63, 81, 0.08);
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}

.product-pick-item {
  align-items: flex-start;
}

.product-pick-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
  min-width: 0;
  flex: 1;
}

.product-pick-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.95rem;
  line-height: 1.35;
  word-break: break-word;
}

.product-pick-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  flex-shrink: 0;
}

.product-pick-kind {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #053f51;
  background: rgba(5, 63, 81, 0.08);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  white-space: nowrap;
}

.product-pick-stock {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .inv-page {
    gap: 1rem;
  }

  .inv-section-title {
    font-size: 1.1rem;
  }

  .inv-subtitle,
  .step-hint {
    font-size: 0.875rem;
  }

  .product-search .form-input {
    font-size: 0.95rem;
    padding: 0.7rem 0.85rem;
  }

  .project-item {
    padding: 0.85rem 1rem;
    gap: 0.5rem;
  }

  .project-name {
    font-size: 0.9rem;
    min-width: 0;
  }

  .product-pick-item {
    flex-direction: column;
    align-items: stretch;
  }

  .product-pick-main {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
  }

  .product-pick-name {
    font-size: 0.875rem;
    width: 100%;
  }

  .product-pick-meta {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
