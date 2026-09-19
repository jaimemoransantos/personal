<template>
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">Usuarios</h1>
      <div class="page-header-actions">
        <button type="button" class="btn-add" @click="openInviteModal">
          <span class="btn-add-icon" aria-hidden="true">+</span>
          Invitar usuario
        </button>
      </div>
    </header>

    <section class="list-section">
      <p v-if="error" class="error-text">{{ error }}</p>
      <div v-else-if="loading" class="list-empty">
        <p>Cargando usuarios…</p>
      </div>
      <div v-else-if="users.length === 0" class="list-empty">
        <p>Aún no hay usuarios en la organización.</p>
      </div>

      <ul v-else class="user-list">
        <li v-for="u in users" :key="u.id" class="user-item">
          <div class="user-main">
            <img
              v-if="u.photoURL && !avatarErrors[u.id]"
              :src="u.photoURL"
              :alt="displayName(u)"
              class="user-avatar"
              referrerpolicy="no-referrer"
              @error="onAvatarError(u.id)"
            />
            <div v-else class="user-avatar-placeholder">
              {{ initials(u) }}
            </div>
            <div class="user-text">
              <p class="user-name">
                {{ displayName(u) }}
                <span v-if="u.id === currentUserId" class="you-tag">Tú</span>
              </p>
              <p class="user-email">{{ u.email }}</p>
            </div>
          </div>

          <div class="user-side">
            <div class="role-controls">
              <span
                class="status-badge"
                :class="`status-badge--${u.role || 'technician'}`"
              >
                <span class="status-badge-dot" aria-hidden="true"></span>
                {{ roleLabel(u.role) }}
              </span>
              <select
                class="role-select"
                :value="u.role || 'technician'"
                :disabled="isSoleAdminSelf(u) || roleUpdatingId === u.id"
                :title="
                  isSoleAdminSelf(u)
                    ? 'No puedes quitarte el rol siendo el único administrador'
                    : 'Cambiar rol'
                "
                @change="onRoleChange(u, $event)"
              >
                <option value="admin">Admin</option>
                <option value="chief">Jefe de obra</option>
                <option value="technician">Técnico</option>
              </select>
            </div>

            <button
              type="button"
              class="icon-button icon-button-delete"
              :disabled="isSoleAdminSelf(u) || deletingId === u.id"
              :aria-label="
                isSoleAdminSelf(u)
                  ? 'No puedes eliminarte siendo el único administrador'
                  : `Eliminar usuario ${u.email || u.displayName || ''}`
              "
              :title="
                isSoleAdminSelf(u)
                  ? 'No puedes eliminarte siendo el único administrador'
                  : 'Eliminar usuario'
              "
              @click="onDelete(u)"
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

    <AppModal
      v-model="showInviteModal"
      title="Invitar usuario"
      :close-on-backdrop="!savingInvite"
    >
      <form class="invite-form" @submit.prevent="saveInvite">
        <label class="form-field">
          <span class="form-label">Email</span>
          <input
            v-model="inviteForm.email"
            type="email"
            required
            autocomplete="off"
          />
        </label>
        <label class="form-field">
          <span class="form-label">Contraseña</span>
          <input
            v-model="inviteForm.password"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </label>
        <label class="form-field">
          <span class="form-label">Nombre</span>
          <input
            v-model="inviteForm.displayName"
            type="text"
            autocomplete="off"
          />
        </label>
        <label class="form-field">
          <span class="form-label">Rol</span>
          <select v-model="inviteForm.role">
            <option value="technician">Técnico</option>
            <option value="chief">Jefe de obra</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </form>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="savingInvite"
          @click="showInviteModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="savingInvite || !canSaveInvite"
          @click="saveInvite"
        >
          {{ savingInvite ? "Creando…" : "Crear usuario" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showDeleteConfirm"
      title="¿Eliminar usuario?"
      variant="danger"
      :close-on-backdrop="!deletingId"
      :show-close-button="!deletingId"
    >
      <p v-if="userToDelete">
        ¿Eliminar a
        <strong>{{ displayName(userToDelete) }}</strong
        >? Esta acción no se puede deshacer y perderá acceso inmediatamente.
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="!!deletingId"
          @click="showDeleteConfirm = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="!!deletingId"
          @click="confirmDelete"
        >
          {{ deletingId ? "Eliminando…" : "Eliminar" }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import AppModal from "../components/AppModal.vue";
import {
  useUsers,
  type AppUser,
  type UserRole,
} from "../composables/useUsers";
import { useUserStore } from "../stores/index";
import { useToastStore } from "../stores/toast";

const { list, create, updateRole, remove } = useUsers();
const userStore = useUserStore();
const toastStore = useToastStore();

const users = ref<AppUser[]>([]);
const loading = ref(true);
const error = ref("");
const avatarErrors = reactive<Record<string, boolean>>({});
const roleUpdatingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const userToDelete = ref<AppUser | null>(null);

const showInviteModal = ref(false);
const savingInvite = ref(false);
const inviteForm = reactive({
  email: "",
  password: "",
  displayName: "",
  role: "technician" as UserRole,
});

const currentUserId = computed(() => userStore.user?.uid ?? null);

const adminCount = computed(
  () => users.value.filter((u) => u.role === "admin").length,
);

const canSaveInvite = computed(
  () =>
    Boolean(inviteForm.email.trim() && inviteForm.password.length >= 6),
);

function isSoleAdminSelf(u: AppUser): boolean {
  return (
    u.id === currentUserId.value &&
    u.role === "admin" &&
    adminCount.value <= 1
  );
}

function displayName(u: AppUser): string {
  if (u.displayName?.trim()) return u.displayName.trim();
  return u.email || "Usuario";
}

function initials(u: AppUser): string {
  const name = displayName(u);
  return name.charAt(0).toUpperCase() || "?";
}

function roleLabel(role: UserRole | undefined): string {
  if (role === "admin") return "Admin";
  if (role === "chief") return "Jefe de obra";
  return "Técnico";
}

function onAvatarError(id: string) {
  avatarErrors[id] = true;
}

async function fetchUsers() {
  loading.value = true;
  error.value = "";
  try {
    users.value = await list();
  } catch (e: unknown) {
    error.value =
      e instanceof Error ? e.message : "No se pudieron cargar los usuarios.";
  } finally {
    loading.value = false;
  }
}

async function onRoleChange(u: AppUser, event: Event) {
  const select = event.target as HTMLSelectElement;
  const newRole = select.value as UserRole;
  const previousRole = u.role;

  if (newRole === previousRole) return;

  roleUpdatingId.value = u.id;
  try {
    const updated = await updateRole(u.id, newRole);
    const idx = users.value.findIndex((x) => x.id === u.id);
    if (idx >= 0) {
      users.value[idx] = { ...users.value[idx], ...updated, role: newRole };
    }
    if (u.id === currentUserId.value) {
      await userStore.fetchProfile();
    }
    toastStore.show("Rol actualizado.", "success");
  } catch (e: unknown) {
    select.value = previousRole || "technician";
    const message =
      e instanceof Error ? e.message : "No se pudo actualizar el rol.";
    toastStore.show(message, "error");
  } finally {
    roleUpdatingId.value = null;
  }
}

function openInviteModal() {
  inviteForm.email = "";
  inviteForm.password = "";
  inviteForm.displayName = "";
  inviteForm.role = "technician";
  showInviteModal.value = true;
}

async function saveInvite() {
  if (!canSaveInvite.value) return;
  savingInvite.value = true;
  try {
    await create({
      email: inviteForm.email.trim(),
      password: inviteForm.password,
      displayName: inviteForm.displayName.trim() || undefined,
      role: inviteForm.role,
    });
    toastStore.show("Usuario creado correctamente.", "success");
    showInviteModal.value = false;
    await fetchUsers();
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "No se pudo crear el usuario.";
    toastStore.show(message, "error");
  } finally {
    savingInvite.value = false;
  }
}

function onDelete(u: AppUser) {
  if (isSoleAdminSelf(u)) return;
  userToDelete.value = u;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  const target = userToDelete.value;
  if (!target) return;
  deletingId.value = target.id;
  try {
    await remove(target.id);
    users.value = users.value.filter((u) => u.id !== target.id);
    showDeleteConfirm.value = false;
    userToDelete.value = null;
    toastStore.show("Usuario eliminado.", "success");
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "No se pudo eliminar el usuario.";
    toastStore.show(message, "error");
  } finally {
    deletingId.value = null;
  }
}

onMounted(fetchUsers);
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
  align-items: center;
  justify-content: space-between;
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
  gap: 0.75rem;
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

.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.user-main {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
  flex: 1;
}

.user-avatar,
.user-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.user-avatar {
  object-fit: cover;
}

.user-avatar-placeholder {
  background: #0f9f70;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
}

.user-text {
  min-width: 0;
}

.user-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.you-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
}

.user-email {
  margin: 0.2rem 0 0 0;
  font-size: 0.85rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-side {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.role-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.status-badge--admin {
  background: rgba(5, 63, 81, 0.1);
  color: #053f51;
  border-color: rgba(5, 63, 81, 0.25);
}

.status-badge--admin .status-badge-dot {
  background: #053f51;
}

.status-badge--chief {
  background: rgba(234, 179, 8, 0.15);
  color: #b45309;
  border-color: rgba(234, 179, 8, 0.35);
}

.status-badge--chief .status-badge-dot {
  background: #b45309;
}

.status-badge--technician {
  background: rgba(15, 159, 112, 0.12);
  color: #0c7a57;
  border-color: rgba(15, 159, 112, 0.3);
}

.status-badge--technician .status-badge-dot {
  background: #0f9f70;
}

.role-select {
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.8rem;
  color: #0f172a;
  background: #fff;
  cursor: pointer;
}

.role-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: #f8fafc;
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

.icon-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.icon-button:disabled:hover,
.icon-button:disabled:focus-visible {
  color: #64748b;
  background: transparent;
}

.invite-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.invite-form .form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.invite-form .form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.invite-form input,
.invite-form select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
}

.invite-form input:focus,
.invite-form select:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px #0f9f70;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .user-item {
    flex-direction: column;
    align-items: stretch;
  }

  .user-side {
    justify-content: space-between;
    flex-wrap: wrap;
  }
}
</style>
