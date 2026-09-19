export interface RelaveraEdge {
  length: number;
  interiorAngleDeg: number;
  slopeAngleDeg: number;
}

export interface RelaveraDimensions {
  edges: RelaveraEdge[];
  /** Altura del borde superior en cada vértice (m). Fondo siempre en y=0. */
  vertexHeights: number[];
  anchorWidth: number;
  hasFlatBottom: boolean;
}

export interface RectangularPoolDimensions {
  length: number;
  width: number;
  depth: number;
  /** [largo-A, ancho-B, largo-C, ancho-D] en orden de recorrido del rectángulo. */
  slopeAngles: [number, number, number, number];
  anchorWidth: number;
  hasFlatBottom: boolean;
}

export interface Point2D {
  x: number;
  z: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface DesignAreaBreakdown {
  lateral: number;
  bottomArea: number;
  anchorArea: number;
  subtotal: number;
  wastePercent: number;
  wasteAmount: number;
  total: number;
}

export interface RelaveraAreaResult extends DesignAreaBreakdown {
  topPolygon: Point2D[];
  bottomPolygon: Point2D[];
  outerPolygon: Point2D[];
  adjustmentApplied: boolean;
  adjustmentMeters: number;
}

export interface TopPolygonBuildResult {
  polygon: Point2D[];
  adjustmentApplied: boolean;
  adjustmentMeters: number;
}

type OffsetLine = { point: Point2D; dir: { x: number; z: number } };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function signedTurnDeg(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): number {
  const cross = fromX * toZ - fromZ * toX;
  const dot = fromX * toX + fromZ * toZ;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}

/**
 * Derives a concrete closing edge for the frontend's automatic-close mode.
 *
 * `buildTopPolygon` stores the turn into an edge on that edge, while the turn
 * from the last edge back to the first is stored on edge 0. Consequently an
 * exact close requires deriving the last edge's length/angle and edge 0's
 * closure angle.
 */
export function deriveAutoClosingEdges(
  edges: RelaveraEdge[],
): RelaveraEdge[] {
  if (edges.length < 3) {
    throw new Error("Una relavera necesita al menos 3 lados");
  }

  const lastIndex = edges.length - 1;
  let x = 0;
  let z = 0;
  let headingRad = 0;

  for (let i = 0; i < lastIndex; i++) {
    const edge = edges[i]!;
    x += edge.length * Math.cos(headingRad);
    z += edge.length * Math.sin(headingRad);
    if (i < lastIndex - 1) {
      const nextEdge = edges[i + 1]!;
      headingRad +=
        ((180 - nextEdge.interiorAngleDeg) * Math.PI) / 180;
    }
  }

  const closingX = -x;
  const closingZ = -z;
  const closingLength = Math.hypot(closingX, closingZ);
  if (closingLength < 1e-9) {
    throw new Error(
      "No se puede derivar el último lado porque los lados anteriores ya regresan al punto inicial.",
    );
  }

  const previousX = Math.cos(headingRad);
  const previousZ = Math.sin(headingRad);
  const closingUnitX = closingX / closingLength;
  const closingUnitZ = closingZ / closingLength;
  const turnIntoClosing = signedTurnDeg(
    previousX,
    previousZ,
    closingUnitX,
    closingUnitZ,
  );
  const turnIntoFirst = signedTurnDeg(closingUnitX, closingUnitZ, 1, 0);
  const lastInteriorAngleDeg = 180 - turnIntoClosing;
  const firstInteriorAngleDeg = 180 - turnIntoFirst;

  return edges.map((edge, index) => {
    if (index === 0) {
      return { ...edge, interiorAngleDeg: firstInteriorAngleDeg };
    }
    if (index === lastIndex) {
      return {
        ...edge,
        length: closingLength,
        interiorAngleDeg: lastInteriorAngleDeg,
      };
    }
    return { ...edge };
  });
}

export function buildTopPolygon(
  edges: RelaveraEdge[],
): TopPolygonBuildResult {
  let headingRad = 0;
  let point: Point2D = { x: 0, z: 0 };
  const vertices: Point2D[] = [point];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    const next: Point2D = {
      x: point.x + edge.length * Math.cos(headingRad),
      z: point.z + edge.length * Math.sin(headingRad),
    };
    vertices.push(next);
    point = next;
    const nextEdge = edges[(i + 1) % edges.length]!;
    const turnRad = ((180 - nextEdge.interiorAngleDeg) * Math.PI) / 180;
    headingRad += turnRad;
  }

