import { describe, expect, it } from "vitest";
import {
  buildRectangularEdges,
  buildTopPolygon,
  calcRectangularPoolArea,
  calcRelaveraArea,
  deriveAutoClosingEdges,
  type Point2D,
} from "../relaveraGeometry";

function polygonCentroid(pts: Point2D[]) {
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}

function expectEqualRadii(pts: Point2D[], precision = 1) {
  const distances = pts.map((p) => Math.hypot(p.x, p.z));
  distances.forEach((d) => expect(d).toBeCloseTo(distances[0]!, precision));
  return distances[0]!;
}

function expectSameAngularDirections(top: Point2D[], other: Point2D[]) {
  for (let i = 0; i < top.length; i++) {
    const topAngle = Math.atan2(top[i]!.z, top[i]!.x);
    const otherAngle = Math.atan2(other[i]!.z, other[i]!.x);
    let diff = Math.abs(topAngle - otherAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    expect(diff).toBeCloseTo(0, 10);
  }
}

const pentagonDims = {
  edges: [
    { length: 100, interiorAngleDeg: 108, slopeAngleDeg: 60 },
    { length: 100, interiorAngleDeg: 108, slopeAngleDeg: 60 },
    { length: 100, interiorAngleDeg: 108, slopeAngleDeg: 60 },
    { length: 100, interiorAngleDeg: 108, slopeAngleDeg: 60 },
    { length: 100, interiorAngleDeg: 108, slopeAngleDeg: 60 },
  ],
  vertexHeights: [12, 12, 12, 12, 12],
  anchorWidth: 3,
  hasFlatBottom: true,
};

describe("calcRelaveraArea regular pentagon polygons", () => {
  const result = calcRelaveraArea(pentagonDims, 10);
  const { topPolygon, bottomPolygon, outerPolygon } = result;

  it("a) centroids topPolygon at origin", () => {
    const topCentroid = polygonCentroid(topPolygon);
    expect(topCentroid.x).toBeCloseTo(0, 1);
    expect(topCentroid.z).toBeCloseTo(0, 1);
  });

  it("b) topPolygon vertices equidistant from origin", () => {
    expectEqualRadii(topPolygon, 1);
  });

  it("c) bottomPolygon vertices equidistant and closer than top", () => {
    const topRadius = expectEqualRadii(topPolygon, 1);
    const bottomRadius = expectEqualRadii(bottomPolygon, 1);
    expect(bottomRadius).toBeLessThan(topRadius!);
  });

  it("d) outerPolygon vertices equidistant and farther than top", () => {
    const topRadius = expectEqualRadii(topPolygon, 1);
    const outerRadius = expectEqualRadii(outerPolygon, 1);
    expect(outerRadius).toBeGreaterThan(topRadius!);
  });

  it("e) bottom and outer share angular direction per vertex index", () => {
    expectSameAngularDirections(topPolygon, bottomPolygon);
    expectSameAngularDirections(topPolygon, outerPolygon);
  });
});

describe("calcRelaveraArea geometry validation", () => {
  it("derives a fourth side that closes exactly without Bowditch adjustment", () => {
    const edges = deriveAutoClosingEdges([
      { length: 20, interiorAngleDeg: 70, slopeAngleDeg: 30 },
      { length: 10, interiorAngleDeg: 110, slopeAngleDeg: 35 },
      { length: 12, interiorAngleDeg: 95, slopeAngleDeg: 40 },
      { length: 1, interiorAngleDeg: 90, slopeAngleDeg: 45 },
    ]);

    let headingRad = 0;
    let x = 0;
    let z = 0;
    for (let i = 0; i < edges.length; i++) {
      x += edges[i]!.length * Math.cos(headingRad);
      z += edges[i]!.length * Math.sin(headingRad);
      const nextEdge = edges[(i + 1) % edges.length]!;
      headingRad +=
        ((180 - nextEdge.interiorAngleDeg) * Math.PI) / 180;
    }

    expect(Math.hypot(x, z)).toBeCloseTo(0, 10);
    const built = buildTopPolygon(edges);
    expect(built.adjustmentApplied).toBe(false);
    expect(built.adjustmentMeters).toBe(0);
    expect(() =>
      calcRelaveraArea(
        {
          edges,
          vertexHeights: [2, 2, 2, 2],
          anchorWidth: 0.5,
          hasFlatBottom: true,
        },
        0,
      ),
    ).not.toThrow();
  });

  it("rejects a star polygon (5 sides at 72°)", () => {
    expect(() =>
      calcRelaveraArea(
        {
          edges: Array.from({ length: 5 }, () => ({
            length: 10,
            interiorAngleDeg: 72,
            slopeAngleDeg: 30,
          })),
          vertexHeights: [2, 2, 2, 2, 2],
          anchorWidth: 0.5,
          hasFlatBottom: true,
        },
        0,
      ),
    ).toThrow(/ángulos de giro/i);
  });

  it("rejects sides that do not close (10,10,20,10 at 90°)", () => {
    expect(() =>
      calcRelaveraArea(
        {
          edges: [
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 20, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
          ],
          vertexHeights: [2, 2, 2, 2],
          anchorWidth: 0.5,
          hasFlatBottom: true,
        },
        0,
      ),
    ).toThrow(/no cierran el polígono/i);
  });

  it("adjusts a small non-negligible closure error with the Bowditch rule", () => {
    const edges = [
      { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
      { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
      { length: 10.3, interiorAngleDeg: 90, slopeAngleDeg: 45 },
      { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
    ];

    const built = buildTopPolygon(edges);

    expect(built.adjustmentApplied).toBe(true);
    expect(built.adjustmentMeters).toBeCloseTo(0.3, 10);
    expect(built.polygon).toHaveLength(4);
    expect(built.polygon[0]!.x).toBeCloseTo(0, 10);
    expect(built.polygon[0]!.z).toBeCloseTo(0, 10);
    expect(built.polygon[1]!.x).toBeCloseTo(10.0744416873, 10);
    expect(built.polygon[1]!.z).toBeCloseTo(0, 10);
    expect(built.polygon[2]!.x).toBeCloseTo(10.1488833747, 10);
    expect(built.polygon[2]!.z).toBeCloseTo(10, 10);
    expect(built.polygon[3]!.x).toBeCloseTo(-0.0744416873, 10);
    expect(built.polygon[3]!.z).toBeCloseTo(10, 10);

    const result = calcRelaveraArea(
      {
        edges,
        vertexHeights: [2, 2, 2, 2],
        anchorWidth: 0.5,
        hasFlatBottom: true,
      },
      0,
    );
    expect(result.adjustmentApplied).toBe(true);
    expect(result.adjustmentMeters).toBeCloseTo(0.3, 10);
  });

  it("rejects a closure error beyond 2% of the perimeter", () => {
    expect(() =>
      calcRelaveraArea(
        {
          edges: [
            { length: 30, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
          ],
          vertexHeights: [2, 2, 2, 2],
          anchorWidth: 0.5,
          hasFlatBottom: true,
        },
        0,
      ),
    ).toThrow(/Los lados no cierran el polígono \(desfase de 20\.00m\)/);
  });
});

describe("calcRectangularPoolArea", () => {
  it("maps rectangular params through calcRelaveraArea", () => {
    const edges = buildRectangularEdges(10, 6, [45, 45, 45, 45]);
    expect(edges).toEqual([
      { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
      { length: 6, interiorAngleDeg: 90, slopeAngleDeg: 45 },
      { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
      { length: 6, interiorAngleDeg: 90, slopeAngleDeg: 45 },
    ]);

    const result = calcRectangularPoolArea(
      {
        length: 10,
        width: 6,
        depth: 2,
        slopeAngles: [45, 45, 45, 45],
        anchorWidth: 0.5,
        hasFlatBottom: true,
      },
      0,
    );

    expect(result.bottomArea).toBeCloseTo(12, 1);
    expect(result.lateral).toBeCloseTo(67.88, 1);
    expect(result.anchorArea).toBeCloseTo(17, 1);
    expect(result.topPolygon).toHaveLength(4);
  });
});
