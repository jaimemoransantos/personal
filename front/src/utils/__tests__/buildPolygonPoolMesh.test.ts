import { describe, expect, it } from "vitest";
import { createAnchorGeometry } from "../buildPolygonPoolMesh";

describe("createAnchorGeometry", () => {
  it("follows the per-vertex rim heights around the complete anchor band", () => {
    const topPolygon = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
      { x: 0, z: 10 },
    ];
    const outerPolygon = [
      { x: -1, z: -1 },
      { x: 11, z: -1 },
      { x: 11, z: 11 },
      { x: -1, z: 11 },
    ];
    const vertexHeights = [3, 2, 3, 2];

    const geometry = createAnchorGeometry(
      topPolygon,
      outerPolygon,
      vertexHeights,
    );
    const positions = geometry.getAttribute("position");

    // Four sides × two triangles × three vertices.
    expect(positions.count).toBe(24);

    const expectedYBySide = [
      [3, 2, 3, 2, 2, 3],
      [2, 3, 2, 3, 3, 2],
      [3, 2, 3, 2, 2, 3],
      [2, 3, 2, 3, 3, 2],
    ];
    expectedYBySide.forEach((expectedY, side) => {
      expectedY.forEach((y, vertex) => {
        expect(positions.getY(side * 6 + vertex)).toBe(y);
      });
    });

    expect(geometry.getAttribute("normal").count).toBe(24);
    geometry.dispose();
  });
});
