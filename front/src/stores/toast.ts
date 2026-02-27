import { ref } from "vue";
import { defineStore } from "pinia";

type ToastType = "success" | "error" | "info";

export const useToastStore = defineStore("toast", () => {
  const message = ref<string | null>(null);
  const type = ref<ToastType>("info");
  const visible = ref(false);

  let hideTimeout: number | undefined;

  const show = (
    msg: string,
    toastType: ToastType = "info",
    duration = 4000
  ) => {
    message.value = msg;
    type.value = toastType;
    visible.value = true;

    if (hideTimeout) {
      window.clearTimeout(hideTimeout);
    }

    hideTimeout = window.setTimeout(() => {
      visible.value = false;
    }, duration);
  };

  const hide = () => {
    visible.value = false;
    if (hideTimeout) {
      window.clearTimeout(hideTimeout);
      hideTimeout = undefined;
    }
  };

  return {
    message,
    type,
    visible,
    show,
    hide,
  };
});

