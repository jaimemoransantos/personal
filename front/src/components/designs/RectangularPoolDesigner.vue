<template>
  <div class="pool-designer rect-pool-designer">
    <div class="pool-designer__scroll-col">
        <label class="text-field">
          <span class="field-label">Nombre</span>
          <input
            type="text"
            required
            placeholder="Ej: Piscina residencial 8×4"
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

        <div class="rect-pool-designer__controls">
          <label class="number-field">
            <span class="dim-label">Largo</span>
            <div class="number-input-wrap">
              <input
                v-model="dimText.length"
                type="text"
                inputmode="decimal"
                @input="onDimInput('length', $event)"
                @blur="onDimBlur('length')"
              />
              <span class="field-unit">m</span>
            </div>
          </label>

          <label class="number-field">
            <span class="dim-label">Ancho</span>
            <div class="number-input-wrap">
              <input
                v-model="dimText.width"
                type="text"
                inputmode="decimal"
                @input="onDimInput('width', $event)"
                @blur="onDimBlur('width')"
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

          <label class="checkbox-field">
            <input
              type="checkbox"
              :checked="sameSlope"
              @change="onSameSlopeChange"
            />
            <span class="dim-label">Mismo talud en los 4 lados</span>
          </label>

          <template v-if="sameSlope">
            <label class="number-field">
              <span class="dim-label">Talud (4 lados)</span>
              <div class="number-input-wrap">
                <input
                  v-model="slopeText[0]"
                  type="text"
                  inputmode="decimal"
                  @input="onUniformSlopeInput($event)"
                  @blur="onUniformSlopeBlur"
                />
                <span class="field-unit">°</span>
              </div>
            </label>
          </template>
          <template v-else>
            <label
              v-for="(label, index) in SLOPE_LABELS"
              :key="index"
              class="number-field"
            >
              <span class="dim-label">{{ label }}</span>
              <div class="number-input-wrap">
                <input
                  v-model="slopeText[index]"
                  type="text"
                  inputmode="decimal"
                  @input="onSlopeInput(index, $event)"
                  @blur="onSlopeBlur(index)"
                />
                <span class="field-unit">°</span>
              </div>
            </label>
          </template>

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

        <div class="rect-pool-designer__preview" role="status">
          <p class="preview-title">Previsualización de área</p>
          <p class="preview-note">
            Valores estimados en vivo. El metraje definitivo se recalcula al guardar en el servidor.
          </p>
          <p v-if="previewError" class="preview-error">
            Revisa las dimensiones; no se pudo calcular el área
          </p>
          <dl v-else-if="preview" class="preview-grid">
            <div><dt>Lateral</dt><dd>{{ preview.lateral.toFixed(2) }} m²</dd></div>
            <div><dt>Fondo</dt><dd>{{ preview.bottomArea.toFixed(2) }} m²</dd></div>
            <div><dt>Anclaje</dt><dd>{{ preview.anchorArea.toFixed(2) }} m²</dd></div>
            <div><dt>Subtotal</dt><dd>{{ preview.subtotal.toFixed(2) }} m²</dd></div>
            <div>
              <dt>Merma ({{ preview.wastePercent }}%)</dt>
              <dd>{{ preview.wasteAmount.toFixed(2) }} m²</dd>
            </div>
            <div class="preview-total">
              <dt>Total estimado</dt>
              <dd>{{ preview.total.toFixed(2) }} m²</dd>
            </div>
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
      <div class="canvas-wrap rect-pool-designer__canvas-wrap">
        <div
          ref="canvasWrap"
          class="rect-pool-designer__canvas-host"
          aria-label="Vista 3D de la piscina rectangular"
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
import {
  SCENE_GROUND_Y,
  useThreeScene,
} from "../../composables/useThreeScene";
import {
  buildPolygonPoolMeshes,
  clearPolygonPoolMeshes,
  computeCameraDistance,
  computeSceneRadius,
} from "../../utils/buildPolygonPoolMesh";
import {
  calcRectangularPoolArea,
  type RectangularPoolDimensions,
} from "../../utils/relaveraGeometry";

type DimNumericKey = "length" | "width" | "depth" | "anchorWidth";
type SlopeAngles = RectangularPoolDimensions["slopeAngles"];

const props = defineProps<{
  modelValue: RectangularPoolDimensions;
  wastePercent: number;
  name: string;
  clientRef: string;
  notes: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: RectangularPoolDimensions];
  "update:wastePercent": [value: number];
  "update:name": [value: string];
  "update:clientRef": [value: string];
  "update:notes": [value: string];
}>();

