<template>
  <div class="pool-designer relavera-designer">
    <div class="pool-designer__scroll-col">
        <label class="text-field">
          <span class="field-label">Nombre</span>
          <input
            type="text"
            required
            placeholder="Ej: Relavera sector norte"
            :value="name"
            @input="emit('update:name', ($event.target as HTMLInputElement).value)"
          />
        </label>

        <label class="text-field">
          <span class="field-label">Cliente / referencia (opcional)</span>
          <input
            type="text"
            placeholder="Ej: Mina ABC — Etapa 1"
            :value="clientRef"
            @input="emit('update:clientRef', ($event.target as HTMLInputElement).value)"
          />
        </label>

        <div class="edges-block">
          <div class="edges-header">
            <span class="field-label">Lados del polígono</span>
            <button type="button" class="btn-small" @click="addEdge">
              + Agregar lado
            </button>
          </div>

          <label class="auto-close-toggle">
            <input
              v-model="autoCloseEnabled"
              type="checkbox"
              @change="onAutoCloseChange"
            />
            <span>Cerrar automáticamente con el último lado</span>
          </label>

          <div
            v-for="(edge, index) in edgeText"
            :key="index"
            class="edge-row"
          >
            <label class="number-field">
              <span class="dim-label">
                {{ isAutoDerivedLength(index) ? "Longitud m (auto)" : "Longitud m" }}
              </span>
              <input
                v-model="edge.length"
                type="text"
                inputmode="decimal"
                :disabled="isAutoDerivedLength(index)"
                @input="onEdgeInput(index, 'length', $event)"
                @blur="onEdgeBlur(index, 'length')"
              />
            </label>
            <label class="number-field">
              <span class="dim-label">
                {{ isAutoDerivedAngle(index) ? "Ángulo ° (auto)" : "Ángulo °" }}
              </span>
              <input
                v-model="edge.interiorAngleDeg"
                type="text"
                inputmode="decimal"
                :disabled="isAutoDerivedAngle(index)"
                :title="
                  autoCloseEnabled && index === 0
                    ? 'Ángulo de cierre derivado automáticamente'
                    : undefined
                "
                @input="onEdgeInput(index, 'interiorAngleDeg', $event)"
                @blur="onEdgeBlur(index, 'interiorAngleDeg')"
              />
            </label>
            <label class="number-field">
              <span class="dim-label">Talud °</span>
              <input
                v-model="edge.slopeAngleDeg"
                type="text"
                inputmode="decimal"
                @input="onEdgeInput(index, 'slopeAngleDeg', $event)"
                @blur="onEdgeBlur(index, 'slopeAngleDeg')"
              />
            </label>
            <button
              type="button"
              class="btn-remove-edge"
              :disabled="edgeText.length <= 3"
              title="Eliminar lado"
              @click="removeEdge(index)"
            >
              ×
            </button>
          </div>
        </div>

        <div class="heights-block">
          <span class="field-label">Alturas de los vértices</span>
          <label
            v-for="(_height, index) in heightText"
            :key="index"
            class="number-field"
          >
            <span class="dim-label">{{ vertexHeightLabel(index) }}</span>
            <div class="number-input-wrap">
              <input
                v-model="heightText[index]"
                type="text"
                inputmode="decimal"
                @input="onHeightInput(index, $event)"
                @blur="onHeightBlur(index)"
              />
              <span class="field-unit">m</span>
            </div>
          </label>
        </div>

        <div class="relavera-designer__controls">
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

        <div class="relavera-designer__preview" role="status">
          <p class="preview-title">Previsualización de área</p>
          <p class="preview-note">
            Valores estimados en vivo. El metraje definitivo se recalcula al guardar en el servidor.
          </p>
          <div v-if="previewError" class="preview-warning" role="alert">
            <span class="preview-warning__icon" aria-hidden="true">⚠</span>
            <p class="preview-warning__text">{{ previewError }}</p>
          </div>
          <template v-else-if="preview">
            <div
              v-if="preview.adjustmentApplied"
              class="preview-info"
              role="status"
            >
              <span class="preview-info__icon" aria-hidden="true">ℹ</span>
              <p class="preview-info__text">
                Se ajustó automáticamente un desfase de cierre de
                {{ preview.adjustmentMeters.toFixed(2) }}m entre los lados
                (dentro del rango normal de un levantamiento de campo).
              </p>
            </div>
            <dl class="preview-grid">
              <div><dt>Lateral</dt><dd>{{ preview.lateral.toFixed(2) }} m²</dd></div>
              <div><dt>Fondo</dt><dd>{{ preview.bottomArea.toFixed(2) }} m²</dd></div>
              <div><dt>Anclaje</dt><dd>{{ preview.anchorArea.toFixed(2) }} m²</dd></div>
              <div><dt>Subtotal</dt><dd>{{ preview.subtotal.toFixed(2) }} m²</dd></div>
              <div><dt>Merma ({{ preview.wastePercent }}%)</dt><dd>{{ preview.wasteAmount.toFixed(2) }} m²</dd></div>
              <div class="preview-total"><dt>Total estimado</dt><dd>{{ preview.total.toFixed(2) }} m²</dd></div>
            </dl>
          </template>
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
      <div class="canvas-wrap relavera-designer__canvas-wrap">
        <div
          ref="canvasWrap"
          class="relavera-designer__canvas-host"
          aria-label="Vista 3D de la relavera"
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
  calcRelaveraArea,
  deriveAutoClosingEdges,
  type Point2D,
  type RelaveraDimensions,
  type RelaveraEdge,
} from "../../utils/relaveraGeometry";

