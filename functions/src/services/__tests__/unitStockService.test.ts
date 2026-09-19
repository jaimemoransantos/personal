const mockRunTransaction = jest.fn();
const mockCollection = jest.fn();

jest.mock("../../config/firebase-admin", () => ({
  db: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

const mockProductGetById = jest.fn();
const mockProductListByType = jest.fn();
jest.mock("../productService", () => ({
  ProductService: {
    getById: (...args: unknown[]) => mockProductGetById(...args),
    listByType: (...args: unknown[]) => mockProductListByType(...args),
  },
  presentProduct: (p: unknown) => p,
  stripUnitCost: (p: Record<string, unknown>) => {
    const { unitCost: _, ...rest } = p;
    return rest;
  },
}));

const mockProjectGetById = jest.fn();
const mockPruneOrphanedInventoryCode = jest.fn();
jest.mock("../projectService", () => ({
  ProjectService: {
    getById: (...args: unknown[]) => mockProjectGetById(...args),
    pruneOrphanedInventoryCode: (...args: unknown[]) =>
      mockPruneOrphanedInventoryCode(...args),
  },
}));

const mockSyncProjectInventoryCost = jest.fn();
jest.mock("../rollService", () => ({
  RollService: {
    syncProjectInventoryCost: (...args: unknown[]) =>
      mockSyncProjectInventoryCost(...args),
  },
}));

import { UnitStockService } from "../unitStockService";

function makeDocSnap(
  exists: boolean,
  data?: Record<string, unknown>,
  id = "prod-1",
) {
  return {
    exists,
    id,
    data: () => data,
  };
}

const quotationWithCode = (code: string) => ({
  quoteNumber: "Q-1",
  client: {},
  items: [{ id: "1", code, name: "Item", subtitle: "", quantity: 1, price: 1 }],
  amount: 1,
  subtotal: 1,
  discount: 0,
});

describe("UnitStockService.stockIn", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds quantity and creates an 'in' movement", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Embedding Channel",
      code: "EC-1",
      type: "unit",
      stockQuantity: 10,
      unitCost: 5,
    });

    const update = jest.fn();
    const set = jest.fn();
    const productRef = { id: "prod-1", update };
    const movementRef = { id: "mov-1", set };

    mockCollection.mockImplementation((name: string) => {
      if (name === "products") {
        return { doc: () => productRef };
      }
      if (name === "unitStockMovements") {
        return { doc: () => movementRef };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        get: async () =>
          makeDocSnap(true, {
            organizationId: orgId,
            name: "Embedding Channel",
            type: "unit",
            stockQuantity: 10,
          }),
        update,
        set,
      };
      return fn(tx);
    });

    const result = await UnitStockService.stockIn(
      orgId,
      { productId: "prod-1", quantity: 3 },
      "user-1",
    );

    expect(result.product.stockQuantity).toBe(13);
    expect(result.movement.type).toBe("in");
    expect(result.movement.quantity).toBe(3);
    expect(result.movement.projectId).toBeUndefined();
    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalled();
  });

  it("rejects non-unit products", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Geomembrana",
      type: "roll",
    });

    await expect(
      UnitStockService.stockIn(orgId, { productId: "prod-1", quantity: 1 }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects services", async () => {
    mockProductGetById.mockResolvedValue({
      id: "svc-1",
      organizationId: orgId,
      name: "Levantamiento topográfico",
      kind: "servicio",
      type: "unit",
    });

    await expect(
      UnitStockService.stockIn(orgId, { productId: "svc-1", quantity: 1 }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Los servicios no se registran en inventario",
    });
  });
});

