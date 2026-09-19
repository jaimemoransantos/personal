<template>
  <Teleport to="body">
    <div
      class="viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de fotos"
      @click.self="emit('close')"
    >
      <div class="viewer-chrome">
        <p class="viewer-counter">{{ currentIndex + 1 }} / {{ photos.length }}</p>
        <button
          type="button"
          class="viewer-close"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        class="viewer-nav viewer-nav--prev"
        aria-label="Foto anterior"
        @click.stop="goPrev"
      >
        ‹
      </button>

      <div
        class="viewer-stage"
        @click.stop
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <p v-if="imageLoading" class="viewer-status">Cargando…</p>
        <p v-else-if="imageError" class="viewer-status">
          No se pudo cargar la imagen
        </p>
        <img
          v-else-if="currentBlobUrl"
          :src="currentBlobUrl"
          :alt="`Foto ${currentIndex + 1}`"
          class="viewer-image"
          draggable="false"
        />
      </div>

      <button
        type="button"
        class="viewer-nav viewer-nav--next"
        aria-label="Foto siguiente"
        @click.stop="goNext"
      >
        ›
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  useProjectPhotos,
  type ProjectPhoto,
} from "../composables/useProjectPhotos";

const props = defineProps<{
  photos: ProjectPhoto[];
  initialIndex: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { getImageBlobUrl } = useProjectPhotos();

const currentIndex = ref(0);
const touchStartX = ref<number | null>(null);
const blobById = ref<Record<string, string>>({});
const imageLoading = ref(false);
const imageError = ref(false);
let loadSeq = 0;

const currentPhoto = computed(
  () => props.photos[currentIndex.value] ?? null,
);

const currentBlobUrl = computed(() => {
  const id = currentPhoto.value?.id;
  return id ? blobById.value[id] ?? null : null;
});

function clampIndex(index: number): number {
  const len = props.photos.length;
  if (len <= 0) return 0;
  return ((index % len) + len) % len;
}

function revokeBlob(id: string) {
  const url = blobById.value[id];
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
  const next = { ...blobById.value };
  delete next[id];
  blobById.value = next;
}

function revokeAllBlobs() {
  for (const url of Object.values(blobById.value)) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
  blobById.value = {};
}

async function ensureBlob(photoId: string): Promise<string | null> {
  if (blobById.value[photoId]) return blobById.value[photoId];
  try {
    const url = await getImageBlobUrl(photoId);
    blobById.value = { ...blobById.value, [photoId]: url };
    return url;
  } catch {
    return null;
  }
}

async function loadCurrentAndNeighbors() {
  const photo = currentPhoto.value;
  if (!photo) {
    imageLoading.value = false;
    imageError.value = false;
    return;
  }

  const seq = ++loadSeq;
  imageError.value = false;
  if (!blobById.value[photo.id]) {
    imageLoading.value = true;
  }

  const url = await ensureBlob(photo.id);
  if (seq !== loadSeq) return;

  imageLoading.value = false;
  imageError.value = !url;

  const prev = props.photos[clampIndex(currentIndex.value - 1)];
  const next = props.photos[clampIndex(currentIndex.value + 1)];
  if (prev && prev.id !== photo.id) void ensureBlob(prev.id);
  if (next && next.id !== photo.id) void ensureBlob(next.id);
}

function goPrev() {
  if (props.photos.length <= 1) return;
  currentIndex.value = clampIndex(currentIndex.value - 1);
}

function goNext() {
  if (props.photos.length <= 1) return;
  currentIndex.value = clampIndex(currentIndex.value + 1);
}

function onTouchStart(event: TouchEvent) {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null;
}

function onTouchEnd(event: TouchEvent) {
  const startX = touchStartX.value;
  const endX = event.changedTouches[0]?.clientX;
  touchStartX.value = null;
  if (startX == null || endX == null) return;
  const delta = endX - startX;
  if (Math.abs(delta) < 50) return;
  if (delta > 0) goPrev();
  else goNext();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goPrev();
    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goNext();
  }
}

watch(
  () => [props.initialIndex, props.photos.length] as const,
  ([index]) => {
    currentIndex.value = clampIndex(index);
  },
  { immediate: true },
);

watch(
  () => props.photos.map((p) => p.id).join(","),
  () => {
    const ids = new Set(props.photos.map((p) => p.id));
    for (const id of Object.keys(blobById.value)) {
      if (!ids.has(id)) revokeBlob(id);
    }
  },
);

watch(
  [currentIndex, () => currentPhoto.value?.id],
  () => {
    void loadCurrentAndNeighbors();
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
  revokeAllBlobs();
});
</script>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr;
  align-items: center;
  justify-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  padding-top: calc(0.75rem + env(safe-area-inset-top, 0px));
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  background: rgba(0, 0, 0, 0.9);
  box-sizing: border-box;
}

.viewer-chrome {
  grid-column: 1 / -1;
  grid-row: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0.25rem;
}

.viewer-counter {
  margin: 0;
  color: #f8fafc;
  font-size: 0.95rem;
  font-weight: 600;
}

.viewer-close {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1.25rem;
  cursor: pointer;
}

.viewer-close:hover,
.viewer-close:focus-visible {
  background: rgba(255, 255, 255, 0.22);
  outline: none;
}

.viewer-stage {
  grid-column: 2;
  grid-row: 2;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-status {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.95rem;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 6px;
  user-select: none;
  -webkit-user-drag: none;
}

.viewer-nav {
  grid-row: 2;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.55rem;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  z-index: 1;
}

.viewer-nav--prev {
  grid-column: 1;
}

.viewer-nav--next {
  grid-column: 3;
}

.viewer-nav:hover,
.viewer-nav:focus-visible {
  background: rgba(255, 255, 255, 0.22);
  outline: none;
}

@media (max-width: 860px) {
  .viewer {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    padding: 0.5rem;
  }

  .viewer-chrome {
    grid-column: 1;
  }

  .viewer-stage {
    grid-column: 1;
    grid-row: 2;
  }

  .viewer-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.45);
  }

  .viewer-nav--prev {
    left: 0.35rem;
    grid-column: auto;
    grid-row: auto;
  }

  .viewer-nav--next {
    right: 0.35rem;
    grid-column: auto;
    grid-row: auto;
  }
}
</style>
