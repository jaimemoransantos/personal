import { ApiError } from "../../utils/errors";
import type { CostItem } from "../../types/costItem";
import type { Project } from "../../types/project";
import { Timestamp } from "firebase-admin/firestore";

jest.mock("../projectService", () => ({
  ProjectService: {
    getById: jest.fn(),
  },
}));

jest.mock("../costItemService", () => ({
  CostItemService: {
    list: jest.fn(),
  },
}));

import { ProjectService } from "../projectService";
import { CostItemService } from "../costItemService";
import { LiquidacionService } from "../liquidacionService";

const mockGetById = ProjectService.getById as jest.Mock;
const mockList = CostItemService.list as jest.Mock;

function baseProject(overrides: Partial<Project> = {}): Project & { id: string } {
  return {
    id: "project-1",
    organizationId: "org-1",
    quotationId: "quote-1",
    quotationSnapshot: {
      quoteNumber: "2026000001",
      client: { name: "Cliente Demo" },
      items: [],
      amount: 1000,
      subtotal: 1000,
      discount: 0,
    },
    name: "Proyecto Demo",
    status: "planificado",
    elements: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function costItem(
  partial: Partial<CostItem> & Pick<CostItem, "category" | "description" | "amount">,
): CostItem & { id: string } {
  return {
    id: partial.description.replace(/\s+/g, "-").toLowerCase(),
    organizationId: "org-1",
    projectId: "project-1",
    invoiceUrls: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...partial,
  };
}

describe("LiquidacionService.computeSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("computes totals, margin and m2 metrics with exact numbers", async () => {
    // income 1000
    // costs: materials 200 + labor 185 + transport 50 = 435
    // margin = 565; margin% = 56.5
    // geometricM2 = 100 + 50 = 150
    // actualM2 materials = 160
    // waste = (160-150)/150*100 = 6.666... → 6.67
    const project = baseProject({
      quotationSnapshot: {
        quoteNumber: "2026000001",
        client: { name: "Cliente Demo" },
        items: [],
        amount: 1000,
        subtotal: 1000,
        discount: 0,
      },
      elements: [
        {
          designId: "d1",
          designName: "Piscina A",
          designType: "piscina_redonda",
          m2Snapshot: 100,
          linkedAt: Timestamp.now(),
        },
        {
          designId: "d2",
          designName: "Relavera B",
          designType: "relavera",
          m2Snapshot: 50,
          linkedAt: Timestamp.now(),
        },
      ],
    });

    const items = [
      costItem({
        category: "materials",
        description: "Geomembrana",
        amount: 200,
        actualM2: 160,
      }),
      costItem({
        category: "labor",
        description: "Instalación",
        amount: 185,
      }),
      costItem({
        category: "transport",
        description: "Flete",
        amount: 50,
      }),
    ];

    mockGetById.mockResolvedValue(project);
    mockList.mockResolvedValue(items);

    const summary = await LiquidacionService.computeSummary("org-1", "project-1");

    expect(summary.totalIncome).toBe(1000);
    expect(summary.costsByCategory).toEqual({
      materials: 200,
      labor: 185,
      food: 0,
      transport: 50,
      subcontracted: 0,
      other: 0,
    });
    expect(summary.totalCost).toBe(435);
    expect(summary.margin).toBe(565);
    expect(summary.marginPercentage).toBe(56.5);
    expect(summary.geometricM2).toBe(150);
    expect(summary.actualM2).toBe(160);
    expect(summary.actualWastePercentage).toBe(6.67);
  });

  it("uses subtotal - discount as totalIncome (excludes IVA from amount)", async () => {
    // amount = (1000 - 100) * 1.15 = 1035 (with IVA)
    // liquidacion income must be 900 (without IVA)
    const project = baseProject({
      quotationSnapshot: {
        quoteNumber: "2026000001",
        client: { name: "Cliente Demo" },
        items: [],
        amount: 1035,
        subtotal: 1000,
        discount: 100,
      },
    });
    mockGetById.mockResolvedValue(project);
    mockList.mockResolvedValue([
      costItem({
        category: "materials",
        description: "Material",
        amount: 200,
      }),
    ]);

    const summary = await LiquidacionService.computeSummary("org-1", "project-1");

    expect(summary.totalIncome).toBe(900);
    expect(summary.totalCost).toBe(200);
    expect(summary.margin).toBe(700);
    expect(summary.marginPercentage).toBe(77.78);
  });

  it("returns null geometricM2 and waste when no designs linked", async () => {
    const project = baseProject({ elements: [] });
    mockGetById.mockResolvedValue(project);
    mockList.mockResolvedValue([
      costItem({
        category: "materials",
        description: "Material",
        amount: 100,
        actualM2: 80,
      }),
    ]);

    const summary = await LiquidacionService.computeSummary("org-1", "project-1");

    expect(summary.geometricM2).toBeNull();
    expect(summary.actualM2).toBe(80);
    expect(summary.actualWastePercentage).toBeNull();
  });

  it("returns null actualM2 and waste when no materials actualM2", async () => {
    const project = baseProject({
      elements: [
        {
          designId: "d1",
          designName: "Piscina",
          designType: "piscina_redonda",
          m2Snapshot: 120,
          linkedAt: Timestamp.now(),
        },
      ],
    });
    mockGetById.mockResolvedValue(project);
    mockList.mockResolvedValue([
      costItem({
        category: "materials",
        description: "Sin m2 real",
        amount: 300,
      }),
      costItem({
        category: "labor",
        description: "Jornal",
        amount: 100,
      }),
    ]);

    const summary = await LiquidacionService.computeSummary("org-1", "project-1");

    expect(summary.geometricM2).toBe(120);
    expect(summary.actualM2).toBeNull();
    expect(summary.actualWastePercentage).toBeNull();
  });

  it("throws 404 when project is missing", async () => {
    mockGetById.mockResolvedValue(null);
    await expect(
      LiquidacionService.computeSummary("org-1", "missing"),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