describe("UnitStockService.stockOut", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("subtracts quantity when stock is enough", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Embedding Channel",
      code: "EC-1",
      type: "unit",
      stockQuantity: 10,
    });
    mockProjectGetById.mockResolvedValue({
      id: "proj-1",
      name: "Proyecto A",
      status: "planificado",
      quotationSnapshot: quotationWithCode("EC-1"),
    });

    const update = jest.fn();
    const set = jest.fn();
    const productRef = { id: "prod-1", update };
    const movementRef = { id: "mov-2", set };

    mockCollection.mockImplementation((name: string) => {
      if (name === "products") return { doc: () => productRef };
      if (name === "unitStockMovements") return { doc: () => movementRef };
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        get: async () =>
          makeDocSnap(true, {
            organizationId: orgId,
            name: "Embedding Channel",
            type: "unit",
            stockQuantity: 10,
            unitCost: null,
          }),
        update,
        set,
      };
      return fn(tx);
    });

    const result = await UnitStockService.stockOut(
      orgId,
      { productId: "prod-1", quantity: 4, projectId: "proj-1" },
      "user-1",
    );

    expect(result.product.stockQuantity).toBe(6);
    expect(result.movement.type).toBe("out");
    expect(result.movement.projectId).toBe("proj-1");
    expect(result.movement.projectName).toBe("Proyecto A");
    expect(result.movement.unitCost).toBeNull();
    expect(result.movement.totalCost).toBeNull();
    expect(mockSyncProjectInventoryCost).not.toHaveBeenCalled();
  });

  it("snapshots cost and syncs inventory rubro when product has unitCost", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Embedding Channel",
      code: "EC-1",
      type: "unit",
      stockQuantity: 10,
      unitCost: 12,
    });
    mockProjectGetById.mockResolvedValue({
      id: "proj-1",
      name: "Proyecto A",
      status: "instalando",
      quotationSnapshot: quotationWithCode("EC-1"),
    });
    mockSyncProjectInventoryCost.mockResolvedValue(undefined);

    const update = jest.fn();
    const set = jest.fn();

    mockCollection.mockImplementation((name: string) => {
      if (name === "products") return { doc: () => ({ id: "prod-1", update }) };
      if (name === "unitStockMovements") return { doc: () => ({ id: "mov-3", set }) };
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        get: async () =>
          makeDocSnap(true, {
            organizationId: orgId,
            name: "Embedding Channel",
            type: "unit",
            stockQuantity: 10,
            unitCost: 12,
          }),
        update,
        set,
      };
      return fn(tx);
    });

    const result = await UnitStockService.stockOut(orgId, {
      productId: "prod-1",
      quantity: 2,
      projectId: "proj-1",
    });

    expect(result.movement.unitCost).toBe(12);
    expect(result.movement.totalCost).toBe(24);
    expect(mockSyncProjectInventoryCost).toHaveBeenCalledWith(orgId, "proj-1");
  });

  it("rejects when product is not in quotation", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "EC-1",
      type: "unit",
      stockQuantity: 10,
    });
    mockProjectGetById.mockResolvedValue({
      id: "proj-1",
      name: "Proyecto A",
      status: "planificado",
      quotationSnapshot: quotationWithCode("OTHER"),
    });

    await expect(
      UnitStockService.stockOut(orgId, {
        productId: "prod-1",
        quantity: 1,
        projectId: "proj-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Este producto no está en la cotización de este proyecto",
    });
  });

  it("rejects when project is liquidado or cerrado", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "EC-1",
      type: "unit",
      stockQuantity: 10,
    });
    mockProjectGetById.mockResolvedValue({
      id: "proj-1",
      name: "Proyecto A",
      status: "cerrado",
      quotationSnapshot: quotationWithCode("EC-1"),
    });

    await expect(
      UnitStockService.stockOut(orgId, {
        productId: "prod-1",
        quantity: 1,
        projectId: "proj-1",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        "No se puede retirar material hacia un proyecto liquidado o cerrado.",
    });
  });

  it("rejects when stock is insufficient", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Embedding Channel",
      code: "EC-1",
      type: "unit",
      stockQuantity: 2,
    });
    mockProjectGetById.mockResolvedValue({
      id: "proj-1",
      name: "Proyecto A",
      status: "planificado",
      quotationSnapshot: quotationWithCode("EC-1"),
    });

    mockCollection.mockImplementation((name: string) => {
      if (name === "products") return { doc: () => ({ id: "prod-1" }) };
      if (name === "unitStockMovements") return { doc: () => ({ id: "mov" }) };
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(async (fn: Function) => {
      const tx = {
        get: async () =>
          makeDocSnap(true, {
            organizationId: orgId,
            name: "Embedding Channel",
            type: "unit",
            stockQuantity: 2,
          }),
        update: jest.fn(),
        set: jest.fn(),
      };
      return fn(tx);
    });

    await expect(
      UnitStockService.stockOut(orgId, {
        productId: "prod-1",
        quantity: 5,
        projectId: "proj-1",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("UnitStockService.getStock", () => {
  it("omits unitCost when includeCost is false", async () => {
    mockProductListByType.mockResolvedValue([
      {
        id: "prod-1",
        name: "Embedding Channel",
        code: "EC-1",
        type: "unit",
        stockQuantity: 7,
        unitCost: 12.5,
      },
    ]);

    const withoutCost = await UnitStockService.getStock("org-1", false);
    expect(withoutCost[0].unitCost).toBeUndefined();
    expect(withoutCost[0].stockQuantity).toBe(7);

    const withCost = await UnitStockService.getStock("org-1", true);
    expect(withCost[0].unitCost).toBe(12.5);
  });
});

describe("UnitStockService.reverseOutMovement", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
    mockPruneOrphanedInventoryCode.mockResolvedValue(null);
    mockSyncProjectInventoryCost.mockResolvedValue(undefined);
  });

  it("restores stockQuantity, marks reversed, and syncs cost", async () => {
    const movementData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Embedding Channel",
      type: "out",
      quantity: 3,
      projectId: "proj-1",
      unitCost: 5,
      totalCost: 15,
      reversed: false,
    };
    const productData = {
      organizationId: orgId,
      name: "Embedding Channel",
      code: "EC-1",
      type: "unit",
      stockQuantity: 7,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "EC-1",
      name: "Embedding Channel",
    });

    const movementRef = { id: "mov-1" };
    const productRef = { id: "prod-1" };
    const tx = {
      get: jest
        .fn()
        .mockResolvedValueOnce(makeDocSnap(true, movementData, "mov-1"))
        .mockResolvedValueOnce(makeDocSnap(true, productData, "prod-1")),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "unitStockMovements") {
        return {
          doc: () => ({
            ...movementRef,
            get: async () => makeDocSnap(true, movementData, "mov-1"),
          }),
        };
      }
      if (name === "products") {
        return { doc: () => productRef };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    const result = await UnitStockService.reverseOutMovement(
      orgId,
      "mov-1",
      "admin-1",
    );

    expect(result.reversed).toBe(true);
    expect(result.reversedBy).toBe("admin-1");
    expect(tx.update).toHaveBeenCalledWith(
      productRef,
      expect.objectContaining({ stockQuantity: 10 }),
    );
    expect(tx.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mov-1" }),
      expect.objectContaining({
        reversed: true,
        reversedBy: "admin-1",
      }),
    );
    expect(mockSyncProjectInventoryCost).toHaveBeenCalledWith(orgId, "proj-1");
    expect(mockPruneOrphanedInventoryCode).toHaveBeenCalledWith(
      orgId,
      "proj-1",
      "EC-1",
    );
  });

  it("rejects when already reversed", async () => {
    mockCollection.mockImplementation((name: string) => {
      if (name === "unitStockMovements") {
        return {
          doc: () => ({
            get: async () =>
              makeDocSnap(
                true,
                {
                  organizationId: orgId,
                  productId: "prod-1",
                  type: "out",
                  quantity: 1,
                  projectId: "proj-1",
                  reversed: true,
                },
                "mov-1",
              ),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    await expect(
      UnitStockService.reverseOutMovement(orgId, "mov-1", "admin-1"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
