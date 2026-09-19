import * as THREE from "three";
import type { Point2D } from "./relaveraGeometry";

function xzToShapePoint(p: Point2D): THREE.Vector2 {
  return new THREE.Vector2(p.x, p.z);
}

function makeShape(pts: Point2D[]): THREE.Shape {
  const shape = new THREE.Shape();
  pts.forEach((p, index) => {
    const point = xzToShapePoint(p);
    if (index === 0) shape.moveTo(point.x, point.y);
    else shape.lineTo(point.x, point.y);
  });
  shape.closePath();
  return shape;
}

/** Lay flat ShapeGeometry (XY local) onto world X-Z with consistent (x, z) mapping. */
function layFlatOnWorldXZ(mesh: THREE.Mesh, y: number) {
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
}

export function clearPolygonPoolMeshes(group: THREE.Group): void {
  const toRemove = [...group.children];
  for (const child of toRemove) {
    group.remove(child);
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  }
}

export function createWallGeometry(
  topPolygon: Point2D[],
  bottomPolygon: Point2D[],
  vertexHeights: number[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const n = topPolygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const topA = topPolygon[i]!;
    const topB = topPolygon[j]!;
    const botA = bottomPolygon[i]!;
    const botB = bottomPolygon[j]!;
    const yA = vertexHeights[i] ?? vertexHeights[0] ?? 0;
    const yB = vertexHeights[j] ?? vertexHeights[0] ?? 0;
    const top0 = [topA.x, yA, topA.z];
    const top1 = [topB.x, yB, topB.z];
    const bot0 = [botA.x, 0, botA.z];
    const bot1 = [botB.x, 0, botB.z];
    positions.push(...top0, ...top1, ...bot0, ...top1, ...bot1, ...bot0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function createAnchorGeometry(
  topPolygon: Point2D[],
  outerPolygon: Point2D[],
  vertexHeights: number[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const n = topPolygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const topA = topPolygon[i]!;
    const topB = topPolygon[j]!;
    const outerA = outerPolygon[i]!;
    const outerB = outerPolygon[j]!;
    const yA = vertexHeights[i] ?? vertexHeights[0] ?? 0;
    const yB = vertexHeights[j] ?? vertexHeights[0] ?? 0;
    const top0 = [topA.x, yA, topA.z];
    const top1 = [topB.x, yB, topB.z];
    const outer0 = [outerA.x, yA, outerA.z];
    const outer1 = [outerB.x, yB, outerB.z];
    positions.push(
      ...top0,
      ...top1,
      ...outer0,
      ...top1,
      ...outer1,
      ...outer0,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function computeSceneRadius(outerPolygon: Point2D[]): number {
  if (outerPolygon.length === 0) return 14;
  return Math.max(...outerPolygon.map((p) => Math.hypot(p.x, p.z)));
}

export function computeCameraDistance(
  outerPolygon: Point2D[],
  maxHeight: number,
): number {
  const maxDist = Math.max(
    ...outerPolygon.map((p) => Math.hypot(p.x, p.z)),
    maxHeight,
  );
  return Math.max(10, maxDist * 2.5);
}

export interface BuildPolygonPoolMeshOptions {
  group: THREE.Group;
  topPolygon: Point2D[];
  bottomPolygon: Point2D[];
  outerPolygon: Point2D[];
  vertexHeights: number[];
  hasFlatBottom: boolean;
  anchorWidth: number;
  /** When true, render faded/grey materials to signal outdated geometry. */
  stale?: boolean;
}

export function buildPolygonPoolMeshes(
  options: BuildPolygonPoolMeshOptions,
): void {
  const {
    group,
    topPolygon,
    bottomPolygon,
    outerPolygon,
    vertexHeights,
    hasFlatBottom,
    anchorWidth,
    stale = false,
  } = options;

  clearPolygonPoolMeshes(group);

  const opacity = stale ? 0.4 : 1;
  const wallMat = new THREE.MeshStandardMaterial({
    color: stale ? 0x6b6b70 : 0x2b2b2e,
    roughness: 0.7,
    side: THREE.DoubleSide,
    transparent: stale,
    opacity,
  });
  const bottomMat = new THREE.MeshStandardMaterial({
    color: stale ? 0x5c5c60 : 0x232326,
    roughness: 0.8,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    transparent: stale,
    opacity,
  });
  const anchorMat = new THREE.MeshStandardMaterial({
    color: stale ? 0x9a9590 : 0xb5651d,
    roughness: 0.75,
    side: THREE.DoubleSide,
    transparent: stale,
    opacity,
  });

  const wall = new THREE.Mesh(
    createWallGeometry(topPolygon, bottomPolygon, vertexHeights),
    wallMat,
  );
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  if (hasFlatBottom) {
    const bottom = new THREE.Mesh(
      new THREE.ShapeGeometry(makeShape(bottomPolygon)),
      bottomMat,
    );
    layFlatOnWorldXZ(bottom, 0.01);
    bottom.castShadow = true;
    bottom.receiveShadow = true;
    group.add(bottom);
  }

  if (anchorWidth > 0) {
    const anchor = new THREE.Mesh(
      createAnchorGeometry(topPolygon, outerPolygon, vertexHeights),
      anchorMat,
    );
    anchor.castShadow = true;
    anchor.receiveShadow = true;
    group.add(anchor);
  }
}