  const first = vertices[0]!;
  const last = vertices[vertices.length - 1]!;
  const error = {
    x: last.x - first.x,
    z: last.z - first.z,
  };
  const closureGap = Math.hypot(error.x, error.z);
  const perimeter = edges.reduce((sum, e) => sum + e.length, 0);
  const NEGLIGIBLE_TOLERANCE = Math.max(0.05, perimeter * 0.005);
  const ADJUSTABLE_TOLERANCE = perimeter * 0.02;

  if (closureGap <= NEGLIGIBLE_TOLERANCE) {
    vertices.pop();
    return {
      polygon: vertices,
      adjustmentApplied: false,
      adjustmentMeters: 0,
    };
  }

  if (closureGap > ADJUSTABLE_TOLERANCE) {
    throw new Error(
      `Los lados no cierran el polígono (desfase de ${closureGap.toFixed(2)}m). Revisa las longitudes y ángulos.`,
    );
  }

  let cumulative = 0;
  const adjustedVertices: Point2D[] = [vertices[0]!];
  for (let i = 1; i <= edges.length; i++) {
    cumulative += edges[i - 1]!.length;
    const fraction = cumulative / perimeter;
    adjustedVertices.push({
      x: vertices[i]!.x - error.x * fraction,
      z: vertices[i]!.z - error.z * fraction,
    });
  }
  adjustedVertices.pop();

  return {
    polygon: adjustedVertices,
    adjustmentApplied: true,
    adjustmentMeters: closureGap,
  };
}

/** Suma de ángulos de giro (180° − interior) debe ser ≈360° para un polígono simple. */
export function validateRelaveraTurnAngles(edges: RelaveraEdge[]): void {
  const n = edges.length;
  if (n < 3) {
    throw new Error("Una relavera necesita al menos 3 lados");
  }
  const turnSum = edges.reduce(
    (sum, edge) => sum + (180 - edge.interiorAngleDeg),
    0,
  );
  const tolerance = 1.0;
  if (Math.abs(turnSum - 360) > tolerance) {
    throw new Error(
      `La suma de ángulos de giro es ${turnSum.toFixed(1)}°, debe ser aproximadamente 360°. Revisa los ángulos interiores.`,
    );
  }
}

