<template>
  <AppModal
    :model-value="modelValue"
    :title="title"
    :variant="variant"
    :close-on-backdrop="!confirming"
    :show-close-button="!confirming"
    @update:model-value="onModelUpdate"
  >
    <p class="confirm-message">{{ message }}</p>
    <template #footer>
      <button
        type="button"
        class="modal-btn modal-btn-cancel"
        :disabled="confirming"
        @click="onCancel"
      >
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="modal-btn modal-btn-primary"
        :disabled="confirming"
        @click="onConfirm"
      >
        {{ confirming && confirmingLabel ? confirmingLabel : confirmLabel }}
      </button>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import AppModal from "./AppModal.vue";

withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Optional label while confirm is in progress (e.g. "Eliminando…") */
    confirmingLabel?: string;
    /** Disable buttons / prevent close while the confirm action runs */
    confirming?: boolean;
    variant?: "default" | "danger";
  }>(),
  {
    confirmLabel: "Eliminar",
    cancelLabel: "Cancelar",
    confirmingLabel: undefined,
    confirming: false,
    variant: "default",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  confirm: [];
  cancel: [];
}>();

function onModelUpdate(value: boolean) {
  emit("update:modelValue", value);
  if (!value) emit("cancel");
}

function onCancel() {
  emit("update:modelValue", false);
  emit("cancel");
}

function onConfirm() {
  emit("confirm");
}
</script>

<style scoped>
.confirm-message {
  margin: 0;
}
</style>