type EdgeNumericKey = keyof RelaveraEdge;
type DimNumericKey = "anchorWidth";

interface LastValidGeometry {
  topPolygon: Point2D[];
  bottomPolygon: Point2D[];
  outerPolygon: Point2D[];
  vertexHeights: number[];
  hasFlatBottom: boolean;
  anchorWidth: number;
}

function clonePolygon(pts: Point2D[]): Point2D[] {
  return pts.map((p) => ({ x: p.x, z: p.z }));
}

const props = defineProps<{
  modelValue: RelaveraDimensions;
  wastePercent: number;
  name: string;
  clientRef: string;
  notes: string;
  autoCloseDefault?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: RelaveraDimensions];
  "update:wastePercent": [value: number];
  "update:name": [value: string];
  "update:clientRef": [value: string];
  "update:notes": [value: string];
  "update:geometryError": [value: string | null];
}>();

const dims = computed(() => props.modelValue);
const autoCloseEnabled = ref(props.autoCloseDefault ?? true);

const EDGE_DEFAULT: RelaveraEdge = {
  length: 10,
  interiorAngleDeg: 90,
  slopeAngleDeg: 30,
};

const EDGE_MIN: Record<EdgeNumericKey, number> = {
  length: 0.5,
  interiorAngleDeg: 1,
  slopeAngleDeg: 1,
};

const EDGE_MAX: Partial<Record<EdgeNumericKey, number>> = {
  interiorAngleDeg: 359,
  slopeAngleDeg: 89,
};

const DIM_MIN: Record<DimNumericKey, number> = {
  anchorWidth: 0,
};

const HEIGHT_MIN = 0.5;

const edgeText = reactive(
  props.modelValue.edges.map((edge) => ({
    length: String(edge.length),
    interiorAngleDeg: String(edge.interiorAngleDeg),
    slopeAngleDeg: String(edge.slopeAngleDeg),
  })),
);

const heightText = reactive(
  props.modelValue.vertexHeights.map((h) => String(h)),
);

const dimText = reactive({
  anchorWidth: String(props.modelValue.anchorWidth),
});

const wasteText = ref(String(props.wastePercent));

const previewState = computed(() => {
  try {
    const result = calcRelaveraArea(dims.value, props.wastePercent);
    const allPoints = [
      ...result.topPolygon,
      ...result.bottomPolygon,
      ...result.outerPolygon,
    ];
    if (allPoints.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.z))) {
      throw new Error("Invalid polygon");
    }
    return { result, error: null as string | null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "No se pudo calcular el área";
    return { result: null, error: message };
  }
});

const preview = computed(() => previewState.value.result);
const previewError = computed(() => previewState.value.error);

watch(
  previewError,
  (message) => {
    emit("update:geometryError", message);
  },
  { immediate: true },
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
  initialDistance: 18,
  minDistanceFactor: 0.35,
  maxDistanceFloor: 60,
});
let relaveraGroup: THREE.Group | null = null;
const lastValidGeometry = ref<LastValidGeometry | null>(null);

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

function emitDimensions(next: Partial<RelaveraDimensions>) {
  emit("update:modelValue", { ...props.modelValue, ...next });
}

function withAutoClosingEdge(edges: RelaveraEdge[]): RelaveraEdge[] {
  return autoCloseEnabled.value ? deriveAutoClosingEdges(edges) : edges;
}

function isAutoDerivedLength(index: number): boolean {
  return autoCloseEnabled.value && index === edgeText.length - 1;
}

function isAutoDerivedAngle(index: number): boolean {
  return (
    autoCloseEnabled.value &&
    (index === 0 || index === edgeText.length - 1)
  );
}

