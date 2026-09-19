import { ApiError } from "../../utils/errors";

const mockCollection = jest.fn();
const mockFieldValueDelete = jest.fn(() => ({ __delete: true }));

jest.mock("../../config/firebase-admin", () => ({
  db: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
  admin: {
    firestore: {
      FieldValue: {
        delete: () => mockFieldValueDelete(),
      },
    },
    storage: () => ({
      bucket: () => ({
        name: "test-bucket",
        file: () => ({
          save: jest.fn(),
          makePublic: jest.fn(),
          delete: jest.fn(),
        }),
      }),
    }),
  },
}));

const mockProjectGetById = jest.fn();
jest.mock("../projectService", () => ({
  ProjectService: {
    getById: (...args: unknown[]) => mockProjectGetById(...args),
  },
}));

import { computeMonto, CostItemService } from "../costItemService";

function makeDocSnap(
  exists: boolean,
  data?: Record<string, unknown>,
  id = "cost-1",
) {
  return {
    exists,
    id,
    data: () => data,
  };
}

describe("computeMonto", () => {
  it("calculates labor with full laborFormula", () => {
    const amount = computeMonto({
      category: "labor",
      description: "Instalación",
      amount: 9999,
      laborFormula: {
        daysWorked: 5,
        dailyRate: 25,
        metersInstalled: 40,
        ratePerMeter: 1.5,
      },
    });
    expect(amount).toBe(185);
  });

  it("uses manual amount for labor without laborFormula", () => {
    const amount = computeMonto({
      category: "labor",
      description: "Jornal fijo",
      amount: 120.5,
    });
    expect(amount).toBe(120.5);
  });

  it("uses manual amount for materials and ignores stray laborFormula", () => {
    const amount = computeMonto({
      category: "materials",
      description: "Geomembrana",
      amount: 450,
      laborFormula: {
        daysWorked: 5,
        dailyRate: 25,
        metersInstalled: 40,
        ratePerMeter: 1.5,
      },
    });
    expect(amount).toBe(450);
  });
});

describe("CostItemService.create validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects invalid category", async () => {
    await expect(
      CostItemService.create("org-1", "project-1", {
        category: "invalid" as never,
        description: "Algo",
        amount: 10,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Categoría inválida",
    });
    expect(mockProjectGetById).not.toHaveBeenCalled();
  });

  it("rejects empty description", async () => {
    await expect(
      CostItemService.create("org-1", "project-1", {
        category: "materials",
        description: "   ",
        amount: 10,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "La descripción es requerida",
    });
    expect(mockProjectGetById).not.toHaveBeenCalled();
  });

  it("creates with computed amount for labor + laborFormula", async () => {
    mockProjectGetById.mockResolvedValue({ id: "project-1" });

    const set = jest.fn().mockResolvedValue(undefined);
    const get = jest.fn().mockResolvedValue(
      makeDocSnap(
        true,
        {
          organizationId: "org-1",
          projectId: "project-1",
          category: "labor",
          description: "Instalación",
          amount: 185,
          invoiceUrls: [],
        },
        "cost-1",
      ),
    );

    mockCollection.mockReturnValue({
      doc: () => ({ set, get, id: "cost-1" }),
    });

    const created = await CostItemService.create(
      "org-1",
      "project-1",
      {
        category: "labor",
        description: "Instalación",
        amount: 9999,
        laborFormula: {
          daysWorked: 5,
          dailyRate: 25,
          metersInstalled: 40,
          ratePerMeter: 1.5,
        },
      },
      "user-1",
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        projectId: "project-1",
        category: "labor",
        description: "Instalación",
        amount: 185,
        invoiceUrls: [],
        createdBy: "user-1",
        laborFormula: {
          daysWorked: 5,
          dailyRate: 25,
          metersInstalled: 40,
          ratePerMeter: 1.5,
        },
      }),
    );
    expect(created.id).toBe("cost-1");
    expect(created.amount).toBe(185);
  });

  it("rejects create when project is missing", async () => {
    mockProjectGetById.mockResolvedValue(null);
    await expect(
      CostItemService.create("org-1", "missing", {
        category: "other",
        description: "Misceláneos",
        amount: 20,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
