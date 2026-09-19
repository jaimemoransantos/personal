const mockRunTransaction = jest.fn();
const mockCollection = jest.fn();
const mockBatch = jest.fn();

jest.mock("../../config/firebase-admin", () => ({
  db: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
    batch: (...args: unknown[]) => mockBatch(...args),
  },
}));

const mockProductGetById = jest.fn();
const mockProductListByType = jest.fn();
const mockProductList = jest.fn();
jest.mock("../productService", () => ({
  ProductService: {
    getById: (...args: unknown[]) => mockProductGetById(...args),
    listByType: (...args: unknown[]) => mockProductListByType(...args),
    list: (...args: unknown[]) => mockProductList(...args),
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

const mockSyncInventoryMaterialsCost = jest.fn();
jest.mock("../costItemService", () => ({
  CostItemService: {
    syncInventoryMaterialsCost: (...args: unknown[]) =>
      mockSyncInventoryMaterialsCost(...args),
  },
}));

import { RollService } from "../rollService";

const quotationWithCode = (code: string) => ({
  quoteNumber: "Q-1",
  client: {},
  items: [{ id: "1", code, name: "Item", subtitle: "", quantity: 1, price: 1 }],
  amount: 1,
  subtotal: 1,
  discount: 0,
});

function makeDocSnap(
  exists: boolean,
  data?: Record<string, unknown>,
  id = "roll-1",
) {
  return {
    exists,
    id,
    data: () => data,
  };
}

function makeQuerySnapshot(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
) {
  return {
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
      exists: true,
    })),
  };
}

describe("RollService.registerRoll", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a roll successfully and computes totalArea", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Geomembrana HDPE",
      code: "GM-1",
      subtitle: "",
      price: 10,
    });

    const set = jest.fn().mockResolvedValue(undefined);
    const rollDocRef = { id: "new-roll", set };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          doc: () => rollDocRef,
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () => makeQuerySnapshot([]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    const result = await RollService.registerRoll(orgId, {
      productId: "prod-1",
      barcodeValue: "BC-001",
      rollLength: 210,
      rollWidth: 7.5,
      batchNumber: "L-1",
    });

    expect(result.id).toBe("new-roll");
    expect(result.barcodeValue).toBe("BC-001");
    expect(result.rollLength).toBe(210);
    expect(result.rollWidth).toBe(7.5);
    expect(result.totalArea).toBe(1575);
    expect(result.remainingArea).toBe(1575);
    expect(result.productName).toBe("Geomembrana HDPE");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        rollLength: 210,
        rollWidth: 7.5,
        totalArea: 1575,
        remainingArea: 1575,
        unitCost: null,
        receivedAt: expect.anything(),
      }),
    );
  });

  it("rejects when barcodeValue already exists", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Geomembrana HDPE",
      code: "GM-1",
      subtitle: "",
      price: 10,
    });

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () =>
                  makeQuerySnapshot([
                    {
                      id: "existing-roll",
                      data: {
                        organizationId: orgId,
                        barcodeValue: "BC-001",
                        remainingArea: 50,
                      },
                    },
                  ]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    await expect(
      RollService.registerRoll(orgId, {
        productId: "prod-1",
        barcodeValue: "BC-001",
        rollLength: 100,
        rollWidth: 7.5,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Este código de barras ya está registrado",
    });
  });

  it("rejects when product is a service", async () => {
    mockProductGetById.mockResolvedValue({
      id: "svc-1",
      organizationId: orgId,
      name: "Dirección técnica",
      code: "SRV-1",
      kind: "servicio",
    });

    await expect(
      RollService.registerRoll(orgId, {
        productId: "svc-1",
        barcodeValue: "BC-SVC",
        rollLength: 10,
        rollWidth: 5,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Los servicios no se registran en inventario",
    });
  });

  it("rejects when rollLength or rollWidth is not positive", async () => {
    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Geomembrana HDPE",
      code: "GM-1",
      subtitle: "",
      price: 10,
    });

    await expect(
      RollService.registerRoll(orgId, {
        productId: "prod-1",
        barcodeValue: "BC-001",
        rollLength: 0,
        rollWidth: 7.5,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "rollLength debe ser un número mayor a 0",
    });

    await expect(
      RollService.registerRoll(orgId, {
        productId: "prod-1",
        barcodeValue: "BC-001",
        rollLength: 100,
        rollWidth: -1,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "rollWidth debe ser un número mayor a 0",
    });
  });
});

