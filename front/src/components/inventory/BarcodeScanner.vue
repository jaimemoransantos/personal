<template>
  <div class="scanner" :class="{ 'scanner--flash': flash }">
    <div v-if="!cameraError" class="scanner-viewport">
      <div :id="elementId" class="scanner-camera" />
      <div class="scanner-overlay" aria-hidden="true">
        <div class="scanner-guide" />
      </div>
      <p v-if="starting" class="scanner-status">Iniciando cámara…</p>
    </div>

    <div v-else class="scanner-fallback">
      <p class="scanner-fallback-msg">{{ cameraError }}</p>
      <form class="manual-form" @submit.prevent="submitManual">
        <label class="manual-label">
          Ingresa el código manualmente
          <input
            v-model="manualCode"
            type="text"
            class="manual-input"
            placeholder="Código de barras"
            autocomplete="off"
            enterkeyhint="done"
          />
        </label>
        <button
          type="submit"
          class="manual-btn"
          :disabled="!manualCode.trim()"
        >
          Usar código
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

const emit = defineEmits<{
  scan: [value: string];
}>();

/**
 * Solo formatos 1D: los rollos de Sotrafa usan código de barras clásico
 * (líneas verticales), no QR. Restringir formatos acelera el escaneo y
 * reduce falsos positivos.
 *
 * Si un proveedor futuro usa QR u otro formato 2D/1D distinto, ampliar
 * este arreglo (p. ej. Html5QrcodeSupportedFormats.QR_CODE).
 */
const ONE_D_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
];

const elementId = `barcode-scanner-${Math.random().toString(36).slice(2, 9)}`;
const cameraError = ref<string | null>(null);
const starting = ref(true);
const flash = ref(false);
const manualCode = ref("");

let scanner: Html5Qrcode | null = null;
let handled = false;
let flashTimer: ReturnType<typeof setTimeout> | undefined;

function triggerFeedback() {
  flash.value = true;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flash.value = false;
  }, 350);
  try {
    navigator.vibrate?.(40);
  } catch {
    // ignore
  }
}

async function handleDecoded(raw: string) {
  if (handled) return;
  const value = raw.trim();
  if (!value) return;
  handled = true;
  triggerFeedback();

  try {
    if (scanner?.isScanning) {
      scanner.pause(true);
    }
  } catch {
    // ignore pause errors
  }

  emit("scan", value);
}

function submitManual() {
  const value = manualCode.value.trim();
  if (!value) return;
  triggerFeedback();
  emit("scan", value);
  manualCode.value = "";
}

async function startCamera() {
  starting.value = true;
  cameraError.value = null;
  handled = false;

  try {
    scanner = new Html5Qrcode(elementId, {
      formatsToSupport: ONE_D_BARCODE_FORMATS,
      verbose: false,
    });
    await scanner.start(
      { facingMode: "environment" },
      {
        // Un poco más de fps ayuda a 1D en movimiento / enfoque variable
        fps: 12,
        // Recuadro horizontal: los códigos de barras 1D se leen de lado a lado
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = Math.min(280, Math.floor(viewfinderWidth * 0.9));
          const height = Math.min(120, Math.floor(viewfinderHeight * 0.28));
          return { width, height };
        },
        aspectRatio: 1.777,
      },
      (decodedText) => {
        void handleDecoded(decodedText);
      },
      () => {
        // ignore frame-level scan noise
      },
    );
  } catch {
    cameraError.value =
      "No se pudo acceder a la cámara. Revisa los permisos o escribe el código a mano.";
    scanner = null;
  } finally {
    starting.value = false;
  }
}

async function stopCamera() {
  if (!scanner) return;
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    // ignore
  }
  try {
    scanner.clear();
  } catch {
    // ignore
  }
  scanner = null;
}

onMounted(() => {
  void startCamera();
});

onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer);
  void stopCamera();
});
</script>

<style scoped>
.scanner {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #0f172a;
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.scanner--flash {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.35);
}

.scanner-viewport {
  position: relative;
  min-height: 280px;
}

.scanner-camera {
  width: 100%;
  min-height: 280px;
}

.scanner-camera :deep(video) {
  width: 100% !important;
  border-radius: 14px;
  object-fit: cover;
}

.scanner-overlay {
  pointer-events: none;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(15, 23, 42, 0.45) 100%
  );
}

.scanner-guide {
  width: min(280px, 90%);
  height: 120px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.25);
}

.scanner-status {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.75rem;
  margin: 0;
  text-align: center;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.scanner-fallback {
  padding: 1.25rem;
  background: #fff;
}

.scanner-fallback-msg {
  margin: 0 0 1rem 0;
  color: #b45309;
  font-size: 0.95rem;
  line-height: 1.4;
}

.manual-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.manual-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
}

.manual-input {
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 1rem;
}

.manual-input:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px #0f9f70;
}

.manual-btn {
  padding: 0.85rem 1rem;
  border: none;
  border-radius: 10px;
  background: #053f51;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.manual-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
