<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">Productos</h1>
      <div class="page-header-actions">
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Ej: Buscar por código, nombre..."
          />
        </div>
        <div class="actions-row">
          <button
            type="button"
            class="btn-secondary"
            :disabled="loading"
            @click="fetchProducts"
          >
            {{ loading ? "Cargando…" : "Actualizar" }}
          </button>
          <button type="button" class="btn-add" @click="openAddModal">
            <span class="btn-add-icon" aria-hidden="true">+</span>
            Agregar
          </button>
        </div>
      </div>
    </header>

    <section class="list-section">
      <p v-if="error" class="error-text">{{ error }}</p>
      <div v-else-if="filteredProducts.length === 0" class="list-empty">
        <p>
          {{
            searchQuery.trim()
              ? "No hay productos que coincidan con la búsqueda."
              : loading
                ? "Cargando…"
                : "No hay productos. Agrega uno con el botón Agregar."
          }}
        </p>
      </div>

      <ul v-else class="data-list">
        <li
          v-for="product in filteredProducts"
          :key="product.id"
          class="data-item"
        >
          <div class="data-main">
            <span v-if="product.code" class="data-code">{{
              product.code
            }}</span>
            <p class="data-title">{{ product.name }}</p>
            <p v-if="product.subtitle" class="data-meta">
              {{ product.subtitle }}
            </p>
            <div class="data-tags">
              <span class="data-kind">{{
                product.kind === "servicio" ? "Servicio" : "Producto"
              }}</span>
              <span
                v-if="product.kind !== 'servicio'"
                class="data-type"
              >
                {{ product.type === "unit" ? "Unidad" : "Rollo" }}
              </span>
              <span class="data-price">{{ formatCurrency(product.price) }}</span>
              <span
                v-if="product.kind !== 'servicio' && product.type === 'unit'"
                class="data-stock"
              >
                Stock: {{ formatUnits(product.stockQuantity ?? 0) }}
              </span>
            </div>
          </div>
          <div class="data-side">
            <button
              type="button"
              class="icon-button"
              aria-label="Editar producto"
              title="Editar"
              @click="openEditModal(product)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </section>

    <AppModal
      v-model="showAddModal"
      title="Nuevo producto"
      :close-on-backdrop="!savingNew"
    >
      <form class="edit-form" @submit.prevent="saveNew">
        <label class="form-field">
          <span class="form-label">Código</span>
          <input
            :value="addForm.code"
            class="input-code"
            type="text"
            required
            autocomplete="off"
            @input="onAddCodeInput"
          />
        </label>
        <label class="form-field">
          <span class="form-label">Nombre</span>
          <input v-model="addForm.name" type="text" required />
        </label>
        <label class="form-field">
          <span class="form-label">Categoría</span>
          <select v-model="addForm.kind" class="form-select" required @change="onAddKindChange">
            <option disabled value="">Selecciona una categoría…</option>
            <option value="producto">Producto (inventario)</option>
            <option value="servicio">Servicio</option>
          </select>
        </label>
        <label v-if="addForm.kind === 'producto'" class="form-field">
          <span class="form-label">Tipo de producto</span>
          <select v-model="addForm.type" class="form-select" required>
            <option disabled value="">Selecciona un tipo…</option>
            <option value="roll">Rollo (geomembrana / área)</option>
            <option value="unit">Unidad (cantidad numérica)</option>
          </select>
        </label>
        <label class="form-field">
          <span class="form-label">Descripción / Subtítulo (opcional)</span>
          <input v-model="addForm.subtitle" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Precio (opcional)</span>
          <input
            v-model.number="addForm.price"
            type="number"
            step="0.01"
            min="0"
          />
        </label>
      </form>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="savingNew"
          @click="showAddModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="savingNew || !canSaveNew"
          @click="saveNew"
        >
          {{ savingNew ? "Guardando…" : "Guardar" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showEditModal"
      title="Editar producto"
      :close-on-backdrop="!savingEdit && !deletingProduct"
    >
      <form
        v-if="editingProductId"
        class="edit-form"
        @submit.prevent="saveEdit"
      >
        <label class="form-field">
          <span class="form-label">Código</span>
          <input
            :value="editForm.code"
            class="input-code"
            type="text"
            autocomplete="off"
            @input="onEditCodeInput"
          />
        </label>
        <label class="form-field">
          <span class="form-label">Nombre</span>
          <input v-model="editForm.name" type="text" required />
        </label>
        <label class="form-field">
          <span class="form-label">Categoría</span>
          <select
            v-model="editForm.kind"
            class="form-select"
            :disabled="kindLocked || typeLockLoading"
            required
            @change="onEditKindChange"
          >
            <option value="producto">Producto (inventario)</option>
            <option value="servicio">Servicio</option>
          </select>
          <span v-if="typeLockLoading" class="form-hint">
            Verificando inventario…
          </span>
          <span v-else-if="kindLocked" class="form-hint">
            La categoría no se puede cambiar porque este producto ya tiene
            rollos o movimientos de stock registrados.
          </span>
        </label>
        <label v-if="editForm.kind === 'producto'" class="form-field">
          <span class="form-label">Tipo de producto</span>
          <select
            v-model="editForm.type"
            class="form-select"
            :disabled="typeLocked || typeLockLoading"
            required
          >
            <option disabled value="">Selecciona un tipo…</option>
            <option value="roll">Rollo (geomembrana / área)</option>
            <option value="unit">Unidad (cantidad numérica)</option>
          </select>
          <span v-if="typeLockLoading" class="form-hint">
            Verificando inventario…
          </span>
          <span v-else-if="typeLocked" class="form-hint">
            El tipo no se puede cambiar porque este producto ya tiene rollos o
            movimientos de stock registrados.
          </span>
        </label>
        <label class="form-field">
          <span class="form-label">Descripción / Subtítulo</span>
          <input v-model="editForm.subtitle" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Precio</span>
          <input
            v-model.number="editForm.price"
            type="number"
            step="0.01"
            min="0"
          />
        </label>
      </form>
      <template #footer>
        <div class="edit-modal-footer">
          <button
            type="button"
            class="modal-btn btn-delete-product"
            :disabled="savingEdit || deletingProduct"
            @click="showDeleteConfirmModal = true"
          >
            Eliminar
          </button>
          <div class="edit-modal-footer-actions">
            <button
              type="button"
              class="modal-btn modal-btn-cancel"
              :disabled="savingEdit || deletingProduct"
              @click="showEditModal = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="modal-btn modal-btn-primary"
              :disabled="savingEdit || deletingProduct || !canSaveEdit"
              @click="saveEdit"
            >
              {{ savingEdit ? "Guardando…" : "Guardar" }}
            </button>
          </div>
        </div>
      </template>
    </AppModal>

    <AppModal
      v-model="showDeleteConfirmModal"
      title="¿Eliminar producto?"
      variant="danger"
      :close-on-backdrop="!deletingProduct"
      :show-close-button="!deletingProduct"
    >
      <p v-if="editingProductId">
        Se eliminará <strong>{{ editForm.name || "este producto" }}</strong> de
        forma permanente. No se puede deshacer.
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="deletingProduct"
          @click="showDeleteConfirmModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="deletingProduct"
          @click="confirmDeleteProduct"
        >
          {{ deletingProduct ? "Eliminando…" : "Eliminar" }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from "vue";
import AppModal from "../components/AppModal.vue";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";
import { formatCurrency } from "../utils/format";

interface Product {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  price: number;
  kind?: "producto" | "servicio";
  type?: "roll" | "unit";
  stockQuantity?: number;
  unitCost?: number | null;
}

const api = useApi();
const toast = useToastStore();
const products = ref<Product[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref("");

const showAddModal = ref(false);
const savingNew = ref(false);
const addForm = reactive({
  code: "",
  name: "",
  subtitle: "",
  price: 0 as number,
  kind: "" as "" | "producto" | "servicio",
  type: "" as "" | "roll" | "unit",
});

/** Solo habilita Guardar cuando hay código, nombre, categoría y (si producto) tipo. */
const canSaveNew = computed(() => {
  if (!addForm.code?.trim() || !addForm.name?.trim()) return false;
  if (addForm.kind !== "producto" && addForm.kind !== "servicio") return false;
  if (addForm.kind === "producto") {
    return addForm.type === "roll" || addForm.type === "unit";
  }
  return true;
});

const showEditModal = ref(false);
const editingProductId = ref<string | null>(null);
const savingEdit = ref(false);
const showDeleteConfirmModal = ref(false);
const deletingProduct = ref(false);
const typeLocked = ref(false);
const kindLocked = ref(false);
const typeLockLoading = ref(false);
const editForm = reactive({
  code: "",
  name: "",
  subtitle: "",
  price: 0 as number,
  kind: "producto" as "producto" | "servicio",
  type: "" as "" | "roll" | "unit",
});

const canSaveEdit = computed(() => {
  if (!editForm.name?.trim()) return false;
  if (editForm.kind !== "producto" && editForm.kind !== "servicio") return false;
  if (editForm.kind === "producto") {
    return editForm.type === "roll" || editForm.type === "unit";
  }
  return true;
});

function formatUnits(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function onAddCodeInput(e: Event) {
  addForm.code = (e.target as HTMLInputElement).value.toUpperCase();
}

function onEditCodeInput(e: Event) {
  editForm.code = (e.target as HTMLInputElement).value.toUpperCase();
}

function openAddModal() {
  addForm.code = "";
  addForm.name = "";
  addForm.subtitle = "";
  addForm.price = 0;
  addForm.kind = "";
  addForm.type = "";
  showAddModal.value = true;
}

async function saveNew() {
  if (!canSaveNew.value) return;
  if (addForm.kind !== "producto" && addForm.kind !== "servicio") return;
  savingNew.value = true;
  try {
    const payload: Record<string, unknown> = {
      code: (addForm.code?.trim() ?? "").toUpperCase(),
      name: addForm.name.trim(),
      subtitle: addForm.subtitle?.trim() ?? "",
      price: Number(addForm.price) || 0,
      kind: addForm.kind,
    };
    if (addForm.kind === "producto") {
      payload.type = addForm.type;
    }
    await api.post("/api/products", payload);
    toast.show("Producto creado correctamente", "success");
    showAddModal.value = false;
    await fetchProducts();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar";
    toast.show(message, "error");
  } finally {
    savingNew.value = false;
  }
}

async function openEditModal(product: Product) {
  editingProductId.value = product.id;
  editForm.code = (product.code ?? "").toUpperCase();
  editForm.name = product.name ?? "";
  editForm.subtitle = product.subtitle ?? "";
  editForm.price = product.price ?? 0;
  editForm.kind = product.kind === "servicio" ? "servicio" : "producto";
  // If already a physical product, prefill type; if servicio→producto, force pick.
  editForm.type =
    editForm.kind === "producto"
      ? product.type === "unit"
        ? "unit"
        : "roll"
      : "";
  typeLocked.value = false;
  kindLocked.value = false;
  typeLockLoading.value = true;
  showEditModal.value = true;
  try {
    const result = await api.get(
      `/api/products/${encodeURIComponent(product.id)}/inventory-activity`,
    );
    const locked = Boolean(result?.data?.hasInventoryActivity);
    typeLocked.value = locked;
    kindLocked.value = locked;
  } catch {
    // Fail closed: if we can't verify, don't allow type/kind changes.
    typeLocked.value = true;
    kindLocked.value = true;
  } finally {
    typeLockLoading.value = false;
  }
}

watch(showEditModal, (open) => {
  if (!open) {
    editingProductId.value = null;
    showDeleteConfirmModal.value = false;
    typeLocked.value = false;
    kindLocked.value = false;
    typeLockLoading.value = false;
  }
});

function onEditKindChange() {
  // Type only applies to physical products; force an explicit pick when converting.
  editForm.type = "";
}

function onAddKindChange() {
  if (addForm.kind !== "producto") {
    addForm.type = "";
  }
}

async function confirmDeleteProduct() {
  const id = editingProductId.value;
  if (!id) return;
  deletingProduct.value = true;
  try {
    await api.delete(`/api/products/${id}`);
    toast.show("Producto eliminado correctamente", "success");
    showDeleteConfirmModal.value = false;
    showEditModal.value = false;
    await fetchProducts();
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al eliminar el producto";
    toast.show(message, "error");
  } finally {
    deletingProduct.value = false;
  }
}

async function saveEdit() {
  const id = editingProductId.value;
  if (!id || !canSaveEdit.value) return;
  savingEdit.value = true;
  try {
    const payload: Record<string, unknown> = {
      code: (editForm.code?.trim() ?? "").toUpperCase(),
      name: editForm.name.trim(),
      subtitle: editForm.subtitle?.trim() ?? "",
      price: Number(editForm.price) || 0,
      kind: editForm.kind,
    };
    if (editForm.kind === "producto") {
      payload.type = editForm.type;
    }
    await api.put(`/api/products/${id}`, payload);
    toast.show("Producto actualizado correctamente", "success");
    showEditModal.value = false;
    await fetchProducts();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar";
    toast.show(message, "error");
  } finally {
    savingEdit.value = false;
  }
}

const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return products.value;
  return products.value.filter(
    (p) =>
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(q)),
  );
});

async function fetchProducts() {
  loading.value = true;
  error.value = null;
  try {
    const result = await api.get("/api/products");
    products.value = result?.data ?? [];
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al cargar productos";
    error.value = message;
    toast.show(message, "error");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchProducts();
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
}

.search-input:focus {
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.3);
}

.actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
  flex-shrink: 0;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #1d4ed8;
}

.btn-add-icon {
  font-size: 1.1rem;
  line-height: 1;
  font-weight: 700;
}

.btn-secondary {
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  border-color: #0f9f70;
  background: #f0fdf4;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.edit-form .form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.edit-form .form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.edit-form input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
}

.edit-form input:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px #0f9f70;
}

