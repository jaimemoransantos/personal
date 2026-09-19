import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase-admin";
import type {
  CostItem,
  CostItemCategory,
  CreateCostItemData,
  LaborFormula,
} from "../types/costItem";
import { ApiError } from "../utils/errors";
import { ProjectService } from "./projectService";
import { StorageService } from "./storageService";

const COST_ITEMS_COLLECTION = "costItems";

const VALID_CATEGORIES: CostItemCategory[] = [
  "materials",
  "labor",
  "food",
  "transport",
  "subcontracted",
  "other",
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isValidCategory(value: unknown): value is CostItemCategory {
  return (
    typeof value === "string" &&
    (VALID_CATEGORIES as string[]).includes(value)
  );
}

function normalizeLaborFormula(
  formula: LaborFormula | undefined,
): LaborFormula | undefined {
  if (!formula || typeof formula !== "object") return undefined;
  return {
    daysWorked: Number(formula.daysWorked) || 0,
    dailyRate: Number(formula.dailyRate) || 0,
    metersInstalled: Number(formula.metersInstalled) || 0,
    ratePerMeter: Number(formula.ratePerMeter) || 0,
  };
}

/**
 * Calcula el monto del ítem de costo.
 * Con labor + laborFormula siempre se recalcula; no se confía en amount del cliente.
 */
export function computeMonto(data: CreateCostItemData): number {
  if (data.category === "labor") {
    const formula = normalizeLaborFormula(data.laborFormula);
    if (formula) {
      return round2(
        formula.daysWorked * formula.dailyRate +
          formula.metersInstalled * formula.ratePerMeter,
      );
    }
    return round2(Number(data.amount) || 0);
  }
  return round2(Number(data.amount) || 0);
}

/** Strips optional data-URL prefix; returns raw base64 + mime if present. */
function normalizeImagePayload(
  input: string,
  mimeType?: string,
): { base64: string; mimeType: string } {
  const trimmed = input.trim();
  const dataUrlMatch = trimmed.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
  );
  if (dataUrlMatch) {
    return {
      mimeType: mimeType || dataUrlMatch[1],
      base64: dataUrlMatch[2],
    };
  }
  if (!mimeType) {
    throw new ApiError(400, "mimeType es requerido");
  }
  return { base64: trimmed, mimeType };
}

function validateCreateData(data: CreateCostItemData): void {
  if (!isValidCategory(data.category)) {
    throw new ApiError(400, "Categoría inválida");
  }
  if (
    typeof data.description !== "string" ||
    !data.description.trim()
  ) {
    throw new ApiError(400, "La descripción es requerida");
  }
}

