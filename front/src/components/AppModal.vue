<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="bodyId"
        @click.self="closeOnBackdrop && close()"
      >
        <div class="modal-box" :class="modalBoxClass">
          <div class="modal-header">
            <h2 :id="titleId" class="modal-title">{{ title }}</h2>
            <button
              v-if="showCloseButton"
              type="button"
              class="modal-close"
              aria-label="Cerrar"
              @click="close()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div v-if="$slots.default" :id="bodyId" class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    /** Cerrar al hacer clic en el fondo */
    closeOnBackdrop?: boolean;
    /** Mostrar botón X en la cabecera */
    showCloseButton?: boolean;
    /** Variante visual: default, danger (para confirmaciones destructivas) */
    variant?: "default" | "danger";
  }>(),
  {
    closeOnBackdrop: true,
    showCloseButton: true,
    variant: "default",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const uniqueId = `modal-${Math.random().toString(36).slice(2, 9)}`;
const titleId = `${uniqueId}-title`;
const bodyId = `${uniqueId}-body`;

const modalBoxClass = computed(() => ({
  "modal-box--danger": props.variant === "danger",
}));

function close() {
  emit("update:modelValue", false);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-box {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
  max-width: 440px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-box--danger .modal-footer :deep(.modal-btn-primary) {
  background: #b91c1c;
  color: #fff;
}

.modal-box--danger .modal-footer :deep(.modal-btn-primary:hover),
.modal-box--danger .modal-footer :deep(.modal-btn-primary:focus-visible) {
  background: #991b1b;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem 0 1.5rem;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
}

.modal-close {
  flex-shrink: 0;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.modal-close:hover,
.modal-close:focus-visible {
  color: #0f172a;
  background: #f1f5f9;
  outline: none;
}

.modal-body {
  padding: 1rem 1.5rem 1.25rem;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
  overflow-y: auto;
}

.modal-body :deep(strong) {
  color: #0f172a;
}

.modal-footer {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}

/* Clases de utilidad para botones del slot footer (usar con :deep o en el padre) */
.modal-footer :deep(.modal-btn) {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s, color 0.15s;
}

.modal-footer :deep(.modal-btn-cancel) {
  background: #f1f5f9;
  color: #475569;
}

.modal-footer :deep(.modal-btn-cancel:hover),
.modal-footer :deep(.modal-btn-cancel:focus-visible) {
  background: #e2e8f0;
  outline: none;
}

.modal-footer :deep(.modal-btn-primary) {
  background: #053f51;
  color: #fff;
}

.modal-footer :deep(.modal-btn-primary:hover),
.modal-footer :deep(.modal-btn-primary:focus-visible) {
  background: #06475b;
  outline: none;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-box,
.modal-fade-leave-active .modal-box {
  transition: transform 0.2s ease;
}

.modal-fade-enter-from .modal-box,
.modal-fade-leave-to .modal-box {
  transform: scale(0.96);
}
</style>
