<template>
  <div class="pool-designer">
    <div class="pool-designer__scroll-col">
        <label class="text-field">
          <span class="field-label">Nombre</span>
          <input
            type="text"
            required
            placeholder="Ej: Piscina residencial Norte"
            :value="name"
            @input="emit('update:name', ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="text-field">
          <span class="field-label">Cliente / referencia (opcional)</span>
          <input
            type="text"
            placeholder="Ej: Constructora ABC — Proyecto 12"
            :value="clientRef"
            @input="emit('update:clientRef', ($event.target as HTMLInputElement).value)"
          />
        </label>

        <div class="pool-designer__controls">
          <label class="number-field">
            <span class="dim-label">Radio superior (rTop)</span>
            <div class="number-input-wrap">
              <input
                v-model="dimText.rTop"
                type="text"
                inputmode="decimal"
                @input="onDimInput('rTop', $event)"
                @blur="onDimBlur('rTop')"
              />
              <span class="field-unit">m</span>
            </div>
          </label>

          <label class="number-field">
            <span class="dim-label">Radio inferior (rBottom)</span>
            <div class="number-input-wrap">
              <input
                v-model="dimText.rBottom"
                type="text"
                inputmode="decimal"
                @input="onDimInput('rBottom', $event)"
                @blur="onDimBlur('rBottom')"
              />
              <span class="field-unit">m</span>
            </div>
          </label>

          <label class="number-field">
            <span class="dim-label">Profundidad</span>
            <div class="number-input-wrap">
              <input
                v-model="dimText.depth"
                type="text"
                inputmode="decimal"
                @input="onDimInput('depth', $event)"
                @blur="onDimBlur('depth')"
              />
              <span class="field-unit">m</span>
            </div>
          </label>

          <label class="select-field">
            <span class="dim-label">Fondo plano</span>
            <select
              :value="dims.hasFlatBottom ? 'yes' : 'no'"
              @change="onFlatBottomChange"
            >
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </label>

          <label class="number-field">
            <span class="dim-label">Ancho de anclaje</span>
            <div class="number-input-wrap">
              <input
                v-model="dimText.anchorWidth"
                type="text"
                inputmode="decimal"
                @input="onDimInput('anchorWidth', $event)"
                @blur="onDimBlur('anchorWidth')"
              />
              <span class="field-unit">m</span>
            </div>
          </label>

          <label class="number-field">
            <span class="dim-label">Merma</span>
            <div class="number-input-wrap">
              <input
                v-model="wasteText"
                type="text"
                inputmode="decimal"
                @input="onWasteInput"
                @blur="onWasteBlur"
              />
              <span class="field-unit">%</span>
            </div>
          </label>
        </div>

        <div class="pool-designer__preview" role="status">
          <p class="preview-title">Previsualización de área</p>
          <p class="preview-note">
            Valores estimados en vivo. El metraje definitivo se recalcula al guardar en el servidor.
          </p>
          <dl class="preview-grid">
            <div><dt>Lateral</dt><dd>{{ preview.lateral.toFixed(2) }} m²</dd></div>
            <div><dt>Fondo</dt><dd>{{ preview.bottomArea.toFixed(2) }} m²</dd></div>
            <div><dt>Anclaje</dt><dd>{{ preview.anchorArea.toFixed(2) }} m²</dd></div>
            <div><dt>Subtotal</dt><dd>{{ preview.subtotal.toFixed(2) }} m²</dd></div>
            <div><dt>Merma ({{ preview.wastePercent }}%)</dt><dd>{{ preview.wasteAmount.toFixed(2) }} m²</dd></div>
            <div class="preview-total"><dt>Total estimado</dt><dd>{{ preview.total.toFixed(2) }} m²</dd></div>
          </dl>
        </div>

        <label class="text-field notes-field">
          <span class="field-label">Notas (opcional)</span>
          <textarea
            rows="3"
            placeholder="Observaciones del diseño…"
            :value="notes"
            @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
          />
        </label>
    </div>

    <div class="pool-designer__viewport-col">
      <div class="canvas-wrap pool-designer__canvas-wrap">
        <div
          ref="canvasWrap"
          class="pool-designer__canvas-host"
          aria-label="Vista 3D de la piscina"
        />
        <button
          type="button"
          class="canvas-reset-btn"
          title="Centrar vista"
          @click.stop="resetCamera"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 10v10h14V10" />
          </svg>
          Centrar vista
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import * as THREE from "three";
import type { DesignAreaBreakdown, RoundPoolDimensions } from "../../composables/useDesigns";
import { useThreeScene, SCENE_GROUND_Y } from "../../composables/useThreeScene";

