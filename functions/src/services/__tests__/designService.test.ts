import {
  buildTopPolygon,
  calcRectangularPoolArea,
  calcRelaveraArea,
  hasPolygonSelfIntersection,
  validateRelaveraTurnAngles,
} from "../designService";
import { ApiError } from "../../utils/errors";

describe("calcRelaveraArea", () => {
  it("calculates area for a 10×10 square relavera with 45° slopes", () => {
    const dims = {
      edges: [
        { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
        { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
        { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
        { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
      ],
      vertexHeights: [2, 2, 2, 2],
      anchorWidth: 0.5,
      hasFlatBottom: true,
    };
    const result = calcRelaveraArea(dims, 10);

    expect(result.bottomArea).toBeCloseTo(36.0, 1);
    expect(result.lateral).toBeCloseTo(90.51, 1);
    expect(result.anchorArea).toBeCloseTo(21.0, 1);
    expect(result.subtotal).toBeCloseTo(147.51, 1);
    expect(result.wasteAmount).toBeCloseTo(14.75, 1);
    expect(result.total).toBeCloseTo(162.26, 1);
    expect(result.adjustmentApplied).toBe(false);
    expect(result.adjustmentMeters).toBe(0);
  });

  it("accepts a regular pentagon", () => {
    const edges = Array.from({ length: 5 }, () => ({
      length: 100,
      interiorAngleDeg: 108,
      slopeAngleDeg: 30,
    }));
    expect(() =>
      calcRelaveraArea(
        {
          edges,
          vertexHeights: [5, 5, 5, 5, 5],
          anchorWidth: 1,
          hasFlatBottom: true,
        },
        0,
      ),
    ).not.toThrow();
  });
});

describe("calcRectangularPoolArea", () => {
  it("maps 10×6m rectangular pool params through calcRelaveraArea", () => {
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
    expect(result.subtotal).toBeCloseTo(96.88, 1);
    expect(result.total).toBeCloseTo(96.88, 1);
    expect(result.topPolygon).toHaveLength(4);
    expect(result.bottomPolygon).toHaveLength(4);
    expect(result.outerPolygon).toHaveLength(4);
  });
});

describe("validateRelaveraTurnAngles", () => {
  it("rejects when turning angles do not sum to 360°", () => {
    expect(() =>
      validateRelaveraTurnAngles([
        { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
        { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
        { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
        { length: 10, interiorAngleDeg: 80, slopeAngleDeg: 45 },
      ]),
    ).toThrow(ApiError);
  });
});

describe("hasPolygonSelfIntersection", () => {
  it("detects a bowtie polygon", () => {
    const bowtie = [
      { x: 0, z: 0 },
      { x: 4, z: 4 },
      { x: 4, z: 0 },
      { x: 0, z: 4 },
    ];
    expect(hasPolygonSelfIntersection(bowtie)).toBe(true);
  });

  it("does not flag a simple square", () => {
    const square = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
    ];
    expect(hasPolygonSelfIntersection(square)).toBe(false);
  });
});

describe("calcRelaveraArea geometry validation", () => {
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
    expect(built.polygon[0].x).toBeCloseTo(0, 10);
    expect(built.polygon[0].z).toBeCloseTo(0, 10);
    expect(built.polygon[1].x).toBeCloseTo(10.0744416873, 10);
    expect(built.polygon[1].z).toBeCloseTo(0, 10);
    expect(built.polygon[2].x).toBeCloseTo(10.1488833747, 10);
    expect(built.polygon[2].z).toBeCloseTo(10, 10);
    expect(built.polygon[3].x).toBeCloseTo(-0.0744416873, 10);
    expect(built.polygon[3].z).toBeCloseTo(10, 10);

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
    expect(result.topPolygon).toEqual(built.polygon);
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

  it("rejects relavera when turn angles are invalid", () => {
    expect(() =>
      calcRelaveraArea(
        {
          edges: [
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 90, slopeAngleDeg: 45 },
            { length: 10, interiorAngleDeg: 80, slopeAngleDeg: 45 },
          ],
          vertexHeights: [2, 2, 2, 2],
          anchorWidth: 0.5,
          hasFlatBottom: true,
        },
        0,
      ),
    ).toThrow(/ángulos de giro/i);
  });
});