.edit-form .input-code {
  text-transform: uppercase;
}

.error-text {
  color: #b91c1c;
  margin: 0;
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
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.data-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.data-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.data-code {
  display: inline-block;
  align-self: flex-start;
  padding: 0.18rem 0.45rem;
  background: #053f51;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 6px;
  letter-spacing: 0.02em;
}

.data-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
}

.data-meta {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.35;
}

.data-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.data-type {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  background: #e2e8f0;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.data-kind {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  background: #dbeafe;
  color: #1e3a5f;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.data-stock {
  font-size: 0.8rem;
  color: #64748b;
}

.data-side {
  flex-shrink: 0;
}

.data-price {
  display: inline-block;
  margin-top: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.form-select,
.form-readonly {
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
  background: #fff;
}

.form-select:disabled,
.form-readonly:disabled {
  background: #f8fafc;
  color: #64748b;
  cursor: not-allowed;
}

.form-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.icon-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.35rem;
  border-radius: 6px;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s,
    background 0.15s;
}

.icon-button:hover,
.icon-button:focus-visible {
  color: #334155;
  background: #f1f5f9;
  outline: none;
}

.edit-modal-footer {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.edit-modal-footer-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.btn-delete-product {
  color: #b91c1c !important;
  background: #fff !important;
  border: 1px solid #fecaca !important;
}

.btn-delete-product:hover:not(:disabled) {
  background: #fef2f2 !important;
  border-color: #f87171 !important;
}

.btn-delete-product:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .page-header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .actions-row {
    flex-wrap: wrap;
  }

  .data-item {
    flex-wrap: wrap;
  }

  .data-side {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
