<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">Clientes</h1>
      <div class="page-header-actions">
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Ej: Buscar por nombre, documento, email..."
          />
        </div>
        <div class="actions-right">
        <div class="actions-row">
          <button
            type="button"
            class="btn-secondary"
            :disabled="loading"
            @click="fetchCustomers"
          >
            <svg
              v-if="!loading"
              class="btn-icon-refresh"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span v-else class="btn-spinner" aria-hidden="true"></span>
            {{ loading ? "Cargando…" : "Actualizar" }}
          </button>
          <!-- <label
            class="btn-primary file-label"
            :class="{ 'file-label--uploading': uploadingExcel }"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".xlsx,.xls"
              class="file-input"
              :disabled="uploadingExcel"
              @change="onFileSelected"
            />
            <span v-if="uploadingExcel" class="btn-with-spinner">
              <span class="btn-spinner" aria-hidden="true"></span>
              Subiendo…
            </span>
            <span v-else>Importar desde Excel</span>
          </label> -->
        </div>
        <button
          type="button"
          class="btn-add"
          @click="openAddModal"
        >
          <span class="btn-add-icon" aria-hidden="true">+</span>
          Agregar
        </button>
        </div>
      </div>
    </header>

    <section class="list-section">
      <p v-if="error" class="error-text">{{ error }}</p>
      <div v-else-if="filteredCustomers.length === 0" class="list-empty">
        <p>
          {{
            searchQuery.trim()
              ? "No hay clientes que coincidan con la búsqueda."
              : loading
                ? "Cargando…"
                : "No hay clientes. Importa un Excel o agrega uno manualmente."
          }}
        </p>
      </div>

      <ul v-else class="data-list">
        <li
          v-for="customer in filteredCustomers"
          :key="customer.id"
          class="data-item"
        >
          <div class="data-main">
            <p class="data-title">{{ customer.name }}</p>
            <p class="data-meta">
              {{
                [customer.document, customer.email, customer.phone]
                  .filter(Boolean)
                  .join(" · ")
              }}
            </p>
            <p v-if="customer.address" class="data-extra">
              {{ customer.address }}
            </p>
          </div>
          <div class="data-side">
            <button
              type="button"
              class="btn-edit"
              title="Editar"
              @click="openEditModal(customer)"
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
      v-model="showEditModal"
      title="Editar cliente"
      :close-on-backdrop="!savingEdit"
    >
      <form
        v-if="editingCustomerId"
        class="edit-form"
        @submit.prevent="saveEdit"
      >
        <label class="form-field">
          <span class="form-label">Razón social / Nombre</span>
          <input v-model="editForm.name" type="text" required />
        </label>
        <label class="form-field">
          <span class="form-label">RUC / Cédula</span>
          <input v-model="editForm.document" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Teléfono</span>
          <input v-model="editForm.phone" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Email</span>
          <input v-model="editForm.email" type="email" />
        </label>
        <label class="form-field">
          <span class="form-label">Dirección</span>
          <input v-model="editForm.address" type="text" />
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

    <AppModal
      v-model="showAddModal"
      title="Nuevo cliente"
      :close-on-backdrop="!savingNew"
    >
      <form class="edit-form" @submit.prevent="saveNew">
        <label class="form-field">
          <span class="form-label">Razón social / Nombre</span>
          <input v-model="addForm.name" type="text" required />
        </label>
        <label class="form-field">
          <span class="form-label">RUC / Cédula</span>
          <input v-model="addForm.document" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Teléfono</span>
          <input v-model="addForm.phone" type="text" />
        </label>
        <label class="form-field">
          <span class="form-label">Email</span>
          <input v-model="addForm.email" type="email" />
        </label>
        <label class="form-field">
          <span class="form-label">Dirección</span>
          <input v-model="addForm.address" type="text" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from "vue";
import AppModal from "../components/AppModal.vue";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";

interface Customer {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
}

const api = useApi();
const toast = useToastStore();
const customers = ref<Customer[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref("");

const showEditModal = ref(false);
const editingCustomerId = ref<string | null>(null);
const savingEdit = ref(false);
const editForm = reactive({
  name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
});

const showAddModal = ref(false);
const savingNew = ref(false);
const addForm = reactive({
  name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
});

function openAddModal() {
  addForm.name = "";
  addForm.document = "";
  addForm.phone = "";
  addForm.email = "";
  addForm.address = "";
  showAddModal.value = true;
}

function openEditModal(customer: Customer) {
  editingCustomerId.value = customer.id;
  editForm.name = customer.name ?? "";
  editForm.document = customer.document ?? "";
  editForm.phone = customer.phone ?? "";
  editForm.email = customer.email ?? "";
  editForm.address = customer.address ?? "";
  showEditModal.value = true;
}

watch(showEditModal, (open) => {
  if (!open) editingCustomerId.value = null;
});

async function saveEdit() {
  const id = editingCustomerId.value;
  if (!id) return;
  savingEdit.value = true;
  try {
    await api.put(`/api/customers/${id}`, {
      name: editForm.name,
      document: editForm.document,
      phone: editForm.phone,
      email: editForm.email,
      address: editForm.address,
    });
    toast.show("Cliente actualizado correctamente", "success");
    showEditModal.value = false;
    await fetchCustomers();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar";
    toast.show(message, "error");
  } finally {
    savingEdit.value = false;
  }
}

async function saveNew() {
  if (!addForm.name?.trim()) return;
  savingNew.value = true;
  try {
    await api.post("/api/customers", {
      name: addForm.name.trim(),
      document: addForm.document ?? "",
      phone: addForm.phone ?? "",
      email: addForm.email ?? "",
      address: addForm.address ?? "",
    });
    toast.show("Cliente creado correctamente", "success");
    showAddModal.value = false;
    await fetchCustomers();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar";
    toast.show(message, "error");
  } finally {
    savingNew.value = false;
  }
}

const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return customers.value;
  return customers.value.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.document.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.address && c.address.toLowerCase().includes(q)),
  );
});

async function fetchCustomers() {
  loading.value = true;
  error.value = null;
  try {
    const result = await api.get("/api/customers");
    customers.value = result?.data ?? [];
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar clientes";
    error.value = message;
    toast.show(message, "error");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchCustomers();
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

.actions-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-icon-refresh {
  flex-shrink: 0;
}

.btn-add {
  flex-shrink: 0;
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

.btn-primary {
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  border: none;
  background: #0f9f70;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #0c7a57;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
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
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
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

.file-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.65rem 1.25rem;
  font-size: 0.95rem;
  line-height: 1.25;
  cursor: pointer;
  margin: 0;
  box-sizing: border-box;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.file-label--uploading {
  pointer-events: none;
  cursor: wait;
}

.btn-with-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: btn-spin 0.7s linear infinite;
}

.btn-secondary .btn-spinner {
  border-color: rgba(15, 23, 42, 0.2);
  border-top-color: #0f172a;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
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
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.data-main {
  min-width: 0;
}

.data-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #0f172a;
}

.data-meta {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.data-extra {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.data-side {
  flex-shrink: 0;
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

.btn-edit:hover {
  background: #dcfce7;
  border-color: #0c7a57;
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

.skipped-section {
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 12px;
}

.skipped-title {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #92400e;
}

.skipped-desc {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #b45309;
}

.skipped-table-wrap {
  overflow-x: auto;
}

.skipped-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.skipped-table th,
.skipped-table td {
  padding: 0.4rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid #fcd34d;
}

.skipped-table th {
  font-weight: 600;
  color: #78350f;
  background: rgba(251, 191, 36, 0.3);
}

.skipped-table td {
  color: #0f172a;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
