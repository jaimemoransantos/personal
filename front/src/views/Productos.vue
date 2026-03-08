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
            <span class="data-price">{{ formatCurrency(product.price) }}</span>
          </div>
          <div class="data-side">
            <button
              type="button"
              class="btn-edit"
              title="Editar"
              @click="openEditModal(product)"
            >
              <span class="btn-edit-icon" aria-hidden="true">
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
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  />
                  <path
                    d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  />
                </svg>
              </span>
              Editar
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
          <input v-model="addForm.code" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Nombre</span>
          <input v-model="addForm.name" type="text" required />
        </label>
        <label class="form-field">
          <span class="form-label">Descripción / Subtítulo</span>
          <input v-model="addForm.subtitle" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Precio</span>
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
          :disabled="savingNew"
          @click="saveNew"
        >
          {{ savingNew ? "Guardando…" : "Guardar" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showEditModal"
      title="Editar producto"
      :close-on-backdrop="!savingEdit"
    >
      <form
        v-if="editingProductId"
        class="edit-form"
        @submit.prevent="saveEdit"
      >
        <label class="form-field">
          <span class="form-label">Código</span>
          <input v-model="editForm.code" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Nombre</span>
          <input v-model="editForm.name" type="text" required />
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
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="savingEdit"
          @click="showEditModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="savingEdit"
          @click="saveEdit"
        >
          {{ savingEdit ? "Guardando…" : "Guardar" }}
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
});

const showEditModal = ref(false);
const editingProductId = ref<string | null>(null);
const savingEdit = ref(false);
const editForm = reactive({
  code: "",
  name: "",
  subtitle: "",
  price: 0 as number,
});

function openAddModal() {
  addForm.code = "";
  addForm.name = "";
  addForm.subtitle = "";
  addForm.price = 0;
  showAddModal.value = true;
}

async function saveNew() {
  if (!addForm.name?.trim()) return;
  savingNew.value = true;
  try {
    await api.post("/api/products", {
      code: addForm.code?.trim() ?? "",
      name: addForm.name.trim(),
      subtitle: addForm.subtitle?.trim() ?? "",
      price: Number(addForm.price) || 0,
    });
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

function openEditModal(product: Product) {
  editingProductId.value = product.id;
  editForm.code = product.code ?? "";
  editForm.name = product.name ?? "";
  editForm.subtitle = product.subtitle ?? "";
  editForm.price = product.price ?? 0;
  showEditModal.value = true;
}

watch(showEditModal, (open) => {
  if (!open) editingProductId.value = null;
});

async function saveEdit() {
  const id = editingProductId.value;
  if (!id) return;
  savingEdit.value = true;
  try {
    await api.put(`/api/products/${id}`, {
      code: editForm.code?.trim() ?? "",
      name: editForm.name.trim(),
      subtitle: editForm.subtitle?.trim() ?? "",
      price: Number(editForm.price) || 0,
    });
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

.data-side {
  flex-shrink: 0;
}

.data-price {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.65rem;
  font-size: 0.85rem;
  color: #053f51;
  background: #f0fdf4;
  border: 1px solid #0f9f70;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.btn-edit:hover {
  background: #dcfce7;
  border-color: #0c7a57;
}

.btn-edit-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-edit-icon svg {
  width: 1rem;
  height: 1rem;
  color: inherit;
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