export class CostItemService {
  static async list(
    organizationId: string,
    projectId: string,
  ): Promise<(CostItem & { id: string })[]> {
    const snapshot = await db
      .collection(COST_ITEMS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("projectId", "==", projectId)
      .orderBy("createdAt", "asc")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (CostItem & { id: string })[];
  }

  static async getById(
    organizationId: string,
    id: string,
  ): Promise<(CostItem & { id: string }) | null> {
    const doc = await db.collection(COST_ITEMS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as CostItem & { organizationId?: string };
    if (data?.organizationId !== organizationId) return null;
    return { id: doc.id, ...data } as CostItem & { id: string };
  }

  static async create(
    organizationId: string,
    projectId: string,
    data: CreateCostItemData,
    createdBy?: string,
  ): Promise<CostItem & { id: string }> {
    validateCreateData(data);

    const project = await ProjectService.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const ref = db.collection(COST_ITEMS_COLLECTION).doc();
    const now = Timestamp.now();
    const laborFormula =
      data.category === "labor"
        ? normalizeLaborFormula(data.laborFormula)
        : undefined;
    const amount = computeMonto({
      ...data,
      laborFormula,
    });

    const item: Omit<CostItem, "id"> = {
      organizationId,
      projectId,
      category: data.category,
      description: data.description.trim(),
      amount,
      invoiceUrls: [],
      createdAt: now,
      updatedAt: now,
      ...(data.estimatedAmount !== undefined
        ? { estimatedAmount: Number(data.estimatedAmount) || 0 }
        : {}),
      ...(laborFormula ? { laborFormula } : {}),
      ...(data.category === "materials" && data.actualM2 !== undefined
        ? { actualM2: Number(data.actualM2) || 0 }
        : {}),
      ...(createdBy ? { createdBy } : {}),
    };

    await ref.set(item);
    const created = await ref.get();
    return { id: created.id, ...created.data() } as CostItem & { id: string };
  }

  static async update(
    organizationId: string,
    id: string,
    data: Partial<CreateCostItemData>,
  ): Promise<CostItem & { id: string }> {
    const ref = db.collection(COST_ITEMS_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }
    const existing = doc.data() as CostItem & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }

    if (data.category !== undefined && !isValidCategory(data.category)) {
      throw new ApiError(400, "Categoría inválida");
    }
    if (
      data.description !== undefined &&
      (typeof data.description !== "string" || !data.description.trim())
    ) {
      throw new ApiError(400, "La descripción es requerida");
    }

    const category = data.category ?? existing.category;
    const laborFormula =
      category === "labor"
        ? normalizeLaborFormula(
            data.laborFormula !== undefined
              ? data.laborFormula
              : existing.laborFormula,
          )
        : undefined;

    const amount = computeMonto({
      category,
      description: data.description ?? existing.description,
      amount:
        data.amount !== undefined ? data.amount : existing.amount,
      laborFormula,
    });

    const updatePayload: Record<string, unknown> = {
      category,
      amount,
      updatedAt: Timestamp.now(),
    };

    if (data.description !== undefined) {
      updatePayload.description = data.description.trim();
    }
    if (data.estimatedAmount !== undefined) {
      updatePayload.estimatedAmount = Number(data.estimatedAmount) || 0;
    }

    if (category === "labor" && laborFormula) {
      updatePayload.laborFormula = laborFormula;
    } else if (category !== "labor") {
      updatePayload.laborFormula = FieldValue.delete();
    }

    if (category === "materials" && data.actualM2 !== undefined) {
      updatePayload.actualM2 = Number(data.actualM2) || 0;
    } else if (category !== "materials" && data.category !== undefined) {
      updatePayload.actualM2 = FieldValue.delete();
    }

    await ref.update(updatePayload);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as CostItem & { id: string };
  }

  static async delete(organizationId: string, id: string): Promise<void> {
    const ref = db.collection(COST_ITEMS_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }
    const data = doc.data() as { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }
    await ref.delete();
  }

  static async addFactura(
    organizationId: string,
    id: string,
    base64Image: string,
    mimeType: string,
  ): Promise<CostItem & { id: string }> {
    if (!base64Image || typeof base64Image !== "string") {
      throw new ApiError(400, "imageBase64 es requerido");
    }

    const ref = db.collection(COST_ITEMS_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }
    const existing = doc.data() as CostItem & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }

    const { base64, mimeType: resolvedMime } = normalizeImagePayload(
      base64Image,
      mimeType,
    );
    const url = await StorageService.uploadFacturaImage(
      organizationId,
      id,
      base64,
      resolvedMime,
    );
    const invoiceUrls = [...(existing.invoiceUrls ?? []), url];

    await ref.update({
      invoiceUrls,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as CostItem & { id: string };
  }

  static async removeFactura(
    organizationId: string,
    id: string,
    url: string,
  ): Promise<CostItem & { id: string }> {
    if (!url || typeof url !== "string") {
      throw new ApiError(400, "url es requerida");
    }

    const ref = db.collection(COST_ITEMS_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }
    const existing = doc.data() as CostItem & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Ítem de costo no encontrado");
    }

    const invoiceUrls = (existing.invoiceUrls ?? []).filter((u) => u !== url);
    if (invoiceUrls.length === (existing.invoiceUrls ?? []).length) {
      throw new ApiError(404, "Factura no encontrada en el ítem");
    }

    await StorageService.deleteFile(url);

    await ref.update({
      invoiceUrls,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as CostItem & { id: string };
  }

  /**
   * Upserts the system "Materiales (inventario)" rubro for a project.
   * amount = sum of all non-null inventory withdrawal totalCosts (rolls + units).
   */
  static async syncInventoryMaterialsCost(
    organizationId: string,
    projectId: string,
    amount: number,
  ): Promise<CostItem & { id: string }> {
    const project = await ProjectService.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const rounded = round2(Number(amount) || 0);
    const existing = await this.findInventoryMaterialsItem(
      organizationId,
      projectId,
    );
    const now = Timestamp.now();

    if (existing) {
      const ref = db.collection(COST_ITEMS_COLLECTION).doc(existing.id);
      await ref.update({
        amount: rounded,
        description: "Materiales (inventario)",
        category: "materials",
        source: "inventory",
        updatedAt: now,
      });
      const updated = await ref.get();
      return { id: updated.id, ...updated.data() } as CostItem & { id: string };
    }

    const ref = db.collection(COST_ITEMS_COLLECTION).doc();
    const item: Omit<CostItem, "id"> = {
      organizationId,
      projectId,
      category: "materials",
      description: "Materiales (inventario)",
      amount: rounded,
      source: "inventory",
      invoiceUrls: [],
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(item);
    return { id: ref.id, ...item };
  }

  static async findInventoryMaterialsItem(
    organizationId: string,
    projectId: string,
  ): Promise<(CostItem & { id: string }) | null> {
    const items = await this.list(organizationId, projectId);
    return (
      items.find(
        (item) =>
          item.source === "inventory" && item.category === "materials",
      ) ?? null
    );
  }
}
