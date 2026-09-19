import { onUnmounted, shallowRef } from "vue";
import * as THREE from "three";

type Size = { width: number; height: number };

/** Default Y for the environment ground plane (below excavation bottoms at y = 0). */
export const SCENE_GROUND_Y = -0.05;

interface ThreeSceneOptions {
  initialDistance?: number;
  minDistanceFactor?: number;
  maxDistanceFloor?: number;
  cameraFar?: number;
}

export function useThreeScene(options: ThreeSceneOptions = {}) {
  const scene = shallowRef<THREE.Scene | null>(null);
  const camera = shallowRef<THREE.PerspectiveCamera | null>(null);

  let host: HTMLDivElement | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let groundMesh: THREE.Mesh | null = null;
  let gridHelper: THREE.GridHelper | null = null;
  let sceneRadius = 14;
  let fogNearBase = 14 * 4 * 0.6;
  let resizeObserver: ResizeObserver | null = null;
  let sizeWaitObserver: ResizeObserver | null = null;
  let resolveSizeWait: ((size: Size | null) => void) | null = null;
  let animationId = 0;
  let disposed = false;
  let initialized = false;

  const orbit = {
    theta: 0.75,
    phi: 1.05,
    radius: options.initialDistance ?? 14,
  };
  const cameraTarget = new THREE.Vector3();
  const initialCameraTarget = new THREE.Vector3();
  let initialCamDist = orbit.radius;
  let initialCamTheta = orbit.theta;
  let initialCamPhi = orbit.phi;
  let hasInitialCamera = false;
  let minOrbitRadius = Math.max(
    5,
    orbit.radius * (options.minDistanceFactor ?? 0.35),
  );
  let maxOrbitRadius = Math.max(
    options.maxDistanceFloor ?? 40,
    orbit.radius * 2.5,
  );
  let isDragging = false;
  let lastPointer = { x: 0, y: 0 };
  let activePointerId: number | null = null;

  function getCanvasSize(): Size | null {
    if (!host) return null;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (
      width <= 0 ||
      height <= 0 ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      return null;
    }
    return { width, height };
  }

  function updateCamera() {
    if (!camera.value) return;
    const { theta, phi, radius } = orbit;
    camera.value.position.set(
      cameraTarget.x + radius * Math.sin(phi) * Math.cos(theta),
      cameraTarget.y + radius * Math.cos(phi),
      cameraTarget.z + radius * Math.sin(phi) * Math.sin(theta),
    );
    camera.value.lookAt(cameraTarget);
    updateFogForCamera();
  }

  function renderFrame() {
    if (!renderer || !scene.value || !camera.value) return;
    renderer.render(scene.value, camera.value);
  }

  function saveInitialCameraState() {
    initialCamDist = orbit.radius;
    initialCamTheta = orbit.theta;
    initialCamPhi = orbit.phi;
    initialCameraTarget.copy(cameraTarget);
    hasInitialCamera = true;
  }

  function computeGroundRadius(radius: number): number {
    return Math.max(14, radius * 4);
  }

  function updateZoomLimits(radius: number) {
    minOrbitRadius = Math.max(4, radius * 0.5);
    maxOrbitRadius = Math.max(24, radius * 6);
    orbit.radius = Math.max(
      minOrbitRadius,
      Math.min(maxOrbitRadius, orbit.radius),
    );
  }

  function updateGroundGeometry(groundRadius: number) {
    if (!groundMesh) return;
    groundMesh.geometry.dispose();
    groundMesh.geometry = new THREE.CircleGeometry(groundRadius, 64);
    groundMesh.scale.setScalar(1);
  }

  function disposeGridHelper() {
    if (!gridHelper) return;
    scene.value?.remove(gridHelper);
    gridHelper.geometry.dispose();
    const material = gridHelper.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material.dispose();
    }
    gridHelper = null;
  }

  function updateGridHelper(groundRadius: number) {
    if (!scene.value) return;
    disposeGridHelper();
    const size = groundRadius * 2;
    const divisions = Math.min(80, Math.max(10, Math.round(size / 2)));
    gridHelper = new THREE.GridHelper(size, divisions, 0x6b5d4f, 0x7a6548);
    gridHelper.position.y = groundMesh?.position.y ?? SCENE_GROUND_Y;
    scene.value.add(gridHelper);
  }

  /**
   * Applies the scene fog based on the CURRENT camera distance so the model
   * never fades into the sky when zooming out. `far` scales with camDist; `near`
   * keeps the design-size-based feel but is capped below far to stay coherent.
   */
  function updateFogForCamera() {
    if (!scene.value) return;
    const camDist = orbit.radius;
    const far = camDist * 2.5;
    const near = Math.min(fogNearBase, camDist * 0.8);
    if (scene.value.fog instanceof THREE.Fog) {
      scene.value.fog.near = near;
      scene.value.fog.far = far;
    } else {
      scene.value.fog = new THREE.Fog(0xcfe3ee, near, far);
    }
  }

  function setSceneScale(radius: number) {
    if (!Number.isFinite(radius) || radius <= 0) return;
    sceneRadius = radius;
    const groundRadius = computeGroundRadius(radius);
    updateZoomLimits(radius);
    updateGroundGeometry(groundRadius);
    updateGridHelper(groundRadius);
    fogNearBase = groundRadius * 0.6;
    updateCamera();
  }

  function setCameraDistance(distance: number) {
    if (!Number.isFinite(distance) || distance <= 0) return;
    orbit.radius = Math.max(
      minOrbitRadius,
      Math.min(maxOrbitRadius, distance),
    );
    updateCamera();
    saveInitialCameraState();
  }

  function frameCamera(targetY: number) {
    if (!Number.isFinite(targetY)) return;
    cameraTarget.set(0, targetY, 0);
    updateCamera();
    saveInitialCameraState();
  }

  function resetCamera() {
    if (!hasInitialCamera) return;
    orbit.radius = initialCamDist;
    orbit.theta = initialCamTheta;
    orbit.phi = initialCamPhi;
    cameraTarget.copy(initialCameraTarget);
    updateCamera();
    renderFrame();
  }

  function setGroundTransform(y: number) {
    if (!groundMesh) return;
    groundMesh.position.set(0, y, 0);
    if (gridHelper) {
      gridHelper.position.y = y;
    }
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    orbit.radius = Math.max(
      minOrbitRadius,
      Math.min(maxOrbitRadius, orbit.radius * (1 + event.deltaY * 0.001)),
    );
    updateCamera();
    renderFrame();
  }

  function onPointerDown(event: PointerEvent) {
    if (!host) return;
    isDragging = true;
    activePointerId = event.pointerId;
    lastPointer = { x: event.clientX, y: event.clientY };
    host.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!isDragging || activePointerId !== event.pointerId) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };
    orbit.theta -= dx * 0.008;
    orbit.phi = Math.max(
      0.25,
      Math.min(Math.PI - 0.15, orbit.phi + dy * 0.008),
    );
    updateCamera();
    renderFrame();
  }

  function onPointerUp(event: PointerEvent) {
    if (activePointerId !== event.pointerId) return;
    isDragging = false;
    activePointerId = null;
    if (host?.hasPointerCapture(event.pointerId)) {
      host.releasePointerCapture(event.pointerId);
    }
  }

  function bindControls() {
    if (!host) return;
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);
    host.addEventListener("wheel", onWheel, { passive: false });
  }

  function unbindControls() {
    if (!host) return;
    host.removeEventListener("pointerdown", onPointerDown);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerup", onPointerUp);
    host.removeEventListener("pointercancel", onPointerUp);
    host.removeEventListener("wheel", onWheel);
  }

  function onResize() {
    if (!initialized || !renderer || !camera.value) return;
    const size = getCanvasSize();
    if (!size) return;
    const aspect = size.width / size.height;
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    camera.value.aspect = aspect;
    camera.value.updateProjectionMatrix();
    renderer.setSize(size.width, size.height, false);
    updateCamera();
    renderFrame();
  }

  function waitForNextFrames(count = 2): Promise<void> {
    return new Promise((resolve) => {
      let remaining = count;
      const step = () => {
        if (disposed) {
          resolve();
          return;
        }
        remaining -= 1;
        if (remaining <= 0) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function waitForNonZeroSize(): Promise<Size | null> {
    return new Promise((resolve) => {
      const existing = getCanvasSize();
      if (existing || !host || disposed) {
        resolve(existing);
        return;
      }

      resolveSizeWait = resolve;
      sizeWaitObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (
            width > 0 &&
            height > 0 &&
            Number.isFinite(width) &&
            Number.isFinite(height)
          ) {
            sizeWaitObserver?.disconnect();
            sizeWaitObserver = null;
            resolveSizeWait = null;
            resolve({ width, height });
            return;
          }
        }
      });
      sizeWaitObserver.observe(host);
    });
  }

  function styleCanvas(canvas: HTMLCanvasElement) {
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
  }

  async function initialize(container: HTMLDivElement): Promise<boolean> {
    host = container;
    disposed = false;
    await waitForNextFrames();
    let size = getCanvasSize();
    if (!size) size = await waitForNonZeroSize();
    if (!size || disposed || !host) return false;

    const aspect = size.width / size.height;
    if (!Number.isFinite(aspect) || aspect <= 0) return false;

    const nextScene = new THREE.Scene();
    nextScene.background = new THREE.Color(0xcfe3ee);
    scene.value = nextScene;

    camera.value = new THREE.PerspectiveCamera(
      45,
      aspect,
      0.1,
      options.cameraFar ?? 800,
    );

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size.width, size.height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    styleCanvas(renderer.domElement);
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(10, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    sun.shadow.bias = -0.0005;
    nextScene.add(ambient, sun);

    groundMesh = new THREE.Mesh(
      new THREE.CircleGeometry(computeGroundRadius(sceneRadius), 64),
      new THREE.MeshStandardMaterial({
        color: 0x8a6f4d,
        roughness: 1,
      }),
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = SCENE_GROUND_Y;
    groundMesh.receiveShadow = true;
    nextScene.add(groundMesh);
    updateGridHelper(computeGroundRadius(sceneRadius));
    fogNearBase = computeGroundRadius(sceneRadius) * 0.6;
    updateFogForCamera();

    bindControls();
    initialized = true;
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);
    updateCamera();

    const tick = () => {
      animationId = requestAnimationFrame(tick);
      renderFrame();
    };
    tick();
    return true;
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    initialized = false;
    cancelAnimationFrame(animationId);
    unbindControls();
    resizeObserver?.disconnect();
    sizeWaitObserver?.disconnect();
    resolveSizeWait?.(null);
    resizeObserver = null;
    sizeWaitObserver = null;
    resolveSizeWait = null;

    disposeGridHelper();
    scene.value?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });

    renderer?.dispose();
    renderer?.domElement.remove();
    renderer = null;
    groundMesh = null;
    scene.value = null;
    camera.value = null;
    host = null;
  }

  onUnmounted(cleanup);

  return {
    scene,
    camera,
    initialize,
    cleanup,
    setCameraDistance,
    frameCamera,
    resetCamera,
    setSceneScale,
    setGroundTransform,
  };
}