const props = defineProps<{
  modelValue: RoundPoolDimensions;
  wastePercent: number;
  name: string;
  clientRef: string;
  notes: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: RoundPoolDimensions];
  "update:wastePercent": [value: number];
  "update:name": [value: string];
  "update:clientRef": [value: string];
  "update:notes": [value: string];
}>();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calcRoundPoolArea(
  dims: RoundPoolDimensions,
  wastePercent: number,
): DesignAreaBreakdown {
  const { rTop, rBottom, depth, anchorWidth, hasFlatBottom } = dims;
  const slant = Math.sqrt(depth ** 2 + (rTop - rBottom) ** 2);
  const lateral = Math.PI * (rTop + rBottom) * slant;
  const bottomArea = hasFlatBottom ? Math.PI * rBottom ** 2 : 0;
  const anchorArea = Math.PI * ((rTop + anchorWidth) ** 2 - rTop ** 2);
  const subtotal = lateral + bottomArea + anchorArea;
  const wasteAmount = subtotal * (wastePercent / 100);
  const total = subtotal + wasteAmount;

  return {
    lateral: round2(lateral),
    bottomArea: round2(bottomArea),
    anchorArea: round2(anchorArea),
    subtotal: round2(subtotal),
    wastePercent,
    wasteAmount: round2(wasteAmount),
    total: round2(total),
  };
}

const dims = computed(() => props.modelValue);
const preview = computed(() =>
  calcRoundPoolArea(dims.value, props.wastePercent),
);

type DimNumericKey = "rTop" | "rBottom" | "depth" | "anchorWidth";
const DIM_KEYS: DimNumericKey[] = ["rTop", "rBottom", "depth", "anchorWidth"];

const DIM_MIN: Record<DimNumericKey, number> = {
  rTop: 1,
  rBottom: 0.5,
  depth: 0.5,
  anchorWidth: 0,
};

const dimText = reactive({
  rTop: String(props.modelValue.rTop),
  rBottom: String(props.modelValue.rBottom),
  depth: String(props.modelValue.depth),
  anchorWidth: String(props.modelValue.anchorWidth),
});

const wasteText = ref(String(props.wastePercent));

function clampWastePercent(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Coma → punto; rechaza strings con más de un separador decimal. */
function parseDecimalInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const normalized = trimmed.replace(/,/g, ".");
  if ((normalized.match(/\./g) ?? []).length > 1) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Permite "3," o "3." como paso intermedio sin emitir todavía. */
function isIncompleteDecimal(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return true;
  return /[.,]$/.test(trimmed);
}

function emitDimension(key: DimNumericKey, value: number) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

function onDimInput(key: DimNumericKey, e: Event) {
  const text = (e.target as HTMLInputElement).value;
  dimText[key] = text;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n < 0) return;
  emitDimension(key, n);
}

function onDimBlur(key: DimNumericKey) {
  const n = parseDecimalInput(dimText[key]);
  const min = DIM_MIN[key];
  let final: number;
  if (n === null || n < 0) {
    final = min;
  } else if (key === "anchorWidth") {
    final = Math.max(0, n);
  } else {
    final = Math.max(min, n);
  }
  dimText[key] = String(final);
  emitDimension(key, final);
}

function onWasteInput(e: Event) {
  const text = (e.target as HTMLInputElement).value;
  wasteText.value = text;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n < 0) return;
  emit("update:wastePercent", clampWastePercent(n));
}

function onWasteBlur() {
  const n = parseDecimalInput(wasteText.value);
  let final: number;
  if (n === null || n < 0) {
    final = 0;
  } else {
    final = clampWastePercent(n);
  }
  wasteText.value = String(final);
  emit("update:wastePercent", final);
}

watch(
  () => props.modelValue,
  (v) => {
    for (const key of DIM_KEYS) {
      if (Number.isFinite(v[key])) {
        dimText[key] = String(v[key]);
      }
    }
  },
  { deep: true },
);

watch(
  () => props.wastePercent,
  (v) => {
    if (Number.isFinite(v)) {
      wasteText.value = String(v);
    }
  },
);

const canvasWrap = ref<HTMLDivElement | null>(null);
const {
  scene,
  initialize: initializeScene,
  setCameraDistance,
  frameCamera,
  resetCamera,
  setSceneScale,
  setGroundTransform,
} = useThreeScene({
  initialDistance: 14,
  minDistanceFactor: 0.45,
  maxDistanceFloor: 40,
  cameraFar: 500,
});
let poolGroup: THREE.Group | null = null;

function onFlatBottomChange(e: Event) {
  const yes = (e.target as HTMLSelectElement).value === "yes";
  emit("update:modelValue", { ...props.modelValue, hasFlatBottom: yes });
}

function computeSceneRadius(d: RoundPoolDimensions): number {
  return d.rTop + d.anchorWidth;
}

function computeCameraDistance(d: RoundPoolDimensions): number {
  const maxR = Math.max(d.rTop, d.rBottom) + d.anchorWidth;
  return Math.max(8, d.rTop * 3, maxR * 2.2);
}

function clearPoolMeshes() {
  if (!poolGroup) return;
  const toRemove = [...poolGroup.children];
  for (const child of toRemove) {
    poolGroup.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  }
}

