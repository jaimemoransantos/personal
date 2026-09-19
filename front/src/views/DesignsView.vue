<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">Diseños</h1>
      <div class="page-header-actions">
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Buscar diseño por nombre o cliente..."
          />
        </div>
        <button type="button" class="btn-add" @click="openCreateModal">
          <span class="btn-add-icon" aria-hidden="true">+</span>
          Nuevo diseño
        </button>
      </div>
    </header>

    <section class="list-section">
      <p v-if="error" class="error-text">{{ error }}</p>
      <div v-else-if="loading" class="list-empty">
        <p>Cargando diseños…</p>
      </div>
      <div v-else-if="designs.length === 0" class="list-empty">
        <p>Aún no hay diseños geométricos.</p>
        <button type="button" class="btn-add" @click="openCreateModal">
          Crear primer diseño
        </button>
      </div>
      <div v-else-if="filteredDesigns.length === 0" class="list-empty">
        <p>No se encontraron diseños con ese criterio</p>
      </div>

      <ul v-else class="design-grid">
        <li
          v-for="design in filteredDesigns"
          :key="design.id"
          class="design-card"
          @click="openEditModal(design)"
        >
          <div class="design-card__header">
            <h2 class="design-card__title">{{ design.name }}</h2>
            <span class="design-card__type">{{ typeLabel(design.type) }}</span>
          </div>
          <p class="design-card__area">
            {{ formatArea(design.area?.total) }}
            <span class="design-card__unit">m²</span>
          </p>
          <p v-if="design.clientRef" class="design-card__client">
            {{ design.clientRef }}
          </p>
          <div class="design-card__actions" @click.stop>
            <button
              type="button"
              class="icon-button icon-button-delete"
              :aria-label="`Eliminar diseño ${design.name}`"
              title="Eliminar diseño"
              @click="onDelete(design)"
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
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </section>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar diseño"
      message="¿Eliminar este diseño? Esta acción no se puede deshacer."
      confirm-label="Eliminar"
      cancel-label="Cancelar"
      confirming-label="Eliminando…"
      variant="danger"
      :confirming="deleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />

    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showFormModal"
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="design-form-title"
          @click.self="!saving && closeFormModal()"
        >
          <div class="modal-box modal-box--wide">
            <div class="modal-header">
              <h2 id="design-form-title" class="modal-title">
                {{ editingId ? "Editar diseño" : "Nuevo diseño" }}
              </h2>
              <button
                type="button"
                class="modal-close"
                aria-label="Cerrar"
                :disabled="saving"
                @click="closeFormModal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="type-tabs" role="tablist">
                <button
                  v-for="tab in mainTabs"
                  :key="tab.id"
                  type="button"
                  role="tab"
                  class="type-tab"
                  :class="{
                    'type-tab--active': activeMainTab === tab.id,
                    'type-tab--disabled': tab.disabled,
                  }"
                  :disabled="tab.disabled"
                  :aria-selected="activeMainTab === tab.id"
                  :title="tab.disabled ? 'Próximamente' : undefined"
                  @click="!tab.disabled && selectMainTab(tab.id)"
                >
                  {{ tab.label }}
                  <span v-if="tab.disabled" class="type-tab__soon">Próximamente</span>
                </button>
              </div>

              <div
                v-if="isTankType(form.type)"
                class="tank-subtype-tabs"
                role="tablist"
                aria-label="Forma del tanque"
              >
                <button
                  type="button"
                  role="tab"
                  class="tank-subtype-tab"
                  :class="{
                    'tank-subtype-tab--active': form.type === 'tanque_cilindrico',
                  }"
                  :aria-selected="form.type === 'tanque_cilindrico'"
                  @click="selectTankSubtype('tanque_cilindrico')"
                >
                  Cilíndrico
                </button>
                <button
                  type="button"
                  role="tab"
                  class="tank-subtype-tab"
                  :class="{
                    'tank-subtype-tab--active': form.type === 'tanque_rectangular',
                  }"
                  :aria-selected="form.type === 'tanque_rectangular'"
                  @click="selectTankSubtype('tanque_rectangular')"
                >
                  Rectangular
                </button>
              </div>

              <form class="design-form" @submit.prevent="save">
                <RoundPoolDesigner
                  v-if="
                    form.type === 'piscina_redonda' ||
                    form.type === 'tanque_cilindrico'
                  "
                  v-model="roundPoolDimensions"
                  v-model:waste-percent="form.wastePercent"
                  v-model:name="form.name"
                  v-model:client-ref="form.clientRef"
                  v-model:notes="form.notes"
                />
                <RectangularPoolDesigner
                  v-else-if="
                    form.type === 'piscina_rectangular' ||
                    form.type === 'tanque_rectangular'
                  "
                  v-model="rectangularPoolDimensions"
                  v-model:waste-percent="form.wastePercent"
                  v-model:name="form.name"
                  v-model:client-ref="form.clientRef"
                  v-model:notes="form.notes"
                />
                <RelaveraDesigner
                  v-else-if="form.type === 'relavera'"
                  v-model="relaveraDimensions"
                  v-model:waste-percent="form.wastePercent"
                  v-model:name="form.name"
                  v-model:client-ref="form.clientRef"
                  v-model:notes="form.notes"
                  :auto-close-default="editingId === null"
                  @update:geometry-error="geometryError = $event"
                />
              </form>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="modal-btn modal-btn-cancel"
                :disabled="saving"
                @click="closeFormModal"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="modal-btn modal-btn-primary"
                :disabled="saving || !canSave"
                @click="save"
              >
                {{ saving ? "Guardando…" : "Guardar" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import RoundPoolDesigner from "../components/designs/RoundPoolDesigner.vue";
import RectangularPoolDesigner from "../components/designs/RectangularPoolDesigner.vue";
import RelaveraDesigner from "../components/designs/RelaveraDesigner.vue";
import {
  useDesigns,
  type Design,
  type DesignDimensions,
  type DesignType,
  type RectangularPoolDimensions,
  type RelaveraDimensions,
  type RoundPoolDimensions,
} from "../composables/useDesigns";
import { useToastStore } from "../stores/toast";

const { list, create, update, remove } = useDesigns();
const toast = useToastStore();

const designs = ref<Design[]>([]);
const searchQuery = ref("");
const loading = ref(false);
const error = ref<string | null>(null);
const showFormModal = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const geometryError = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const deleting = ref(false);
const pendingDeleteId = ref<string | null>(null);

const defaultDimensions = (): RoundPoolDimensions => ({
  rTop: 3,
  rBottom: 2.5,
  depth: 1.5,
  anchorWidth: 0.3,
  hasFlatBottom: true,
});

const defaultRelaveraDimensions = (): RelaveraDimensions => ({
  edges: [
    { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 30 },
    { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 30 },
    { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 30 },
    { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 30 },
  ],
  vertexHeights: [2, 2, 2, 2],
  anchorWidth: 0.5,
  hasFlatBottom: true,
});

const defaultRectangularPoolDimensions = (): RectangularPoolDimensions => ({
  length: 8,
  width: 4,
  depth: 1.8,
  slopeAngles: [45, 45, 45, 45],
  anchorWidth: 0.4,
  hasFlatBottom: true,
});

const defaultTankCylindricalDimensions = (): RoundPoolDimensions => ({
  rTop: 2.5,
  rBottom: 2.5,
  depth: 3,
  anchorWidth: 0.3,
  hasFlatBottom: true,
});

const defaultTankRectangularDimensions = (): RectangularPoolDimensions => ({
  length: 4,
  width: 3,
  depth: 3,
  slopeAngles: [85, 85, 85, 85],
  anchorWidth: 0.3,
  hasFlatBottom: true,
});

type MainTabId =
  | "piscina_redonda"
  | "piscina_rectangular"
  | "tanque"
  | "relavera";

type TankSubtype = "tanque_cilindrico" | "tanque_rectangular";

interface DesignForm {
  name: string;
  type: DesignType;
  dimensions: DesignDimensions;
  wastePercent: number;
  notes: string;
  clientRef: string;
}

const form = reactive<DesignForm>({
  name: "",
  type: "piscina_redonda" as DesignType,
  dimensions: defaultDimensions(),
  wastePercent: 10,
  notes: "",
  clientRef: "",
});

const mainTabs: Array<{ id: MainTabId; label: string; disabled: boolean }> = [
  { id: "piscina_redonda", label: "Piscina redonda", disabled: false },
  { id: "piscina_rectangular", label: "Piscina rectangular", disabled: false },
  { id: "tanque", label: "Tanque", disabled: false },
  { id: "relavera", label: "Relavera", disabled: false },
];

const TYPE_LABELS: Record<DesignType, string> = {
  piscina_redonda: "Piscina redonda",
  piscina_rectangular: "Piscina rectangular",
  tanque_cilindrico: "Tanque cilíndrico",
  tanque_rectangular: "Tanque rectangular",
  relavera: "Relavera",
};

const canSave = computed(
  () => Boolean(form.name.trim()) && !geometryError.value,
);

function isTankType(type: DesignType): type is TankSubtype {
  return type === "tanque_cilindrico" || type === "tanque_rectangular";
}

const activeMainTab = computed<MainTabId>(() => {
  if (isTankType(form.type)) return "tanque";
  return form.type as MainTabId;
});

const roundPoolDimensions = computed<RoundPoolDimensions>({
  get: () =>
    isRoundPoolDimensions(form.dimensions)
      ? form.dimensions
      : form.type === "tanque_cilindrico"
        ? defaultTankCylindricalDimensions()
        : defaultDimensions(),
  set: (value) => {
    form.dimensions = value;
  },
});

const relaveraDimensions = computed<RelaveraDimensions>({
  get: () =>
    isRelaveraDimensions(form.dimensions)
      ? form.dimensions
      : defaultRelaveraDimensions(),
  set: (value) => {
    form.dimensions = value;
  },
});

const rectangularPoolDimensions = computed<RectangularPoolDimensions>({
  get: () =>
    isRectangularPoolDimensions(form.dimensions)
      ? form.dimensions
      : form.type === "tanque_rectangular"
        ? defaultTankRectangularDimensions()
        : defaultRectangularPoolDimensions(),
  set: (value) => {
    form.dimensions = value;
  },
});

function typeLabel(type: DesignType): string {
  return TYPE_LABELS[type] ?? type;
}

const filteredDesigns = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return designs.value;
  return designs.value.filter((design) => {
    const name = (design.name ?? "").toLowerCase();
    const clientRef = (design.clientRef ?? "").toLowerCase();
    const type = typeLabel(design.type).toLowerCase();
    return (
      name.includes(q) || clientRef.includes(q) || type.includes(q)
    );
  });
});