describe("RollService.withdraw", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("withdraws area, updates roll, and creates withdrawal", async () => {
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Geomembrana HDPE",
      barcodeValue: "BC-001",
      rollLength: 210,
      rollWidth: 7.5,
      totalArea: 1575,
      remainingArea: 800,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Geomembrana HDPE",
      code: "GM-1",
    });
    mockProjectGetById.mockResolvedValue({
      id: "project-1",
      organizationId: orgId,
      name: "Proyecto Lago",
      status: "planificado",
      quotationSnapshot: quotationWithCode("GM-1"),
    });

    const rollRef = { id: "roll-1" };
    const withdrawalRef = { id: "wd-1" };
    const tx = {
      get: jest.fn().mockResolvedValue(makeDocSnap(true, rollData, "roll-1")),
      update: jest.fn(),
      set: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          doc: (id?: string) => (id ? rollRef : rollRef),
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () =>
                  makeQuerySnapshot([{ id: "roll-1", data: rollData }]),
              }),
            }),
          }),
        };
      }
      if (name === "rollWithdrawals") {
        return {
          doc: () => withdrawalRef,
        };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    const result = await RollService.withdraw(
      orgId,
      {
        barcodeValue: "BC-001",
        projectId: "project-1",
        withdrawnArea: 300,
      },
      "user-1",
    );

    expect(result.id).toBe("wd-1");
    expect(result.withdrawnArea).toBe(300);
    expect(result.projectName).toBe("Proyecto Lago");
    expect(result.rollId).toBe("roll-1");
    expect(tx.update).toHaveBeenCalledWith(
      rollRef,
      expect.objectContaining({ remainingArea: 500 }),
    );
    expect(tx.set).toHaveBeenCalledWith(
      withdrawalRef,
      expect.objectContaining({
        organizationId: orgId,
        rollId: "roll-1",
        productId: "prod-1",
        projectId: "project-1",
        projectName: "Proyecto Lago",
        withdrawnArea: 300,
        unitCost: null,
        totalCost: null,
        reversed: false,
        performedBy: "user-1",
      }),
    );
  });

  it("snapshots unitCost and totalCost when roll already has cost", async () => {
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Geomembrana HDPE",
      barcodeValue: "BC-001",
      rollLength: 210,
      rollWidth: 7.5,
      totalArea: 1575,
      remainingArea: 800,
      unitCost: 2.5,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      organizationId: orgId,
      name: "Geomembrana HDPE",
      code: "GM-1",
    });
    mockProjectGetById.mockResolvedValue({
      id: "project-1",
      organizationId: orgId,
      name: "Proyecto Lago",
      status: "instalando",
      quotationSnapshot: quotationWithCode("GM-1"),
    });
    mockSyncInventoryMaterialsCost.mockResolvedValue({});

    const rollRef = { id: "roll-1" };
    const withdrawalRef = { id: "wd-2" };
    const tx = {
      get: jest.fn().mockResolvedValue(makeDocSnap(true, rollData, "roll-1")),
      update: jest.fn(),
      set: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          doc: () => rollRef,
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () =>
                  makeQuerySnapshot([{ id: "roll-1", data: rollData }]),
              }),
            }),
          }),
        };
      }
      if (name === "rollWithdrawals") {
        return {
          doc: () => withdrawalRef,
          where: () => ({
            where: () => ({
              get: async () =>
                makeQuerySnapshot([
                  {
                    id: "wd-2",
                    data: {
                      organizationId: orgId,
                      projectId: "project-1",
                      totalCost: 750,
                    },
                  },
                ]),
            }),
          }),
        };
      }
      if (name === "unitStockMovements") {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => makeQuerySnapshot([]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    const result = await RollService.withdraw(orgId, {
      barcodeValue: "BC-001",
      projectId: "project-1",
      withdrawnArea: 300,
    });

    expect(result.unitCost).toBe(2.5);
    expect(result.totalCost).toBe(750);
    expect(mockSyncInventoryMaterialsCost).toHaveBeenCalledWith(
      orgId,
      "project-1",
      750,
    );
  });

  it("rejects when product is not in the project quotation", async () => {
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Geomembrana HDPE",
      barcodeValue: "BC-001",
      remainingArea: 100,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "GM-1",
      name: "Geomembrana HDPE",
    });
    mockProjectGetById.mockResolvedValue({
      id: "project-1",
      name: "Proyecto Lago",
      status: "planificado",
      quotationSnapshot: quotationWithCode("OTHER"),
    });

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () =>
                  makeQuerySnapshot([{ id: "roll-1", data: rollData }]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    await expect(
      RollService.withdraw(orgId, {
        barcodeValue: "BC-001",
        projectId: "project-1",
        withdrawnArea: 10,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Este producto no está en la cotización de este proyecto",
    });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("rejects when project is liquidado or cerrado", async () => {
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Geomembrana HDPE",
      barcodeValue: "BC-001",
      remainingArea: 100,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "GM-1",
      name: "Geomembrana HDPE",
    });
    mockProjectGetById.mockResolvedValue({
      id: "project-1",
      name: "Proyecto Lago",
      status: "liquidado",
      quotationSnapshot: quotationWithCode("GM-1"),
    });

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () =>
                  makeQuerySnapshot([{ id: "roll-1", data: rollData }]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    await expect(
      RollService.withdraw(orgId, {
        barcodeValue: "BC-001",
        projectId: "project-1",
        withdrawnArea: 10,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        "No se puede retirar material hacia un proyecto liquidado o cerrado.",
    });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("rejects when withdrawnArea exceeds remainingArea", async () => {
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Geomembrana HDPE",
      barcodeValue: "BC-001",
      rollLength: 210,
      rollWidth: 7.5,
      totalArea: 1575,
      remainingArea: 20,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "GM-1",
      name: "Geomembrana HDPE",
    });
    mockProjectGetById.mockResolvedValue({
      id: "project-1",
      organizationId: orgId,
      name: "Proyecto Lago",
      status: "planificado",
      quotationSnapshot: quotationWithCode("GM-1"),
    });

    const rollRef = { id: "roll-1" };
    const withdrawalRef = { id: "wd-1" };
    const tx = {
      get: jest.fn().mockResolvedValue(makeDocSnap(true, rollData, "roll-1")),
      update: jest.fn(),
      set: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          doc: () => rollRef,
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () =>
                  makeQuerySnapshot([{ id: "roll-1", data: rollData }]),
              }),
            }),
          }),
        };
      }
      if (name === "rollWithdrawals") {
        return { doc: () => withdrawalRef };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    await expect(
      RollService.withdraw(orgId, {
        barcodeValue: "BC-001",
        projectId: "project-1",
        withdrawnArea: 50,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "No hay suficiente material en este rollo. Quedan 20m².",
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("rejects when barcode does not exist", async () => {
    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () => makeQuerySnapshot([]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    await expect(
      RollService.withdraw(orgId, {
        barcodeValue: "MISSING",
        projectId: "project-1",
        withdrawnArea: 10,
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Rollo no encontrado. Regístralo primero en una importación.",
    });
    expect(mockProjectGetById).not.toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe("RollService.getStockByProduct", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
    mockProductList.mockResolvedValue([]);
  });

  it("sums available area and includes catalog roll products at 0", async () => {
    mockProductList.mockResolvedValue([
      { id: "prod-1", name: "Geomembrana A", type: "roll", kind: "producto" },
      { id: "prod-2", name: "Geomembrana B", type: "roll", kind: "producto" },
      { id: "prod-3", name: "Geotextil C", type: "roll", kind: "producto" },
      {
        id: "svc-1",
        name: "Dirección técnica",
        kind: "servicio",
        type: "roll",
      },
    ]);
    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          where: () => ({
            get: async () =>
              makeQuerySnapshot([
                {
                  id: "roll-a",
                  data: {
                    organizationId: orgId,
                    productId: "prod-1",
                    productName: "Geomembrana A",
                    remainingArea: 0,
                  },
                },
                {
                  id: "roll-b",
                  data: {
                    organizationId: orgId,
                    productId: "prod-1",
                    productName: "Geomembrana A",
                    remainingArea: 40,
                  },
                },
                {
                  id: "roll-c",
                  data: {
                    organizationId: orgId,
                    productId: "prod-2",
                    productName: "Geomembrana B",
                    remainingArea: 0,
                  },
                },
                {
                  id: "roll-svc",
                  data: {
                    organizationId: orgId,
                    productId: "svc-1",
                    productName: "Dirección técnica",
                    remainingArea: 99,
                  },
                },
              ]),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    const stock = await RollService.getStockByProduct(orgId);

    expect(stock).toHaveLength(3);
    expect(stock.find((s) => s.productId === "prod-1")).toEqual({
      productId: "prod-1",
      productName: "Geomembrana A",
      availableArea: 40,
      availableRollCount: 1,
    });
    expect(stock.find((s) => s.productId === "prod-2")).toEqual({
      productId: "prod-2",
      productName: "Geomembrana B",
      availableArea: 0,
      availableRollCount: 0,
    });
    expect(stock.find((s) => s.productId === "prod-3")).toEqual({
      productId: "prod-3",
      productName: "Geotextil C",
      availableArea: 0,
      availableRollCount: 0,
    });
    expect(stock.find((s) => s.productId === "svc-1")).toBeUndefined();
  });

  it("includes orphan rolls whose product is not typed as roll", async () => {
    mockProductList.mockResolvedValue([]);
    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          where: () => ({
            get: async () =>
              makeQuerySnapshot([
                {
                  id: "roll-x",
                  data: {
                    organizationId: orgId,
                    productId: "orphan-1",
                    productName: "Legacy geo",
                    remainingArea: 12.5,
                  },
                },
              ]),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    const stock = await RollService.getStockByProduct(orgId);
    expect(stock).toEqual([
      {
        productId: "orphan-1",
        productName: "Legacy geo",
        availableArea: 12.5,
        availableRollCount: 1,
      },
    ]);
  });
});

describe("RollService.setCost", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncInventoryMaterialsCost.mockResolvedValue({});
  });

  it("stores unitCost from total and backfills null-cost withdrawals", async () => {
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Geomembrana HDPE",
      barcodeValue: "BC-001",
      totalArea: 100,
      remainingArea: 40,
      unitCost: null,
    };

    const update = jest.fn().mockResolvedValue(undefined);
    const batchUpdate = jest.fn();
    const batchCommit = jest.fn().mockResolvedValue(undefined);
    mockBatch.mockReturnValue({
      update: batchUpdate,
      commit: batchCommit,
    });

    const withdrawalDocRef = { id: "wd-1" };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          doc: () => ({
            id: "roll-1",
            get: async () => makeDocSnap(true, rollData, "roll-1"),
            update,
          }),
        };
      }
      if (name === "rollWithdrawals") {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({
                empty: false,
                docs: [
                  {
                    id: "wd-1",
                    ref: withdrawalDocRef,
                    data: () => ({
                      organizationId: orgId,
                      rollId: "roll-1",
                      projectId: "project-1",
                      withdrawnArea: 20,
                      totalCost: null,
                      unitCost: null,
                    }),
                  },
                  {
                    id: "wd-2",
                    ref: { id: "wd-2" },
                    data: () => ({
                      organizationId: orgId,
                      rollId: "roll-1",
                      projectId: "project-1",
                      withdrawnArea: 10,
                      totalCost: 50,
                      unitCost: 5,
                    }),
                  },
                ],
              }),
            }),
          }),
        };
      }
      if (name === "unitStockMovements") {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => makeQuerySnapshot([]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    // After update, getById returns roll with unitCost
    let getCount = 0;
    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          doc: () => ({
            id: "roll-1",
            get: async () => {
              getCount += 1;
              if (getCount <= 1) {
                return makeDocSnap(true, rollData, "roll-1");
              }
              return makeDocSnap(
                true,
                { ...rollData, unitCost: 1.5 },
                "roll-1",
              );
            },
            update,
          }),
        };
      }
      if (name === "rollWithdrawals") {
        return {
          where: () => ({
            where: () => ({
              get: async () => {
                // First call: backfill query by rollId
                // Later calls: sum by projectId — both use same chain
                return {
                  empty: false,
                  docs: [
                    {
                      id: "wd-1",
                      ref: withdrawalDocRef,
                      data: () => ({
                        organizationId: orgId,
                        rollId: "roll-1",
                        projectId: "project-1",
                        withdrawnArea: 20,
                        totalCost: null,
                        unitCost: null,
                      }),
                    },
                    {
                      id: "wd-2",
                      ref: { id: "wd-2" },
                      data: () => ({
                        organizationId: orgId,
                        rollId: "roll-1",
                        projectId: "project-1",
                        withdrawnArea: 10,
                        totalCost: 50,
                        unitCost: 5,
                      }),
                    },
                  ],
                };
              },
            }),
          }),
        };
      }
      if (name === "unitStockMovements") {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => makeQuerySnapshot([]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    const result = await RollService.setCost(orgId, "roll-1", {
      mode: "total",
      totalCost: 150,
    });

    expect(result.unitCost).toBe(1.5);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ unitCost: 1.5 }),
    );
    expect(batchUpdate).toHaveBeenCalledWith(
      withdrawalDocRef,
      expect.objectContaining({ unitCost: 1.5, totalCost: 30 }),
    );
    expect(batchCommit).toHaveBeenCalled();
    expect(mockSyncInventoryMaterialsCost).toHaveBeenCalledWith(
      orgId,
      "project-1",
      expect.any(Number),
    );
  });

  it("accepts perM2 mode directly", async () => {
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      productName: "Geomembrana HDPE",
      totalArea: 100,
      unitCost: null,
    };
    const update = jest.fn().mockResolvedValue(undefined);
    mockBatch.mockReturnValue({
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    });

    let gets = 0;
    mockCollection.mockImplementation((name: string) => {
      if (name === "rolls") {
        return {
          doc: () => ({
            get: async () => {
              gets += 1;
              return makeDocSnap(
                true,
                gets === 1 ? rollData : { ...rollData, unitCost: 3.25 },
                "roll-1",
              );
            },
            update,
          }),
        };
      }
      if (name === "rollWithdrawals") {
        return {
          where: () => ({
            where: () => ({
              get: async () => makeQuerySnapshot([]),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    const result = await RollService.setCost(orgId, "roll-1", {
      mode: "perM2",
      unitCost: 3.25,
    });

    expect(result.unitCost).toBe(3.25);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ unitCost: 3.25 }),
    );
    expect(mockSyncInventoryMaterialsCost).not.toHaveBeenCalled();
  });
});

describe("RollService.reverseWithdrawal", () => {
  const orgId = "org-1";

  beforeEach(() => {
    jest.clearAllMocks();
    mockPruneOrphanedInventoryCode.mockResolvedValue(null);
    mockSyncInventoryMaterialsCost.mockResolvedValue({});
  });

  it("restores remainingArea, marks reversed, and syncs cost", async () => {
    const withdrawalData = {
      organizationId: orgId,
      rollId: "roll-1",
      productId: "prod-1",
      projectId: "project-1",
      projectName: "Proyecto Lago",
      withdrawnArea: 200,
      unitCost: 2,
      totalCost: 400,
      reversed: false,
    };
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      totalArea: 1000,
      remainingArea: 300,
      unitCost: 2,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "GM-1",
      name: "Geomembrana",
    });

    const withdrawalRef = { id: "wd-1" };
    const rollRef = { id: "roll-1" };
    const tx = {
      get: jest
        .fn()
        .mockResolvedValueOnce(makeDocSnap(true, withdrawalData, "wd-1"))
        .mockResolvedValueOnce(makeDocSnap(true, rollData, "roll-1")),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rollWithdrawals") {
        return {
          doc: () => ({
            ...withdrawalRef,
            get: async () => makeDocSnap(true, withdrawalData, "wd-1"),
          }),
          where: () => ({
            where: () => ({
              get: async () => makeQuerySnapshot([]),
            }),
          }),
        };
      }
      if (name === "rolls") {
        return {
          doc: () => rollRef,
        };
      }
      if (name === "unitStockMovements") {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => makeQuerySnapshot([]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    const result = await RollService.reverseWithdrawal(
      orgId,
      "wd-1",
      "admin-1",
    );

    expect(result.reversed).toBe(true);
    expect(result.reversedBy).toBe("admin-1");
    expect(tx.update).toHaveBeenCalledWith(
      rollRef,
      expect.objectContaining({ remainingArea: 500 }),
    );
    expect(tx.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "wd-1" }),
      expect.objectContaining({
        reversed: true,
        reversedBy: "admin-1",
      }),
    );
    expect(mockSyncInventoryMaterialsCost).toHaveBeenCalledWith(
      orgId,
      "project-1",
      0,
    );
    expect(mockPruneOrphanedInventoryCode).toHaveBeenCalledWith(
      orgId,
      "project-1",
      "GM-1",
    );
  });

  it("rejects when already reversed", async () => {
    const withdrawalData = {
      organizationId: orgId,
      rollId: "roll-1",
      productId: "prod-1",
      projectId: "project-1",
      withdrawnArea: 100,
      reversed: true,
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rollWithdrawals") {
        return {
          doc: () => ({
            get: async () => makeDocSnap(true, withdrawalData, "wd-1"),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    await expect(
      RollService.reverseWithdrawal(orgId, "wd-1", "admin-1"),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("caps restored remainingArea at totalArea", async () => {
    const withdrawalData = {
      organizationId: orgId,
      rollId: "roll-1",
      productId: "prod-1",
      projectId: "project-1",
      withdrawnArea: 200,
      unitCost: null,
      totalCost: null,
      reversed: false,
    };
    const rollData = {
      organizationId: orgId,
      productId: "prod-1",
      totalArea: 400,
      remainingArea: 250,
    };

    mockProductGetById.mockResolvedValue({
      id: "prod-1",
      code: "GM-1",
    });

    const withdrawalRef = { id: "wd-1" };
    const rollRef = { id: "roll-1" };
    const tx = {
      get: jest
        .fn()
        .mockResolvedValueOnce(makeDocSnap(true, withdrawalData, "wd-1"))
        .mockResolvedValueOnce(makeDocSnap(true, rollData, "roll-1")),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "rollWithdrawals") {
        return {
          doc: () => ({
            ...withdrawalRef,
            get: async () => makeDocSnap(true, withdrawalData, "wd-1"),
          }),
          where: () => ({
            where: () => ({
              get: async () => makeQuerySnapshot([]),
            }),
          }),
        };
      }
      if (name === "rolls") {
        return { doc: () => rollRef };
      }
      if (name === "unitStockMovements") {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                get: async () => makeQuerySnapshot([]),
              }),
            }),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(
      async (fn: (t: typeof tx) => unknown) => fn(tx),
    );

    await RollService.reverseWithdrawal(orgId, "wd-1", "admin-1");

    expect(tx.update).toHaveBeenCalledWith(
      rollRef,
      expect.objectContaining({ remainingArea: 400 }),
    );
  });
});