function onAutoCloseChange(event: Event) {
  autoCloseEnabled.value = (event.target as HTMLInputElement).checked;
  if (!autoCloseEnabled.value) return;
  try {
    emitDimensions({
      edges: deriveAutoClosingEdges(props.modelValue.edges),
    });
  } catch {
    autoCloseEnabled.value = false;
  }
}

function emitEdge(index: number, key: EdgeNumericKey, value: number) {
  const edges = props.modelValue.edges.map((edge, i) =>
    i === index ? { ...edge, [key]: value } : edge,
  );
  emitDimensions({ edges: withAutoClosingEdge(edges) });
}

function onEdgeInput(index: number, key: EdgeNumericKey, e: Event) {
  const text = (e.target as HTMLInputElement).value;
  const edge = edgeText[index];
  if (!edge) return;
  edge[key] = text;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n < 0) return;
  emitEdge(index, key, clamp(n, EDGE_MIN[key], EDGE_MAX[key]));
}

function onEdgeBlur(index: number, key: EdgeNumericKey) {
  const edge = edgeText[index];
  if (!edge) return;
  const n = parseDecimalInput(edge[key]);
  const final =
    n === null || n < 0
      ? EDGE_MIN[key]
      : clamp(n, EDGE_MIN[key], EDGE_MAX[key]);
  edge[key] = String(final);
  emitEdge(index, key, final);
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

function onHeightInput(index: number, e: Event) {
  const text = (e.target as HTMLInputElement).value;
  heightText[index] = text;
  if (isIncompleteDecimal(text)) return;
  const n = parseDecimalInput(text);
  if (n === null || n < 0) return;
  const vertexHeights = props.modelValue.vertexHeights.map((h, i) =>
    i === index ? clamp(n, HEIGHT_MIN) : h,
  );
  emitDimensions({ vertexHeights });
}

function onHeightBlur(index: number) {
  const n = parseDecimalInput(heightText[index] ?? "");
  const final = n === null || n < 0 ? HEIGHT_MIN : clamp(n, HEIGHT_MIN);
  heightText[index] = String(final);
  const vertexHeights = props.modelValue.vertexHeights.map((h, i) =>
    i === index ? final : h,
  );
  emitDimensions({ vertexHeights });
}

function vertexHeightLabel(index: number): string {
  const n = edgeText.length;
  const prevSide = index === 0 ? n : index;
  return `Altura vértice ${index + 1} (entre lado ${prevSide} y lado ${index + 1})`;
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

function regularInteriorAngleDeg(edgeCount: number): number {
  return ((edgeCount - 2) * 180) / edgeCount;
}

function withRegularInteriorAngles(edges: RelaveraEdge[]): RelaveraEdge[] {
  const interiorAngleDeg = regularInteriorAngleDeg(edges.length);
  return edges.map((edge) => ({ ...edge, interiorAngleDeg }));
}

function addEdge() {
  const existingHeights = props.modelValue.vertexHeights;
  const avgHeight =
    existingHeights.length > 0
      ? existingHeights.reduce((sum, h) => sum + h, 0) / existingHeights.length
      : 2;
  emitDimensions({
    edges: withAutoClosingEdge(
      withRegularInteriorAngles([
        ...props.modelValue.edges,
        { ...EDGE_DEFAULT },
      ]),
    ),
    vertexHeights: [...existingHeights, avgHeight],
  });
}

function removeEdge(index: number) {
  if (props.modelValue.edges.length <= 3) return;
  emitDimensions({
    edges: withAutoClosingEdge(
      withRegularInteriorAngles(
        props.modelValue.edges.filter((_, i) => i !== index),
      ),
    ),
    vertexHeights: props.modelValue.vertexHeights.filter((_, i) => i !== index),
  });
}

function syncTextFromDimensions(value: RelaveraDimensions) {
  edgeText.splice(
    0,
    edgeText.length,
    ...value.edges.map((edge) => ({
      length: String(edge.length),
      interiorAngleDeg: String(edge.interiorAngleDeg),
      slopeAngleDeg: String(edge.slopeAngleDeg),
    })),
  );
  heightText.splice(
    0,
    heightText.length,
    ...value.vertexHeights.map((h) => String(h)),
  );
  dimText.anchorWidth = String(value.anchorWidth);
}

function clearRelaveraMeshes() {
  if (!relaveraGroup) return;
  clearPolygonPoolMeshes(relaveraGroup);
}

function buildRelaveraMeshes() {
  if (!relaveraGroup) return;

  const hasError = Boolean(previewError.value) || !preview.value;

  if (!hasError && preview.value) {
    const { topPolygon, bottomPolygon, outerPolygon } = preview.value;
    lastValidGeometry.value = {
      topPolygon: clonePolygon(topPolygon),
      bottomPolygon: clonePolygon(bottomPolygon),
      outerPolygon: clonePolygon(outerPolygon),
      vertexHeights: [...dims.value.vertexHeights],
      hasFlatBottom: dims.value.hasFlatBottom,
      anchorWidth: dims.value.anchorWidth,
    };

    const vertexHeights = dims.value.vertexHeights;
    const maxHeight = Math.max(...vertexHeights, 0);

    buildPolygonPoolMeshes({
      group: relaveraGroup,
      topPolygon,
      bottomPolygon,
      outerPolygon,
      vertexHeights,
      hasFlatBottom: dims.value.hasFlatBottom,
      anchorWidth: dims.value.anchorWidth,
      stale: false,
    });

    const sceneRadius = computeSceneRadius(outerPolygon);
    setSceneScale(sceneRadius);
    setCameraDistance(computeCameraDistance(outerPolygon, maxHeight));
    frameCamera(maxHeight / 2);
    setGroundTransform(SCENE_GROUND_Y);
    return;
  }

  const stale = lastValidGeometry.value;
  if (!stale) {
    clearRelaveraMeshes();
    return;
  }

  buildPolygonPoolMeshes({
    group: relaveraGroup,
    topPolygon: stale.topPolygon,
    bottomPolygon: stale.bottomPolygon,
    outerPolygon: stale.outerPolygon,
    vertexHeights: stale.vertexHeights,
    hasFlatBottom: stale.hasFlatBottom,
    anchorWidth: stale.anchorWidth,
    stale: true,
  });
  setGroundTransform(SCENE_GROUND_Y);
}

async function mountThree() {
  const host = canvasWrap.value;
  if (!host) return;
  if (!(await initializeScene(host)) || !scene.value) return;
  relaveraGroup = new THREE.Group();
  scene.value.add(relaveraGroup);
  buildRelaveraMeshes();
}

watch(
  () => props.modelValue,
  (value) => {
    syncTextFromDimensions(value);
    buildRelaveraMeshes();
  },
  { deep: true },
);

watch(
  () => props.wastePercent,
  (value) => {
    if (Number.isFinite(value)) wasteText.value = String(value);
  },
);

watch(preview, () => buildRelaveraMeshes());

onMounted(() => {
  if (autoCloseEnabled.value) {
    emitDimensions({
      edges: deriveAutoClosingEdges(props.modelValue.edges),
    });
  }
  void mountThree();
});
</script>

<style scoped>
.relavera-designer {
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

.relavera-designer__canvas-wrap {
  position: relative;
  border-radius: 10px;
  border: 1px solid var(--design-border);
  background: var(--design-earth);
  overflow: hidden;
}

.relavera-designer__canvas-host {
  position: absolute;
  inset: 0;
  cursor: grab;
  touch-action: none;
}

.relavera-designer__canvas-host:active {
  cursor: grabbing;
}

.relavera-designer__canvas-host :deep(canvas) {
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

.relavera-designer__controls,
.edges-block,
.heights-block {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.edges-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.auto-close-toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  color: #4a3f35;
  cursor: pointer;
}

.auto-close-toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--design-membrane);
}

.edge-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 0.35rem;
  align-items: end;
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

.number-field input:disabled {
  background: #e5e7eb;
  border-color: #d1d5db;
  color: #6b7280;
  cursor: not-allowed;
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

.btn-small,
.btn-remove-edge {
  border: 1px solid var(--design-border);
  background: #fff;
  color: #4a3f35;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.78rem;
}

.btn-small {
  padding: 0.35rem 0.6rem;
}

.btn-remove-edge {
  width: 2rem;
  height: 2rem;
  padding: 0;
  color: #b91c1c;
  border-color: #fecaca;
}

.btn-remove-edge:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.relavera-designer__preview {
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

.preview-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.preview-warning__icon {
  flex-shrink: 0;
  color: #c2410c;
  font-size: 0.95rem;
  line-height: 1.3;
}

.preview-warning__text {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 500;
  color: #9a3412;
  line-height: 1.4;
}

.preview-info {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0 0 0.65rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: #eff6ff;
  border: 1px solid #93c5fd;
}

.preview-info__icon {
  flex-shrink: 0;
  color: #1d4ed8;
  font-size: 0.95rem;
  line-height: 1.3;
}

.preview-info__text {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 500;
  color: #1e40af;
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