function isRelaveraDimensions(
  dimensions: DesignDimensions,
): dimensions is RelaveraDimensions {
  return Array.isArray((dimensions as RelaveraDimensions).edges);
}

function isRoundPoolDimensions(
  dimensions: DesignDimensions,
): dimensions is RoundPoolDimensions {
  return typeof (dimensions as RoundPoolDimensions).rTop === "number";
}

function isRectangularPoolDimensions(
  dimensions: DesignDimensions,
): dimensions is RectangularPoolDimensions {
  const dims = dimensions as RectangularPoolDimensions;
  return (
    typeof dims.length === "number" &&
    typeof dims.width === "number" &&
    Array.isArray(dims.slopeAngles) &&
    dims.slopeAngles.length === 4
  );
}

function cloneDimensions(dimensions: DesignDimensions): DesignDimensions {
  if (isRelaveraDimensions(dimensions)) {
    return {
      ...dimensions,
      edges: dimensions.edges.map((edge) => ({ ...edge })),
      vertexHeights: [...dimensions.vertexHeights],
    };
  }
  if (isRectangularPoolDimensions(dimensions)) {
    return {
      ...dimensions,
      slopeAngles: [...dimensions.slopeAngles] as RectangularPoolDimensions["slopeAngles"],
    };
  }
  return { ...dimensions };
}

