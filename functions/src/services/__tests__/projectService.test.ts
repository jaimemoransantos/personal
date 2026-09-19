import { Timestamp } from "firebase-admin/firestore";
import { ApiError } from "../../utils/errors";

const mockRunTransaction = jest.fn();
const mockCollection = jest.fn();

jest.mock("../../config/firebase-admin", () => ({
  db: {
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

jest.mock("firebase-functions/logger", () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const mockDesignGetById = jest.fn();
jest.mock("../designService", () => ({
  DesignService: {
    getById: (...args: unknown[]) => mockDesignGetById(...args),
  },
}));

const mockProductList = jest.fn();
jest.mock("../productService", () => ({
  ProductService: {
    list: (...args: unknown[]) => mockProductList(...args),
  },
}));

jest.mock("../customerService", () => ({
  CustomerService: {
    findIdByDocument: jest.fn().mockResolvedValue(null),
  },
}));

import { QuoteService } from "../quoteService";
import { ProjectService } from "../projectService";

function makeDocSnap(exists: boolean, data?: Record<string, unknown>, id = "doc1") {
  return {
    exists,
    id,
    data: () => data,
    ref: { id },
  };
}

function makeQuerySnapshot(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
) {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
      exists: true,
    })),
    empty: docs.length === 0,
  };
}

describe("QuoteService.convertToProject", () => {
  const orgId = "org-1";
  const quoteId = "quote-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("converts an accepted quote without projectId", async () => {
    const quoteData = {
      organizationId: orgId,
      status: "accepted",
      quoteNumber: "2026000001",
      client: { name: "Cliente Demo" },
      items: [{ id: "1", code: "A", name: "Item", subtitle: "", quantity: 1, price: 100 }],
      amount: 90,
      subtotal: 100,
      discount: 10,
    };

    const quoteRef = { id: quoteId };
    const projectRef = { id: "project-1" };
    const tx = {
      get: jest.fn().mockResolvedValue(makeDocSnap(true, quoteData, quoteId)),
      set: jest.fn(),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "quotes") {
        return { doc: () => quoteRef };
      }
      if (name === "projects") {
        return { doc: () => projectRef };
      }
      return { doc: () => ({}) };
    });

    mockRunTransaction.mockImplementation(async (fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );

    const result = await QuoteService.convertToProject(orgId, quoteId, "user-1");

    expect(result.id).toBe("project-1");
    expect(result.organizationId).toBe(orgId);
    expect(result.quotationId).toBe(quoteId);
    expect(result.name).toBe("Proyecto Cliente Demo");
    expect(result.status).toBe("planificado");
    expect(result.elements).toEqual([]);
    expect(result.quotationSnapshot).toEqual({
      quoteNumber: "2026000001",
      client: quoteData.client,
      items: quoteData.items,
      amount: 90,
      subtotal: 100,
      discount: 10,
    });
    expect(result.createdBy).toBe("user-1");
    expect(tx.set).toHaveBeenCalledWith(
      projectRef,
      expect.objectContaining({
        quotationId: quoteId,
        status: "planificado",
        elements: [],
      }),
    );
    expect(tx.update).toHaveBeenCalledWith(
      quoteRef,
      expect.objectContaining({
        projectId: "project-1",
        convertedAt: expect.any(Timestamp),
      }),
    );
  });

  it("rejects when status is not accepted", async () => {
    const quoteRef = { id: quoteId };
    const projectRef = { id: "project-1" };
    const tx = {
      get: jest.fn().mockResolvedValue(
        makeDocSnap(
          true,
          {
            organizationId: orgId,
            status: "pending",
            client: { name: "X" },
          },
          quoteId,
        ),
      ),
      set: jest.fn(),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "quotes") return { doc: () => quoteRef };
      if (name === "projects") return { doc: () => projectRef };
      return { doc: () => ({}) };
    });
    mockRunTransaction.mockImplementation(async (fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );

    await expect(
      QuoteService.convertToProject(orgId, quoteId),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Solo se puede convertir una cotización aceptada",
    });
    expect(tx.set).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("rejects when quote already has projectId", async () => {
    const quoteRef = { id: quoteId };
    const projectRef = { id: "project-new" };
    const tx = {
      get: jest.fn().mockResolvedValue(
        makeDocSnap(
          true,
          {
            organizationId: orgId,
            status: "accepted",
            projectId: "project-existing",
            client: { name: "X" },
          },
          quoteId,
        ),
      ),
      set: jest.fn(),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === "quotes") return { doc: () => quoteRef };
      if (name === "projects") return { doc: () => projectRef };
      return { doc: () => ({}) };
    });
    mockRunTransaction.mockImplementation(async (fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );

    await expect(
      QuoteService.convertToProject(orgId, quoteId),
    ).rejects.toBeInstanceOf(ApiError);

    await expect(
      QuoteService.convertToProject(orgId, quoteId),
    ).rejects.toThrow(/ya fue convertida a un proyecto \(project-existing\)/);

    expect(tx.set).not.toHaveBeenCalled();
  });
});