function orientation(a: Point2D, b: Point2D, c: Point2D): number {
  const val = (b.z - a.z) * (c.x - b.x) - (b.x - a.x) * (c.z - b.z);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(a: Point2D, b: Point2D, c: Point2D): boolean {
  return (
    Math.min(a.x, c.x) - 1e-9 <= b.x &&
    b.x <= Math.max(a.x, c.x) + 1e-9 &&
    Math.min(a.z, c.z) - 1e-9 <= b.z &&
    b.z <= Math.max(a.z, c.z) + 1e-9
  );
}

function segmentsIntersect(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D,
): boolean {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;

  return false;
}

/** Detecta intersección entre lados no adyacentes del polígono. */
export function hasPolygonSelfIntersection(pts: Point2D[]): boolean {
  const n = pts.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const a1 = pts[i]!;
    const a2 = pts[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      if (j === (i + 1) % n || i === (j + 1) % n) continue;
      const b1 = pts[j]!;
      const b2 = pts[(j + 1) % n]!;
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export function polygonArea(pts: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    sum += a.x * b.z - b.x * a.z;
  }
  return Math.abs(sum) / 2;
}

/** Signed shoelace sum; negative => clockwise in X-Z plane. */
export function isClockwise(pts: Point2D[]): boolean {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    sum += a.x * b.z - b.x * a.z;
  }
  return sum < 0;
}

function centroid(pts: Point2D[]): Point2D {
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}

export function intersectLines(lineA: OffsetLine, lineB: OffsetLine): Point2D {
  const { point: p1, dir: d1 } = lineA;
  const { point: p2, dir: d2 } = lineB;
  const denom = d1.x * d2.z - d1.z * d2.x;
  if (Math.abs(denom) < 1e-9) {
    return { x: (p1.x + p2.x) / 2, z: (p1.z + p2.z) / 2 };
  }
  const t = ((p2.x - p1.x) * d2.z - (p2.z - p1.z) * d2.x) / denom;
  return { x: p1.x + d1.x * t, z: p1.z + d1.z * t };
}

export function offsetPolygon(
  pts: Point2D[],
  offsets: number[],
  direction: "inward" | "outward",
): Point2D[] {
  const c = centroid(pts);
  const n = pts.length;
  const offsetLines: OffsetLine[] = [];
  for (let i = 0; i < n; i++) {
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const dirX = dx / len;
    const dirZ = dz / len;
    const n1 = { x: -dirZ, z: dirX };
    const n2 = { x: dirZ, z: -dirX };
    const mid = { x: (p1.x + p2.x) / 2, z: (p1.z + p2.z) / 2 };
    const towardCentroid = { x: c.x - mid.x, z: c.z - mid.z };
    const dot1 = n1.x * towardCentroid.x + n1.z * towardCentroid.z;
    const inwardNormal = dot1 > 0 ? n1 : n2;
    const normal =
      direction === "inward"
        ? inwardNormal
        : { x: -inwardNormal.x, z: -inwardNormal.z };
    const offsetDist = offsets[i]!;
    const shiftedP1 = {
      x: p1.x + normal.x * offsetDist,
      z: p1.z + normal.z * offsetDist,
    };
    offsetLines.push({ point: shiftedP1, dir: { x: dirX, z: dirZ } });
  }
  const newVertices: Point2D[] = [];
  for (let i = 0; i < n; i++) {
    const lineA = offsetLines[(i - 1 + n) % n]!;
    const lineB = offsetLines[i]!;
    newVertices.push(intersectLines(lineA, lineB));
  }
  return newVertices;
}

function triangleArea3D(a: Point3D, b: Point3D, c: Point3D): number {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const cross = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  return (
    0.5 *
    Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2)
  );
}

function quadLateralArea(
  top0: Point3D,
  top1: Point3D,
  bot0: Point3D,
  bot1: Point3D,
): number {
  return (
    triangleArea3D(top0, top1, bot0) + triangleArea3D(top1, bot1, bot0)
  );
}

export function centerPolygonsAtTopCentroid(
  topPolygon: Point2D[],
  bottomPolygon: Point2D[],
  outerPolygon: Point2D[],
): Pick<RelaveraAreaResult, "topPolygon" | "bottomPolygon" | "outerPolygon"> {
  const n = topPolygon.length;
  const cx = topPolygon.reduce((s, p) => s + p.x, 0) / n;
  const cz = topPolygon.reduce((s, p) => s + p.z, 0) / n;
  const translate = (pts: Point2D[]) =>
    pts.map((p) => ({ x: p.x - cx, z: p.z - cz }));
  return {
    topPolygon: translate(topPolygon),
    bottomPolygon: translate(bottomPolygon),
    outerPolygon: translate(outerPolygon),
  };
}