function selectMainTab(tab: MainTabId) {
  geometryError.value = null;
  if (tab === "tanque") {
    if (isTankType(form.type)) return;
    form.type = "tanque_cilindrico";
    form.dimensions = defaultTankCylindricalDimensions();
    return;
  }

  if (form.type === tab) return;
  form.type = tab;
  if (tab === "relavera") {
    form.dimensions = defaultRelaveraDimensions();
  } else if (tab === "piscina_redonda") {
    form.dimensions = defaultDimensions();
  } else if (tab === "piscina_rectangular") {
    form.dimensions = defaultRectangularPoolDimensions();
  }
}

function selectTankSubtype(type: TankSubtype) {
  geometryError.value = null;
  if (form.type === type) return;
  form.type = type;
  form.dimensions =
    type === "tanque_cilindrico"
      ? defaultTankCylindricalDimensions()
      : defaultTankRectangularDimensions();
}

function formatArea(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function resetForm() {
  form.name = "";
  form.type = "piscina_redonda";
  form.dimensions = defaultDimensions();
  form.wastePercent = 10;
  form.notes = "";
  form.clientRef = "";
  geometryError.value = null;
}

function openCreateModal() {
  editingId.value = null;
  resetForm();
  showFormModal.value = true;
}

function openEditModal(design: Design) {
  editingId.value = design.id;
  form.name = design.name;
  form.type = design.type;
  form.dimensions = cloneDimensions(design.dimensions);
  form.wastePercent = design.area?.wastePercent ?? 10;
  form.notes = design.notes ?? "";
  form.clientRef = design.clientRef ?? "";
  geometryError.value = null;
  showFormModal.value = true;
}

function closeFormModal() {
  if (saving.value) return;
  showFormModal.value = false;
  editingId.value = null;
}

async function fetchDesigns() {
  loading.value = true;
  error.value = null;
  try {
    designs.value = await list();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar diseños";
    error.value = message;
    toast.show(message, "error");
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!canSave.value) return;
  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      dimensions: form.dimensions,
      wastePercent: form.wastePercent,
      notes: form.notes.trim() || undefined,
      clientRef: form.clientRef.trim() || undefined,
    };

    if (editingId.value) {
      await update(editingId.value, payload);
      toast.show("Diseño actualizado correctamente", "success");
    } else {
      await create(payload);
      toast.show("Diseño creado correctamente", "success");
    }

    showFormModal.value = false;
    editingId.value = null;
    await fetchDesigns();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar";
    toast.show(message, "error");
  } finally {
    saving.value = false;
  }
}