const SLOPE_LABELS = [
  "Talud lado largo A",
  "Talud lado ancho B",
  "Talud lado largo C",
  "Talud lado ancho D",
] as const;

const DIM_MIN: Record<DimNumericKey, number> = {
  length: 1,
  width: 1,
  depth: 0.5,
  anchorWidth: 0,
};

const SLOPE_MIN = 1;
const SLOPE_MAX = 89;

const dims = computed(() => props.modelValue);

const dimText = reactive({
  length: String(props.modelValue.length),
  width: String(props.modelValue.width),
  depth: String(props.modelValue.depth),
  anchorWidth: String(props.modelValue.anchorWidth),
});

const slopeText = reactive(
  props.modelValue.slopeAngles.map((angle) => String(angle)),
);

const wasteText = ref(String(props.wastePercent));
const sameSlope = ref(allSlopesEqual(props.modelValue.slopeAngles));

const previewState = computed(() => {
  try {
    const result = calcRectangularPoolArea(dims.value, props.wastePercent);
    const allPoints = [
      ...result.topPolygon,
      ...result.bottomPolygon,
      ...result.outerPolygon,
    ];
    if (allPoints.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z))) {
      throw new Error("Invalid polygon");
    }
    return { result, error: null };
  } catch {
    return { result: null, error: true };
  }
});

const preview = computed(() => previewState.value.result);
const previewError = computed(() => previewState.value.error);

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
  initialDistance: 18,
  minDistanceFactor: 0.35,
  maxDistanceFloor: 60,
});
let poolGroup: THREE.Group | null = null;

function allSlopesEqual(angles: SlopeAngles): boolean {
  return angles.every((angle) => angle === angles[0]);
}

function parseDecimalInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const normalized = trimmed.replace(/,/g, ".");
  if ((normalized.match(/\./g) ?? []).length > 1) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function isIncompleteDecimal(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "-") return true;
  return /[.,]$/.test(trimmed);
}

function clamp(n: number, min: number, max?: number): number {
  const withMin = Math.max(min, n);
  return max === undefined ? withMin : Math.min(max, withMin);
}

function clampWastePercent(n: number): number {
  return clamp(n, 0, 100);
}

function emitDimensions(next: Partial<RectangularPoolDimensions>) {
  emit("update:modelValue", { ...props.modelValue, ...next });
}

function emitSlopeAngles(angles: SlopeAngles) {
  emitDimensions({ slopeAngles: [...angles] as SlopeAngles });
}

function onDimInput(key: DimNumericKey, e: Event) {
  const text = (e.target as HTMLInputElement).value;
  dimText[key] = text;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n < 0) return;
  emitDimensions({ [key]: clamp(n, DIM_MIN[key]) });
}

function onDimBlur(key: DimNumericKey) {
  const n = parseDecimalInput(dimText[key]);
  const final = n === null || n < 0 ? DIM_MIN[key] : clamp(n, DIM_MIN[key]);
  dimText[key] = String(final);
  emitDimensions({ [key]: final });
}

function onSlopeInput(index: number, e: Event) {
  const text = (e.target as HTMLInputElement).value;
  slopeText[index] = text;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n < 0) return;
  const angles = [...props.modelValue.slopeAngles] as SlopeAngles;
  angles[index] = clamp(n, SLOPE_MIN, SLOPE_MAX);
  emitSlopeAngles(angles);
}

function onSlopeBlur(index: number) {
  const n = parseDecimalInput(slopeText[index] ?? "");
  const final =
    n === null || n < 0 ? SLOPE_MIN : clamp(n, SLOPE_MIN, SLOPE_MAX);
  slopeText[index] = String(final);
  const angles = [...props.modelValue.slopeAngles] as SlopeAngles;
  angles[index] = final;
  emitSlopeAngles(angles);
}

function onUniformSlopeInput(e: Event) {
  const text = (e.target as HTMLInputElement).value;
  slopeText[0] = text;
  slopeText[1] = text;
  slopeText[2] = text;
  slopeText[3] = text;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n < 0) return;
  const angle = clamp(n, SLOPE_MIN, SLOPE_MAX);
  emitSlopeAngles([angle, angle, angle, angle]);
}

function onUniformSlopeBlur() {
  const n = parseDecimalInput(slopeText[0] ?? "");
  const final =
    n === null || n < 0 ? SLOPE_MIN : clamp(n, SLOPE_MIN, SLOPE_MAX);
  const text = String(final);
  slopeText[0] = text;
  slopeText[1] = text;
  slopeText[2] = text;
  slopeText[3] = text;
  emitSlopeAngles([final, final, final, final]);
}

