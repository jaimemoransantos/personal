import {
  isInventoryProduct,
  resolveProductKind,
  resolveProductType,
} from "../../types/product";

describe("product kind/type helpers", () => {
  it("treats missing kind as producto", () => {
    expect(resolveProductKind({})).toBe("producto");
    expect(resolveProductKind({ kind: "servicio" })).toBe("servicio");
    expect(isInventoryProduct({ kind: "servicio" })).toBe(false);
    expect(isInventoryProduct({})).toBe(true);
  });

  it("treats missing type as roll", () => {
    expect(resolveProductType({})).toBe("roll");
    expect(resolveProductType({ type: "unit" })).toBe("unit");
  });
});