function onDelete(design: Design) {
  pendingDeleteId.value = design.id;
  showDeleteConfirm.value = true;
}

function cancelDelete() {
  if (deleting.value) return;
  showDeleteConfirm.value = false;
  pendingDeleteId.value = null;
}

async function confirmDelete() {
  const id = pendingDeleteId.value;
  if (!id || deleting.value) return;
  deleting.value = true;
  try {
    await remove(id);
    toast.show("Diseño eliminado", "success");
    if (editingId.value === id) {
      showFormModal.value = false;
      editingId.value = null;
    }
    showDeleteConfirm.value = false;
    pendingDeleteId.value = null;
    await fetchDesigns();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar";
    toast.show(message, "error");
  } finally {
    deleting.value = false;
  }
}

onMounted(fetchDesigns);
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

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: auto;
  flex-shrink: 0;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  border: none;
  background: #053f51;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #06475b;
}

.btn-add-icon {
  font-size: 1.1rem;
  line-height: 1;
  font-weight: 700;
}

.list-section {
  flex: 1;
}

.list-empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-text {
  color: #b91c1c;
  margin: 0;
}

.design-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.design-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.1rem;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.design-card:hover {
  border-color: #c4a574;
  box-shadow: 0 4px 14px rgba(42, 37, 32, 0.08);
  transform: translateY(-1px);
}

.design-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.design-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.design-card__type {
  font-size: 0.75rem;
  font-weight: 500;
  color: #1e5c4a;
  background: #f0fdf4;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  align-self: flex-start;
}

.design-card__area {
  margin: 0.25rem 0 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #053f51;
}

.design-card__unit {
  font-size: 0.85rem;
  font-weight: 500;
  color: #64748b;
}

.design-card__client {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}

.design-card__actions {
  margin-top: auto;
  padding-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
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

.icon-button-delete:hover,
.icon-button-delete:focus-visible {
  color: #b91c1c;
  background: #fef2f2;
  outline: none;
}

/* Wide modal (form with 3D preview) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(42, 37, 32, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-box {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-box--wide {
  max-width: min(1100px, 90vw);
}

@media (min-width: 861px) {
  .modal-box--wide {
    max-height: none;
    overflow: visible;
  }

  .modal-box--wide .modal-body {
    overflow: visible;
  }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem 0;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #0f172a;
}

.modal-close {
  flex-shrink: 0;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 6px;
}

.modal-close:hover:not(:disabled) {
  color: #0f172a;
  background: #f1f5f9;
}

.modal-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 1rem 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.modal-btn-primary {
  background: #053f51;
  color: #fff;
}

.modal-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.type-tab {
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #d4c4a8;
  background: #faf6f0;
  color: #4a3f35;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
}

.type-tab--active {
  background: #1e5c4a;
  border-color: #1e5c4a;
  color: #fff;
}

.type-tab--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.type-tab__soon {
  font-size: 0.65rem;
  font-weight: 400;
  opacity: 0.85;
}

.tank-subtype-tabs {
  display: flex;
  gap: 0.4rem;
  margin: -0.35rem 0 1rem;
}

.tank-subtype-tab {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid #d4c4a8;
  background: #fff;
  color: #4a3f35;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
}

.tank-subtype-tab--active {
  background: #053f51;
  border-color: #053f51;
  color: #fff;
}

.design-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.design-form input,
.design-form textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}

.design-form input:focus,
.design-form textarea:focus {
  outline: none;
  border-color: #1e5c4a;
  box-shadow: 0 0 0 1px rgba(30, 92, 74, 0.25);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
