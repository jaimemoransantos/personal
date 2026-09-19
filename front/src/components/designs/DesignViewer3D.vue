<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="viewer-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-viewer-title"
        @click.self="close"
      >
        <div class="viewer-box">
          <header class="viewer-header">
            <div class="viewer-header-text">
              <h2 id="design-viewer-title" class="viewer-title">
                {{ design?.name || "Vista 3D" }}
              </h2>
              <p v-if="design" class="viewer-subtitle">
                {{ typeLabel(design.type) }}
              </p>
            </div>
            <button
              type="button"
              class="viewer-close"
              aria-label="Cerrar"
              @click="close"
            >
              ×
            </button>
          </header>

          <div class="viewer-body">
            <div v-if="loading" class="viewer-state">
              <p>Cargando diseño…</p>
            </div>
            <div v-else-if="error" class="viewer-state">
              <p>{{ error }}</p>
            </div>
            <template v-else-if="design">
              <div class="viewer-layout">
                <div class="viewer-canvas-col">
                  <div class="viewer-canvas-wrap">
                    <div
                      ref="canvasHost"
                      class="viewer-canvas-host"
                      aria-label="Vista 3D del diseño"
                    />
                    <button
                      type="button"
                      class="canvas-reset-btn"
                      title="Centrar vista"
                      @click.stop="resetCamera"
                    >
                      Centrar vista
                    </button>
                  </div>
                </div>

                <aside class="viewer-sidebar">
                  <section class="viewer-section">
                    <h3 class="viewer-section-title">Dimensiones</h3>
                    <dl class="viewer-dl">
                      <div v-for="row in dimensionRows" :key="row.label">
                        <dt>{{ row.label }}</dt>
                        <dd>{{ row.value }}</dd>
                      </div>
                    </dl>
                  </section>

                  <section class="viewer-section">
                    <h3 class="viewer-section-title">Área</h3>
                    <p class="viewer-note">
                      Valores guardados del diseño (solo lectura).
                    </p>
                    <dl class="viewer-dl preview-grid">
                      <div>
                        <dt>Lateral</dt>
                        <dd>{{ formatM2(design.area?.lateral) }}</dd>
                      </div>
                      <div>
                        <dt>Fondo</dt>
                        <dd>{{ formatM2(design.area?.bottomArea) }}</dd>
                      </div>
                      <div>
                        <dt>Anclaje</dt>
                        <dd>{{ formatM2(design.area?.anchorArea) }}</dd>
                      </div>
                      <div>
                        <dt>Subtotal</dt>
                        <dd>{{ formatM2(design.area?.subtotal) }}</dd>
                      </div>
                      <div>
                        <dt>Merma ({{ design.area?.wastePercent ?? 0 }}%)</dt>
                        <dd>{{ formatM2(design.area?.wasteAmount) }}</dd>
                      </div>
                      <div class="preview-total">
                        <dt>Total</dt>
                        <dd>{{ formatM2(design.area?.total) }}</dd>
                      </div>
                    </dl>
                  </section>
                </aside>
              </div>
            </template>
          </div>

          <footer class="viewer-footer">
            <button
              type="button"
              class="modal-btn modal-btn-cancel"
              @click="close"
            >
              Cerrar
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import * as THREE from "three";
import {
  useDesigns,
  type Design,
  type DesignType,
  type RectangularPoolDimensions,
  type RelaveraDimensions,
  type RoundPoolDimensions,
} from "../../composables/useDesigns";
import { useThreeScene, SCENE_GROUND_Y } from "../../composables/useThreeScene";
import {
  buildPolygonPoolMeshes,
  computeCameraDistance as computePolygonCameraDistance,
  computeSceneRadius as computePolygonSceneRadius,
} from "../../utils/buildPolygonPoolMesh";
import {
  calcRectangularPoolArea,
  calcRelaveraArea,
} from "../../utils/relaveraGeometry";