export function calcRelaveraArea(
  dims: RelaveraDimensions,
  wastePercent: number,
): RelaveraAreaResult {
  if (!dims.edges || dims.edges.length < 3) {
    throw new Error("Una relavera necesita al menos 3 lados");
  }

  for (const edge of dims.edges) {
    if (edge.slopeAngleDeg <= 0 || edge.slopeAngleDeg >= 90) {
      throw new Error("El ángulo de talud debe estar entre 0 y 90 grados");
    }
  }

  validateRelaveraTurnAngles(dims.edges);

  if (
    !dims.vertexHeights ||
    dims.vertexHeights.length !== dims.edges.length
  ) {
    throw new Error("vertexHeights debe tener un valor por cada vértice");
  }

  const {
    polygon: topPolygonRaw,
    adjustmentApplied,
    adjustmentMeters,
  } = buildTopPolygon(dims.edges);
  if (hasPolygonSelfIntersection(topPolygonRaw)) {
    throw new Error(
      "El polígono se autointersecta. Revisa las longitudes y ángulos.",
    );
  }

  const bottomOffsets = dims.edges.map((e, i) => {
    const h1 = dims.vertexHeights[i]!;
    const h2 = dims.vertexHeights[(i + 1) % dims.edges.length]!;
    const avgHeight = (h1 + h2) / 2;
    const slopeRad = (e.slopeAngleDeg * Math.PI) / 180;
    return avgHeight / Math.tan(slopeRad);
  });
  const bottomPolygonRaw = offsetPolygon(topPolygonRaw, bottomOffsets, "inward");
  const bottomArea = dims.hasFlatBottom ? polygonArea(bottomPolygonRaw) : 0;

  const n = dims.edges.length;
  let lateral = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const top0: Point3D = {
      x: topPolygonRaw[i]!.x,
      y: dims.vertexHeights[i]!,
      z: topPolygonRaw[i]!.z,
    };
    const top1: Point3D = {
      x: topPolygonRaw[j]!.x,
      y: dims.vertexHeights[j]!,
      z: topPolygonRaw[j]!.z,
    };
    const bot0: Point3D = {
      x: bottomPolygonRaw[i]!.x,
      y: 0,
      z: bottomPolygonRaw[i]!.z,
    };
    const bot1: Point3D = {
      x: bottomPolygonRaw[j]!.x,
      y: 0,
      z: bottomPolygonRaw[j]!.z,
    };
    lateral += quadLateralArea(top0, top1, bot0, bot1);
  }

  const anchorOffsets = dims.edges.map(() => dims.anchorWidth);
  const outerPolygonRaw = offsetPolygon(topPolygonRaw, anchorOffsets, "outward");
  const anchorArea =
    polygonArea(outerPolygonRaw) - polygonArea(topPolygonRaw);
  const subtotal = lateral + bottomArea + anchorArea;
  const wasteAmount = subtotal * (wastePercent / 100);
  const total = subtotal + wasteAmount;

  const { topPolygon, bottomPolygon, outerPolygon } = centerPolygonsAtTopCentroid(
    topPolygonRaw,
    bottomPolygonRaw,
    outerPolygonRaw,
  );

  return {
    lateral: round2(lateral),
    bottomArea: round2(bottomArea),
    anchorArea: round2(anchorArea),
    subtotal: round2(subtotal),
    wastePercent,
    wasteAmount: round2(wasteAmount),
    total: round2(total),
    topPolygon,
    bottomPolygon,
    outerPolygon,
    adjustmentApplied,
    adjustmentMeters,
  };
}

export function buildRectangularEdges(
  length: number,
  width: number,
  slopeAngles: [number, number, number, number],
): RelaveraEdge[] {
  return [
    { length, interiorAngleDeg: 90, slopeAngleDeg: slopeAngles[0] },
    { length: width, interiorAngleDeg: 90, slopeAngleDeg: slopeAngles[1] },
    { length, interiorAngleDeg: 90, slopeAngleDeg: slopeAngles[2] },
    { length: width, interiorAngleDeg: 90, slopeAngleDeg: slopeAngles[3] },
  ];
}

export function calcRectangularPoolArea(
  dims: RectangularPoolDimensions,
  wastePercent: number,
): RelaveraAreaResult {
  return calcRelaveraArea(
    {
      edges: buildRectangularEdges(dims.length, dims.width, dims.slopeAngles),
      vertexHeights: [dims.depth, dims.depth, dims.depth, dims.depth],
      anchorWidth: dims.anchorWidth,
      hasFlatBottom: dims.hasFlatBottom,
    },
    wastePercent,
  );
}