describe("ProjectService.linkDesign", () => {
  const orgId = "org-1";
  const projectId = "project-1";
  const designId = "design-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("links a design with area snapshot", async () => {
    mockDesignGetById.mockResolvedValue({
      id: designId,
      organizationId: orgId,
      name: "Piscina A",
      type: "piscina_redonda",
      area: { total: 42.5 },
    });

    const projectData = {
      organizationId: orgId,
      elements: [],
      name: "Proyecto X",
      status: "planificado",
    };

    const updatedData = {
      ...projectData,
      elements: [
        {
          designId,
          designName: "Piscina A",
          designType: "piscina_redonda",
          m2Snapshot: 42.5,
          linkedAt: Timestamp.now(),
        },
      ],
    };

    const update = jest.fn().mockResolvedValue(undefined);
    const get = jest
      .fn()
      .mockResolvedValueOnce(makeDocSnap(true, projectData, projectId))
      .mockResolvedValueOnce(makeDocSnap(true, updatedData, projectId));

    mockCollection.mockReturnValue({
      doc: () => ({ get, update }),
    });

    const result = await ProjectService.linkDesign(orgId, projectId, designId);

    expect(mockDesignGetById).toHaveBeenCalledWith(orgId, designId);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [
          expect.objectContaining({
            designId,
            designName: "Piscina A",
            designType: "piscina_redonda",
            m2Snapshot: 42.5,
          }),
        ],
      }),
    );
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].m2Snapshot).toBe(42.5);
  });

  it("rejects when designId is already linked", async () => {
    mockDesignGetById.mockResolvedValue({
      id: designId,
      organizationId: orgId,
      name: "Piscina A",
      type: "piscina_redonda",
      area: { total: 42.5 },
    });

    const projectData = {
      organizationId: orgId,
      elements: [
        {
          designId,
          designName: "Piscina A",
          designType: "piscina_redonda",
          m2Snapshot: 42.5,
          linkedAt: Timestamp.now(),
        },
      ],
    };

    const update = jest.fn();
    const get = jest
      .fn()
      .mockResolvedValue(makeDocSnap(true, projectData, projectId));

    mockCollection.mockReturnValue({
      doc: () => ({ get, update }),
    });

    await expect(
      ProjectService.linkDesign(orgId, projectId, designId),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Este diseño ya está vinculado al proyecto",
    });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("ProjectService.syncQuotationSnapshot", () => {
  const orgId = "org-1";
  const projectId = "project-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates only quotationSnapshot and recomputes orphanedInventoryCodes", async () => {
    const projectData = {
      organizationId: orgId,
      name: "Proyecto X",
      status: "instalando",
      notes: "keep me",
      elements: [{ designId: "d1" }],
      orphanedInventoryCodes: ["OLD"],
      quotationSnapshot: {
        quoteNumber: "Q-1",
        client: { name: "Old" },
        items: [{ code: "GM-1" }, { code: "EC-1" }],
        amount: 100,
        subtotal: 100,
        discount: 0,
      },
    };

    const newSnapshot = {
      quoteNumber: "Q-1",
      client: { name: "New Client" },
      items: [{ id: "1", code: "EC-1", name: "Canal", subtitle: "", quantity: 1, price: 10 }],
      amount: 10,
      subtotal: 10,
      discount: 0,
    };

    mockProductList.mockResolvedValue([
      { id: "prod-roll", code: "GM-1", name: "Geomembrana", type: "roll" },
      { id: "prod-unit", code: "EC-1", name: "Canal", type: "unit" },
    ]);

    const updatedData = {
      ...projectData,
      quotationSnapshot: newSnapshot,
      orphanedInventoryCodes: ["GM-1"],
    };

    const update = jest.fn().mockResolvedValue(undefined);
    const get = jest
      .fn()
      .mockResolvedValueOnce(makeDocSnap(true, projectData, projectId))
      .mockResolvedValueOnce(makeDocSnap(true, updatedData, projectId));

    mockCollection.mockImplementation((name: string) => {
      if (name === "projects") {
        return { doc: () => ({ get, update }) };
      }
      if (name === "rollWithdrawals") {
        return {
          where: () => ({
            where: () => ({
              get: async () =>
                makeQuerySnapshot([
                  {
                    id: "wd-1",
                    data: {
                      productId: "prod-roll",
                      reversed: false,
                    },
                  },
                  {
                    id: "wd-2",
                    data: {
                      productId: "prod-unit",
                      reversed: true,
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

    const result = await ProjectService.syncQuotationSnapshot(
      orgId,
      projectId,
      newSnapshot,
    );

    expect(update).toHaveBeenCalledWith({
      quotationSnapshot: newSnapshot,
      orphanedInventoryCodes: ["GM-1"],
      updatedAt: expect.any(Timestamp),
    });
    expect(result?.orphanedInventoryCodes).toEqual(["GM-1"]);
    expect(result?.name).toBe("Proyecto X");
    expect(result?.notes).toBe("keep me");
  });

  it("clears orphaned code when it returns to the quotation", async () => {
    const projectData = {
      organizationId: orgId,
      orphanedInventoryCodes: ["GM-1"],
      quotationSnapshot: {
        quoteNumber: "Q-1",
        client: {},
        items: [],
        amount: 0,
        subtotal: 0,
        discount: 0,
      },
    };
    const newSnapshot = {
      quoteNumber: "Q-1",
      client: {},
      items: [{ code: "GM-1" }],
      amount: 0,
      subtotal: 0,
      discount: 0,
    };

    mockProductList.mockResolvedValue([
      { id: "prod-roll", code: "GM-1", name: "Geomembrana", type: "roll" },
    ]);

    const update = jest.fn().mockResolvedValue(undefined);
    const get = jest
      .fn()
      .mockResolvedValueOnce(makeDocSnap(true, projectData, projectId))
      .mockResolvedValueOnce(
        makeDocSnap(
          true,
          {
            ...projectData,
            quotationSnapshot: newSnapshot,
            orphanedInventoryCodes: [],
          },
          projectId,
        ),
      );

    mockCollection.mockImplementation((name: string) => {
      if (name === "projects") {
        return { doc: () => ({ get, update }) };
      }
      if (name === "rollWithdrawals") {
        return {
          where: () => ({
            where: () => ({
              get: async () =>
                makeQuerySnapshot([
                  {
                    id: "wd-1",
                    data: { productId: "prod-roll", reversed: false },
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

    await ProjectService.syncQuotationSnapshot(orgId, projectId, newSnapshot);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ orphanedInventoryCodes: [] }),
    );
  });
});

describe("ProjectService.listInventoryProducts", () => {
  const orgId = "org-1";
  const projectId = "project-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads codes from the current quotationSnapshot", async () => {
    mockProductList.mockResolvedValue([
      {
        id: "prod-1",
        code: "NEW-1",
        name: "Nuevo producto",
        type: "unit",
        kind: "producto",
        stockQuantity: 5,
      },
      {
        id: "prod-old",
        code: "OLD-1",
        name: "Viejo",
        type: "roll",
        kind: "producto",
      },
    ]);

    mockCollection.mockImplementation((name: string) => {
      if (name === "projects") {
        return {
          doc: () => ({
            get: async () =>
              makeDocSnap(
                true,
                {
                  organizationId: orgId,
                  status: "planificado",
                  quotationSnapshot: {
                    quoteNumber: "Q-2",
                    client: {},
                    items: [{ code: "NEW-1" }],
                    amount: 1,
                    subtotal: 1,
                    discount: 0,
                  },
                },
                projectId,
              ),
          }),
        };
      }
      if (name === "rolls") {
        return {
          where: () => ({
            get: async () => makeQuerySnapshot([]),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    const result = await ProjectService.listInventoryProducts(
      orgId,
      projectId,
      true,
    );

    expect(result.products.map((p) => p.code)).toEqual(["NEW-1"]);
    expect(result.products[0].stockQuantity).toBe(5);
    expect(result.unmatchedCodes).toEqual([]);
  });

  it("rejects when project is liquidado or cerrado", async () => {
    mockCollection.mockImplementation((name: string) => {
      if (name === "projects") {
        return {
          doc: () => ({
            get: async () =>
              makeDocSnap(
                true,
                {
                  organizationId: orgId,
                  status: "cerrado",
                  quotationSnapshot: {
                    quoteNumber: "Q-2",
                    client: {},
                    items: [{ code: "NEW-1" }],
                    amount: 1,
                    subtotal: 1,
                    discount: 0,
                  },
                },
                projectId,
              ),
          }),
        };
      }
      return { doc: () => ({}) };
    });

    await expect(
      ProjectService.listInventoryProducts(orgId, projectId, true),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        "No se puede retirar material hacia un proyecto liquidado o cerrado.",
    });
    expect(mockProductList).not.toHaveBeenCalled();
  });
});

describe("QuoteService.update project sync", () => {
  const orgId = "org-1";
  const quoteId = "quote-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("syncs linked project snapshot when quote has projectId", async () => {
    const existingQuote = {
      organizationId: orgId,
      projectId: "project-1",
      quoteNumber: "2026000001",
      client: { name: "Cliente" },
      items: [{ id: "1", code: "GM-1", name: "Old", subtitle: "", quantity: 1, price: 100 }],
      discount: 0,
      subtotal: 100,
      amount: 100,
      status: "accepted",
    };

    const updatedQuote = {
      ...existingQuote,
      items: [
        { id: "1", code: "EC-1", name: "Canal", subtitle: "", quantity: 2, price: 50 },
      ],
      subtotal: 100,
      amount: 100,
      discount: 0,
    };

    const projectUpdate = jest.fn().mockResolvedValue(undefined);
    const projectGet = jest
      .fn()
      .mockResolvedValueOnce(
        makeDocSnap(
          true,
          {
            organizationId: orgId,
            name: "Proyecto",
            orphanedInventoryCodes: [],
            quotationSnapshot: existingQuote,
          },
          "project-1",
        ),
      )
      .mockResolvedValueOnce(
        makeDocSnap(
          true,
          {
            organizationId: orgId,
            name: "Proyecto",
            orphanedInventoryCodes: ["GM-1"],
            quotationSnapshot: {
              quoteNumber: "2026000001",
              client: { name: "Cliente" },
              items: updatedQuote.items,
              amount: 100,
              subtotal: 100,
              discount: 0,
            },
          },
          "project-1",
        ),
      );

    const quoteUpdate = jest.fn().mockResolvedValue(undefined);
    const quoteGet = jest
      .fn()
      .mockResolvedValueOnce(makeDocSnap(true, existingQuote, quoteId))
      .mockResolvedValueOnce(makeDocSnap(true, updatedQuote, quoteId));

    mockProductList.mockResolvedValue([
      { id: "prod-roll", code: "GM-1", name: "Geomembrana", type: "roll" },
      { id: "prod-unit", code: "EC-1", name: "Canal", type: "unit" },
    ]);

    mockCollection.mockImplementation((name: string) => {
      if (name === "quotes") {
        return { doc: () => ({ get: quoteGet, update: quoteUpdate }) };
      }
      if (name === "projects") {
        return { doc: () => ({ get: projectGet, update: projectUpdate }) };
      }
      if (name === "rollWithdrawals") {
        return {
          where: () => ({
            where: () => ({
              get: async () =>
                makeQuerySnapshot([
                  {
                    id: "wd-1",
                    data: { productId: "prod-roll", reversed: false },
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

    await QuoteService.update(orgId, quoteId, {
      items: updatedQuote.items,
    });

    expect(quoteUpdate).toHaveBeenCalled();
    expect(projectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        quotationSnapshot: expect.objectContaining({
          quoteNumber: "2026000001",
          items: updatedQuote.items,
          amount: 100,
          subtotal: 100,
          discount: 0,
        }),
        orphanedInventoryCodes: ["GM-1"],
      }),
    );
  });

  it("does not touch a project when quote has no projectId", async () => {
    const existingQuote = {
      organizationId: orgId,
      client: { name: "Cliente" },
      items: [],
      discount: 0,
      subtotal: 0,
      amount: 0,
    };

    const quoteUpdate = jest.fn().mockResolvedValue(undefined);
    const quoteGet = jest
      .fn()
      .mockResolvedValueOnce(makeDocSnap(true, existingQuote, quoteId))
      .mockResolvedValueOnce(makeDocSnap(true, existingQuote, quoteId));

    mockCollection.mockImplementation((name: string) => {
      if (name === "quotes") {
        return { doc: () => ({ get: quoteGet, update: quoteUpdate }) };
      }
      return { doc: () => ({ get: jest.fn(), update: jest.fn() }) };
    });

    await QuoteService.update(orgId, quoteId, { notes: "hola" });

    expect(quoteUpdate).toHaveBeenCalled();
    // Only quotes collection should have been used for the update path.
    const projectCalls = mockCollection.mock.calls.filter(
      (c: unknown[]) => c[0] === "projects",
    );
    expect(projectCalls).toHaveLength(0);
  });
});