const props = defineProps<{
  modelValue: boolean;
  designId: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const { getById } = useDesigns();

const design = ref<Design | null>(null);
const loading = ref(false);
const error = ref("");
const canvasHost = ref<HTMLDivElement | null>(null);

const TYPE_LABELS: Record<DesignType, string> = {
  piscina_redonda: "Piscina redonda",
  piscina_rectangular: "Piscina rectangular",
  tanque_cilindrico: "Tanque cilíndrico",
  tanque_rectangular: "Tanque rectangular",
  relavera: "Relavera",
};

const {
  scene,
  initialize: initializeScene,
  cleanup: cleanupScene,
  setCameraDistance,
  frameCamera,
  resetCamera,
  setSceneScale,
  setGroundTransform,
} = useThreeScene({
  initialDistance: 14,
  minDistanceFactor: 0.45,
  maxDistanceFloor: 80,
  // Relaveras grandes (~100 m) necesitan far plane amplio para no clippear.
  cameraFar: 4000,
});

let meshGroup: THREE.Group | null = null;

function typeLabel(type: DesignType): string {
  return TYPE_LABELS[type] ?? type;
}

function formatM2(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} m²`;
}

function isRound(
  designValue: Design,
): designValue is Design & { dimensions: RoundPoolDimensions } {
  return (
    designValue.type === "piscina_redonda" ||
    designValue.type === "tanque_cilindrico"
  );
}

function isRectangular(
  designValue: Design,
): designValue is Design & { dimensions: RectangularPoolDimensions } {
  return (
    designValue.type === "piscina_rectangular" ||
    designValue.type === "tanque_rectangular"
  );
}

function isRelavera(
  designValue: Design,
): designValue is Design & { dimensions: RelaveraDimensions } {
  return designValue.type === "relavera";
}

const dimensionRows = computed(() => {
  const d = design.value;
  if (!d) return [];
  if (isRound(d)) {
    const dims = d.dimensions;
    return [
      { label: "Radio superior", value: `${dims.rTop} m` },
      { label: "Radio inferior", value: `${dims.rBottom} m` },
      { label: "Profundidad", value: `${dims.depth} m` },
      { label: "Ancho de anclaje", value: `${dims.anchorWidth} m` },
      {
        label: "Fondo plano",
        value: dims.hasFlatBottom ? "Sí" : "No",
      },
    ];
  }
  if (isRectangular(d)) {
    const dims = d.dimensions;
    return [
      { label: "Largo", value: `${dims.length} m` },
      { label: "Ancho", value: `${dims.width} m` },
      { label: "Profundidad", value: `${dims.depth} m` },
      {
        label: "Ángulos de talud",
        value: dims.slopeAngles.map((a) => `${a}°`).join(", "),
      },
      { label: "Ancho de anclaje", value: `${dims.anchorWidth} m` },
      {
        label: "Fondo plano",
        value: dims.hasFlatBottom ? "Sí" : "No",
      },
    ];
  }
  if (isRelavera(d)) {
    const dims = d.dimensions;
    return [
      { label: "Lados", value: String(dims.edges.length) },
      {
        label: "Longitudes",
        value: dims.edges.map((e) => `${e.length?.toFixed(2)} m`).join(" · "),
      },
      {
        label: "Alturas de vértice",
        value: dims.vertexHeights.map((h) => `${h} m`).join(" · "),
      },
      { label: "Ancho de anclaje", value: `${dims.anchorWidth} m` },
      {
        label: "Fondo plano",
        value: dims.hasFlatBottom ? "Sí" : "No",
      },
    ];
  }
  return [];
});

function clearMeshes() {
  if (!meshGroup) return;
  const toRemove = [...meshGroup.children];
  for (const child of toRemove) {
    meshGroup.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  }
}

function buildRoundMeshes(dims: RoundPoolDimensions) {
  if (!meshGroup) return;
  clearMeshes();

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

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(
      dims.rTop,
      dims.rBottom,
      dims.depth,
      64,
      1,
      true,
    ),
    wallMat,
  );
  wall.castShadow = true;
  wall.receiveShadow = true;
  meshGroup.add(wall);

  if (dims.hasFlatBottom) {
    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry(dims.rBottom, 64),
      bottomMat,
    );
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -dims.depth / 2;
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    meshGroup.add(bottom);
  }

  if (dims.anchorWidth > 0) {
    const anchor = new THREE.Mesh(
      new THREE.RingGeometry(dims.rTop, dims.rTop + dims.anchorWidth, 64),
      anchorMat,
    );
    anchor.rotation.x = -Math.PI / 2;
    anchor.position.y = dims.depth / 2 + 0.01;
    anchor.receiveShadow = true;
    meshGroup.add(anchor);
  }

  const sceneRadius = dims.rTop + dims.anchorWidth;
  const maxR = Math.max(dims.rTop, dims.rBottom) + dims.anchorWidth;
  setSceneScale(Math.max(14, sceneRadius));
  setCameraDistance(Math.max(8, dims.rTop * 3, maxR * 2.2));
  frameCamera(0);
  setGroundTransform(-dims.depth / 2 - Math.abs(SCENE_GROUND_Y));
}

function buildPolygonMeshes(
  topPolygon: { x: number; z: number }[],
  bottomPolygon: { x: number; z: number }[],
  outerPolygon: { x: number; z: number }[],
  vertexHeights: number[],
  hasFlatBottom: boolean,
  anchorWidth: number,
) {
  if (!meshGroup) return;
  const maxHeight = Math.max(...vertexHeights, 0);
  buildPolygonPoolMeshes({
    group: meshGroup,
    topPolygon,
    bottomPolygon,
    outerPolygon,
    vertexHeights,
    hasFlatBottom,
    anchorWidth,
    stale: false,
  });
  const sceneRadius = computePolygonSceneRadius(outerPolygon);
  setSceneScale(sceneRadius);
  setCameraDistance(computePolygonCameraDistance(outerPolygon, maxHeight));
  frameCamera(maxHeight / 2);
  setGroundTransform(SCENE_GROUND_Y);
}

function buildDesignMeshes(d: Design) {
  if (!meshGroup) return;
  const wastePercent = d.area?.wastePercent ?? 0;

  if (isRound(d)) {
    buildRoundMeshes(d.dimensions);
    return;
  }

  // Polígonos NUNCA vienen de Firestore: siempre se recalculan en cliente
  // con las mismas funciones que RelaveraDesigner / RectangularPoolDesigner.
  if (isRectangular(d)) {
    const result = calcRectangularPoolArea(d.dimensions, wastePercent);
    buildPolygonMeshes(
      result.topPolygon,
      result.bottomPolygon,
      result.outerPolygon,
      [
        d.dimensions.depth,
        d.dimensions.depth,
        d.dimensions.depth,
        d.dimensions.depth,
      ],
      d.dimensions.hasFlatBottom,
      d.dimensions.anchorWidth,
    );
    return;
  }

  if (isRelavera(d)) {
    const result = calcRelaveraArea(d.dimensions, wastePercent);
    buildPolygonMeshes(
      result.topPolygon,
      result.bottomPolygon,
      result.outerPolygon,
      d.dimensions.vertexHeights,
      d.dimensions.hasFlatBottom,
      d.dimensions.anchorWidth,
    );
  }
}

async function waitForCanvasHost(
  attempts = 20,
): Promise<HTMLDivElement | null> {
  for (let i = 0; i < attempts; i++) {
    await nextTick();
    const host = canvasHost.value;
    if (host && host.clientWidth > 0 && host.clientHeight > 0) {
      return host;
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
  return canvasHost.value;
}

async function mountScene() {
  const d = design.value;
  if (!d) return;

  // Importante: el host solo existe cuando loading === false y design !== null.
  const host = await waitForCanvasHost();
  if (!host) {
    error.value = "No se pudo inicializar la vista 3D.";
    return;
  }

  cleanupScene();
  meshGroup = null;

  if (!(await initializeScene(host)) || !scene.value) {
    error.value = "No se pudo inicializar la vista 3D.";
    return;
  }

  meshGroup = new THREE.Group();
  scene.value.add(meshGroup);

  try {
    buildDesignMeshes(d);
  } catch (e: unknown) {
    error.value =
      e instanceof Error
        ? e.message
        : "No se pudo construir la geometría del diseño.";
  }
}

async function loadAndShow() {
  if (!props.designId) return;
  loading.value = true;
  error.value = "";
  design.value = null;
  cleanupScene();
  meshGroup = null;

  try {
    const loaded = await getById(props.designId);
    design.value = loaded;
    // Quitar loading ANTES de montar, para que canvasHost exista en el DOM.
    loading.value = false;
    await mountScene();
  } catch (e: unknown) {
    loading.value = false;
    error.value =
      e instanceof Error ? e.message : "No se pudo cargar el diseño.";
  }
}

function close() {
  emit("update:modelValue", false);
}

function teardown() {
  cleanupScene();
  meshGroup = null;
  design.value = null;
  error.value = "";
  loading.value = false;
}

watch(
  () => [props.modelValue, props.designId] as const,
  ([open]) => {
    if (open && props.designId) {
      void loadAndShow();
    } else if (!open) {
      teardown();
    }
  },
);
</script>

<style scoped>
.viewer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.viewer-box {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
  width: min(1100px, 100%);
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.viewer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1.35rem 0.75rem;
}

.viewer-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #053f51;
}

.viewer-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 550;
}

.viewer-close {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 8px;
  width: 2rem;
  height: 2rem;
}

.viewer-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.viewer-body {
  padding: 0.5rem 1.35rem 1rem;
  overflow: auto;
  flex: 1;
}

.viewer-state {
  padding: 2.5rem 1rem;
  text-align: center;
  color: #64748b;
}

.viewer-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.9fr);
  gap: 1rem;
  min-height: 420px;
}

.viewer-canvas-wrap {
  position: relative;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #cfe3ee;
  min-height: 420px;
  height: 100%;
}

.viewer-canvas-host {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.canvas-reset-btn {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 2;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
  font-size: 0.8rem;
  font-weight: 650;
  cursor: pointer;
}

.canvas-reset-btn:hover {
  background: #fff;
}

.viewer-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.viewer-section-title {
  margin: 0 0 0.55rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.viewer-note {
  margin: 0 0 0.55rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.viewer-dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.viewer-dl > div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0.55rem;
  border-radius: 8px;
  background: #f8fafc;
}

.viewer-dl dt {
  margin: 0;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 600;
}

.viewer-dl dd {
  margin: 0;
  font-size: 0.85rem;
  color: #0f172a;
  font-weight: 650;
  text-align: right;
}

.preview-total {
  background: rgba(15, 159, 112, 0.08) !important;
}

.preview-total dt,
.preview-total dd {
  color: #0c7a57 !important;
}

.viewer-footer {
  padding: 0 1.35rem 1.25rem;
  display: flex;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 860px) {
  .viewer-layout {
    grid-template-columns: 1fr;
  }

  .viewer-canvas-wrap {
    min-height: 320px;
  }
}
</style>