function buildPoolMeshes(d: RoundPoolDimensions) {
  if (!poolGroup) return;
  clearPoolMeshes();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x2b2b2e,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const bottomMat = new THREE.MeshStandardMaterial({
    color: 0x232326,
    roughness: 0.8,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const anchorMat = new THREE.MeshStandardMaterial({
    color: 0xb5651d,
    roughness: 0.75,
    side: THREE.DoubleSide,
  });

  const wallGeo = new THREE.CylinderGeometry(
    d.rTop,
    d.rBottom,
    d.depth,
    64,
    1,
    true,
  );
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.castShadow = true;
  wall.receiveShadow = true;
  poolGroup.add(wall);

  if (d.hasFlatBottom) {
    const bottomGeo = new THREE.CircleGeometry(d.rBottom, 64);
    const bottom = new THREE.Mesh(bottomGeo, bottomMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -d.depth / 2;
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    poolGroup.add(bottom);
  }

  if (d.anchorWidth > 0) {
    const anchorGeo = new THREE.RingGeometry(d.rTop, d.rTop + d.anchorWidth, 64);
    const anchor = new THREE.Mesh(anchorGeo, anchorMat);
    anchor.rotation.x = -Math.PI / 2;
    anchor.position.y = d.depth / 2 + 0.01;
    anchor.receiveShadow = true;
    poolGroup.add(anchor);
  }

  const sceneRadius = computeSceneRadius(d);
  setSceneScale(sceneRadius);
  setCameraDistance(computeCameraDistance(d));
  frameCamera(0);
  setGroundTransform(-d.depth / 2 - Math.abs(SCENE_GROUND_Y));
}

async function mountThree() {
  const host = canvasWrap.value;
  if (!host) return;
  if (!(await initializeScene(host)) || !scene.value) return;
  poolGroup = new THREE.Group();
  scene.value.add(poolGroup);
  buildPoolMeshes(props.modelValue);
}

watch(
  () => props.modelValue,
  (d) => buildPoolMeshes(d),
  { deep: true },
);

onMounted(() => {
  void mountThree();
});
</script>

<style scoped>
.pool-designer {
  --design-clay: #c4a574;
  --design-earth: #4a3f35;
  --design-membrane: #1e5c4a;
  --design-sand: #f5e6d3;
  --design-border: #d4c4a8;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
  height: 70vh;
}

.pool-designer__scroll-col {
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pool-designer__scroll-col::-webkit-scrollbar {
  display: none;
}

.pool-designer__viewport-col {
  height: 100%;
  position: sticky;
  top: 0;
  align-self: start;
}

.canvas-wrap {
  height: 100%;
  width: 100%;
}

.pool-designer__canvas-wrap {
  position: relative;
  border-radius: 10px;
  border: 1px solid var(--design-border);
  background: var(--design-earth);
  overflow: hidden;
}

.pool-designer__canvas-host {
  position: absolute;
  inset: 0;
  cursor: grab;
  touch-action: none;
}

.pool-designer__canvas-host:active {
  cursor: grabbing;
}

.pool-designer__canvas-host :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.canvas-reset-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.15s ease;
}

.canvas-reset-btn:hover {
  background: rgba(0, 0, 0, 0.5);
}

.canvas-reset-btn svg {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

.pool-designer__controls {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

@media (max-width: 860px) {
  .pool-designer {
    grid-template-columns: 1fr;
    height: auto;
  }

  .pool-designer__viewport-col {
    position: static;
    height: 320px;
  }

  .pool-designer__scroll-col {
    height: auto;
    overflow-y: visible;
  }
}

.text-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.text-field input,
.text-field textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  background: var(--design-sand);
  color: #2a2520;
}

.text-field input:focus,
.text-field textarea:focus {
  outline: none;
  border-color: var(--design-membrane);
  box-shadow: 0 0 0 1px rgba(30, 92, 74, 0.25);
}

.number-field,
.select-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.dim-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #4a3f35;
}

.number-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.number-input-wrap input {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--design-border);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--design-sand);
  color: #2a2520;
  font-family: inherit;
}

.number-input-wrap input:focus {
  outline: none;
  border-color: var(--design-membrane);
  box-shadow: 0 0 0 1px rgba(30, 92, 74, 0.25);
}

.field-unit {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b5d4f;
  flex-shrink: 0;
}

.select-field select {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--design-border);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--design-sand);
  color: #2a2520;
}

.pool-designer__preview {
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  background: #faf6f0;
  border: 1px dashed var(--design-clay);
}

.preview-title {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--design-membrane);
}

.preview-note {
  margin: 0 0 0.65rem;
  font-size: 0.75rem;
  color: #6b5d4f;
  line-height: 1.4;
}

.preview-grid {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.preview-grid div {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.preview-grid dt {
  margin: 0;
  color: #6b5d4f;
  font-weight: 500;
}

.preview-grid dd {
  margin: 0;
  font-weight: 600;
  color: #2a2520;
}

.preview-total {
  grid-column: 1 / -1;
  padding-top: 0.35rem;
  border-top: 1px solid var(--design-border);
}

.preview-total dd {
  color: var(--design-membrane);
  font-size: 0.95rem;
}
</style>
