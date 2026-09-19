<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">Proyectos</h1>
      <div class="page-header-actions">
        <div class="search-wrap">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Buscar proyecto por nombre o cliente..."
          />
        </div>
      </div>
    </header>

    <section class="list-section">
      <div v-if="loading" class="list-empty">
        <p>Cargando proyectos…</p>
      </div>
      <div v-else-if="error" class="list-empty">
        <p>{{ error }}</p>
        <button class="primary-action" type="button" @click="fetchProjects">
          Reintentar
        </button>
      </div>
      <div v-else-if="projects.length === 0" class="list-empty">
        <p>Aún no hay proyectos.</p>
        <p class="list-empty-hint">
          Convierte una cotización aceptada para crear el primero.
        </p>
      </div>
      <div v-else-if="filteredProjects.length === 0" class="list-empty">
        <p>No se encontraron proyectos con ese criterio</p>
      </div>

      <ul v-else class="project-list">
        <li
          v-for="project in filteredProjects"
          :key="project.id"
          class="project-item"
          @click="openProject(project.id)"
        >
          <div class="project-main">
            <p class="project-title">{{ project.name }}</p>
            <p class="project-client">
              {{ clientName(project) }}
            </p>
          </div>
          <div class="project-meta">
            <span
              class="status-badge"
              :class="`status-badge--${project.status}`"
            >
              <span class="status-badge-dot" aria-hidden="true"></span>
              {{ statusLabel(project.status) }}
            </span>
            <span v-if="updatedLabel(project.updatedAt)" class="project-date">
              {{ updatedLabel(project.updatedAt) }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  useProjects,
  type Project,
  type ProjectStatus,
} from "../composables/useProjects";

const router = useRouter();
const { list } = useProjects();

const projects = ref<Project[]>([]);
const searchQuery = ref("");
const loading = ref(true);
const error = ref("");

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planificado: "Planificado",
  instalando: "Instalando",
  liquidado: "Liquidado",
  cerrado: "Cerrado",
};

const filteredProjects = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return projects.value;
  return projects.value.filter((project) => {
    const name = (project.name ?? "").toLowerCase();
    const client = (
      project.quotationSnapshot?.client?.name ?? ""
    ).toLowerCase();
    const quoteNumber = (
      project.quotationSnapshot?.quoteNumber ?? ""
    ).toLowerCase();
    return (
      name.includes(q) || client.includes(q) || quoteNumber.includes(q)
    );
  });
});

function statusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function clientName(project: Project): string {
  const name = project.quotationSnapshot?.client?.name;
  return typeof name === "string" && name.trim() ? name : "Sin cliente";
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

function updatedLabel(raw: unknown): string {
  const d = parseDate(raw);
  if (!d) return "";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function openProject(id: string) {
  router.push(`/proyectos/${id}`);
}

async function fetchProjects() {
  loading.value = true;
  error.value = "";
  try {
    projects.value = await list();
  } catch (e: unknown) {
    error.value =
      e instanceof Error ? e.message : "No se pudieron cargar los proyectos.";
  } finally {
    loading.value = false;
  }
}

onMounted(fetchProjects);
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100%;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #053f51;
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
  margin: 0 0 0.5rem 0;
  color: #64748b;
  font-size: 0.95rem;
}

.list-empty-hint {
  font-size: 0.85rem !important;
  color: #94a3b8 !important;
}

.primary-action {
  margin-top: 0.75rem;
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
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

.project-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.project-main {
  min-width: 0;
}

.project-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.project-client {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: #64748b;
}

.project-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
  flex-shrink: 0;
}

.project-date {
  font-size: 0.8rem;
  color: #94a3b8;
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
}

.status-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge--planificado {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.3);
}
.status-badge--planificado .status-badge-dot {
  background: #1d4ed8;
}

.status-badge--instalando {
  background: rgba(234, 179, 8, 0.15);
  color: #b45309;
  border-color: rgba(234, 179, 8, 0.35);
}
.status-badge--instalando .status-badge-dot {
  background: #b45309;
}

.status-badge--liquidado {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.35);
}
.status-badge--liquidado .status-badge-dot {
  background: #15803d;
}

.status-badge--cerrado {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border-color: rgba(100, 116, 139, 0.3);
}
.status-badge--cerrado .status-badge-dot {
  background: #475569;
}
</style>