function onSameSlopeChange(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  sameSlope.value = checked;
  if (!checked) return;
  const base = props.modelValue.slopeAngles[0] ?? 45;
  const text = String(base);
  slopeText[0] = text;
  slopeText[1] = text;
  slopeText[2] = text;
  slopeText[3] = text;
  emitSlopeAngles([base, base, base, base]);
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
  const final = n === null || n < 0 ? 0 : clampWastePercent(n);
  wasteText.value = String(final);
  emit("update:wastePercent", final);
}

function onFlatBottomChange(e: Event) {
  const yes = (e.target as HTMLSelectElement).value === "yes";
  emitDimensions({ hasFlatBottom: yes });
}

function syncTextFromDimensions(value: RectangularPoolDimensions) {
  dimText.length = String(value.length);
  dimText.width = String(value.width);
  dimText.depth = String(value.depth);
  dimText.anchorWidth = String(value.anchorWidth);
  value.slopeAngles.forEach((angle, index) => {
    slopeText[index] = String(angle);
  });
  sameSlope.value = allSlopesEqual(value.slopeAngles);
}

function buildPoolMeshes() {
  if (!poolGroup) return;
  clearPolygonPoolMeshes(poolGroup);

  if (previewError.value || !preview.value) return;

  const { topPolygon, bottomPolygon, outerPolygon } = preview.value;
  const depth = dims.value.depth;
  const vertexHeights = [depth, depth, depth, depth];

  buildPolygonPoolMeshes({
    group: poolGroup,
    topPolygon,
    bottomPolygon,
    outerPolygon,
    vertexHeights,
    hasFlatBottom: dims.value.hasFlatBottom,
    anchorWidth: dims.value.anchorWidth,
  });

  const sceneRadius = computeSceneRadius(outerPolygon);
  setSceneScale(sceneRadius);
  setCameraDistance(computeCameraDistance(outerPolygon, depth));
  frameCamera(depth / 2);
  setGroundTransform(SCENE_GROUND_Y);
}

async function mountThree() {
  const host = canvasWrap.value;
  if (!host) return;
  if (!(await initializeScene(host)) || !scene.value) return;
  poolGroup = new THREE.Group();
  scene.value.add(poolGroup);
  buildPoolMeshes();
}

watch(
  () => props.modelValue,
  (value) => {
    syncTextFromDimensions(value);
    buildPoolMeshes();
  },
  { deep: true },
);

watch(
  () => props.wastePercent,
  (value) => {
    if (Number.isFinite(value)) wasteText.value = String(value);
  },
);

watch(preview, () => buildPoolMeshes());

onMounted(() => {
  void mountThree();
});
</script>

<style scoped>
.rect-pool-designer {
  --design-clay: #c4a574;
  --design-earth: #4a3f35;
  --design-membrane: #2f5450;
  --design-sand: #f5e6d3;
  --design-border: #d4c4a8;
}

.pool-designer {
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

.rect-pool-designer__canvas-wrap {
  position: relative;
  border-radius: 10px;
  border: 1px solid var(--design-border);
  background: var(--design-earth);
  overflow: hidden;
}

.rect-pool-designer__canvas-host {
  position: absolute;
  inset: 0;
  cursor: grab;
  touch-action: none;
}

.rect-pool-designer__canvas-host:active {
  cursor: grabbing;
}

.rect-pool-designer__canvas-host :deep(canvas) {
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

.rect-pool-designer__controls {
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

.text-field,
.number-field,
.select-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-field input {
  margin: 0;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
}

.dim-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #4a3f35;
}

.text-field input,
.text-field textarea,
.number-field input,
.select-field select {
  min-width: 0;
  padding: 0.42rem 0.55rem;
  border: 1px solid var(--design-border);
  border-radius: 8px;
  font-size: 0.86rem;
  font-family: inherit;
  background: var(--design-sand);
  color: #2a2520;
}

.text-field input:focus,
.text-field textarea:focus,
.number-field input:focus,
.select-field select:focus {
  outline: none;
  border-color: var(--design-membrane);
  box-shadow: 0 0 0 1px rgba(47, 84, 80, 0.25);
}

.number-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.number-input-wrap input {
  flex: 1;
}

.field-unit {
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b5d4f;
}

.rect-pool-designer__preview {
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

.preview-note,
.preview-error {
  margin: 0 0 0.65rem;
  font-size: 0.75rem;
  color: #6b5d4f;
  line-height: 1.4;
}

.preview-error {
  margin-bottom: 0;
  color: #b91c1c;
  font-weight: 500;
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
