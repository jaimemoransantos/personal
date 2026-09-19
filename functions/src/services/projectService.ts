import { db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type {
  Project,
  ProjectElement,
  ProjectInventoryExcludedService,
  ProjectInventoryProduct,
  ProjectInventoryProductsResult,
  ProjectInventoryWithdrawal,
  QuotationSnapshot,
  UpdateProjectData,
} from "../types/project";
import { ApiError } from "../utils/errors";
import { DesignService } from "./designService";
import { ProductService } from "./productService";
import { UserService } from "./userService";
import {
  isInventoryProduct,
  resolveProductType,
} from "../types/product";
import type { Roll } from "../types/roll";
import type { RollWithdrawal } from "../types/roll";
import type { UnitStockMovement } from "../types/unitStock";
import {
  assertProjectAllowsInventoryWithdrawal,
  extractCodesFromQuotationItems,
  extractQuotationCodes,
} from "../utils/quotationProducts";
import * as logger from "firebase-functions/logger";

const PROJECTS_COLLECTION = "projects";
const ROLLS_COLLECTION = "rolls";
const ROLL_WITHDRAWALS_COLLECTION = "rollWithdrawals";
const UNIT_MOVEMENTS_COLLECTION = "unitStockMovements";

function normalizeProductCode(code: string): string {
  return code.trim().toUpperCase();
}

export class ProjectService {
  static async list(
    organizationId: string,
  ): Promise<(Project & { id: string })[]> {
    const snapshot = await db
      .collection(PROJECTS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .orderBy("updatedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Project & { id: string })[];
  }

  static async getById(
    organizationId: string,
    projectId: string,
  ): Promise<(Project & { id: string }) | null> {
    const doc = await db.collection(PROJECTS_COLLECTION).doc(projectId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Project & { organizationId?: string };
    if (data?.organizationId !== organizationId) return null;
    return { id: doc.id, ...data } as Project & { id: string };
  }

  /**
   * Catalog products whose code appears in the project's quotation.
   * Never includes unitCost. Stock fields only when includeStock is true.
   */
  static async listInventoryProducts(
    organizationId: string,
    projectId: string,
    includeStock: boolean,
  ): Promise<ProjectInventoryProductsResult> {
    const project = await this.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }
    assertProjectAllowsInventoryWithdrawal(project);

    const quoteCodes = extractQuotationCodes(project);
    const catalog = await ProductService.list(organizationId);
    const byCode = new Map(
      catalog.map((p) => [String(p.code ?? "").trim().toUpperCase(), p]),
    );

    let rollStockByProduct = new Map<
      string,
      { availableArea: number; availableRollCount: number }
    >();
    if (includeStock) {
      const rollsSnap = await db
        .collection(ROLLS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .get();
      for (const doc of rollsSnap.docs) {
        const roll = doc.data() as {
          productId?: string;
          remainingArea?: number;
        };
        if (!(typeof roll.remainingArea === "number" && roll.remainingArea > 0)) {
          continue;
        }
        if (!roll.productId) continue;
        const existing = rollStockByProduct.get(roll.productId);
        if (existing) {
          existing.availableArea += roll.remainingArea;
          existing.availableRollCount += 1;
        } else {
          rollStockByProduct.set(roll.productId, {
            availableArea: roll.remainingArea,
            availableRollCount: 1,
          });
        }
      }
    }

    const products: ProjectInventoryProduct[] = [];
    const unmatchedCodes: string[] = [];
    const excludedServices: ProjectInventoryExcludedService[] = [];

    for (const code of quoteCodes) {
      const product = byCode.get(code);
      if (!product) {
        unmatchedCodes.push(code);
        logger.warn("Quotation code has no catalog product", {
          organizationId,
          projectId,
          code,
        });
        continue;
      }

      if (!isInventoryProduct(product)) {
        excludedServices.push({
          productId: product.id,
          code: product.code,
          name: product.name,
        });
        continue;
      }

      const type = resolveProductType(product);
      const row: ProjectInventoryProduct = {
        productId: product.id,
        code: product.code,
        name: product.name,
        type,
      };

      if (includeStock) {
        if (type === "unit") {
          row.stockQuantity =
            typeof product.stockQuantity === "number" &&
            Number.isFinite(product.stockQuantity)
              ? product.stockQuantity
              : 0;
        } else {
          const rollStock = rollStockByProduct.get(product.id);
          row.availableArea = rollStock?.availableArea ?? 0;
          row.availableRollCount = rollStock?.availableRollCount ?? 0;
        }
      }

      products.push(row);
    }

    products.sort((a, b) => a.name.localeCompare(b.name));
    unmatchedCodes.sort();
    excludedServices.sort((a, b) => a.name.localeCompare(b.name));

    return { products, unmatchedCodes, excludedServices };
  }

  static async update(
    organizationId: string,
    projectId: string,
    data: UpdateProjectData,
  ): Promise<Project & { id: string }> {
    const ref = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Proyecto no encontrado");
    }
    const existing = doc.data() as Project & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    await ref.update(updatePayload);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Project & { id: string };
  }

  static async delete(
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const ref = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Proyecto no encontrado");
    }
    const data = doc.data() as { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Proyecto no encontrado");
    }
    await ref.delete();
  }

  static async linkDesign(
    organizationId: string,
    projectId: string,
    designId: string,
  ): Promise<Project & { id: string }> {
    const design = await DesignService.getById(organizationId, designId);
    if (!design) {
      throw new ApiError(404, "Diseño no encontrado");
    }

    const ref = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Proyecto no encontrado");
    }
    const existing = doc.data() as Project & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const elements = existing.elements ?? [];
    if (elements.some((el) => el.designId === designId)) {
      throw new ApiError(400, "Este diseño ya está vinculado al proyecto");
    }

    const element: ProjectElement = {
      designId,
      designName: design.name,
      designType: design.type,
      m2Snapshot: design.area?.total ?? 0,
      linkedAt: Timestamp.now(),
    };

    await ref.update({
      elements: [...elements, element],
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Project & { id: string };
  }

  static async unlinkDesign(
    organizationId: string,
    projectId: string,
    designId: string,
  ): Promise<Project & { id: string }> {
    const ref = db.collection(PROJECTS_COLLECTION).doc(projectId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Proyecto no encontrado");
    }
    const existing = doc.data() as Project & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const elements = existing.elements ?? [];
    const next = elements.filter((el) => el.designId !== designId);
    if (next.length === elements.length) {
      throw new ApiError(404, "Diseño no vinculado al proyecto");
    }

    await ref.update({
      elements: next,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Project & { id: string };
  }

  /**
   * Product codes that still have non-reversed roll/unit withdrawals on the project.
   */
  static async listActiveWithdrawalProductCodes(
    organizationId: string,
    projectId: string,
  ): Promise<Set<string>> {
    const catalog = await ProductService.list(organizationId);
    const codeByProductId = new Map(
      catalog.map((p) => [
        p.id,
        normalizeProductCode(String(p.code ?? "")),
      ]),
    );

    const productIds = new Set<string>();

    const rollSnap = await db
      .collection(ROLL_WITHDRAWALS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("projectId", "==", projectId)
      .get();
    for (const doc of rollSnap.docs) {
      const data = doc.data() as {
        productId?: string;
        reversed?: boolean;
      };
      if (data.reversed === true) continue;
      if (data.productId) productIds.add(data.productId);
    }

    const unitSnap = await db
      .collection(UNIT_MOVEMENTS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("projectId", "==", projectId)
      .where("type", "==", "out")
      .get();
    for (const doc of unitSnap.docs) {
      const data = doc.data() as {
        productId?: string;
        reversed?: boolean;
      };
      if (data.reversed === true) continue;
      if (data.productId) productIds.add(data.productId);
    }

    const codes = new Set<string>();
    for (const productId of productIds) {
      const code = codeByProductId.get(productId);
      if (code) codes.add(code);
    }
    return codes;
  }

  /**
   * Overwrite quotationSnapshot only, and recompute orphanedInventoryCodes:
   * codes with active withdrawals that are missing from the new snapshot.
   * Does not touch name, status, notes, elements, etc.
   */
  static async syncQuotationSnapshot(
    organizationId: string,
    projectId: string,
    snapshot: QuotationSnapshot,
  ): Promise<(Project & { id: string }) | null> {
    const project = await this.getById(organizationId, projectId);
    if (!project) {
      logger.warn("Quote sync skipped: project not found", {
        organizationId,
        projectId,
      });
      return null;
    }

    const quoteCodes = extractCodesFromQuotationItems(snapshot.items);
    const activeCodes = await this.listActiveWithdrawalProductCodes(
      organizationId,
      projectId,
    );

    const orphanedInventoryCodes = Array.from(activeCodes)
      .filter((code) => !quoteCodes.has(code))
      .sort((a, b) => a.localeCompare(b));

    const ref = db.collection(PROJECTS_COLLECTION).doc(projectId);
    await ref.update({
      quotationSnapshot: snapshot,
      orphanedInventoryCodes,
      updatedAt: Timestamp.now(),
    });

    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Project & { id: string };
  }

  /**
   * True when the project still has non-reversed roll withdrawals or unit outs
   * for any catalog product matching `productCode`.
   */
  static async hasActiveInventoryWithdrawalsForCode(
    organizationId: string,
    projectId: string,
    productCode: string,
  ): Promise<boolean> {
    const code = normalizeProductCode(productCode);
    if (!code) return false;
    const active = await this.listActiveWithdrawalProductCodes(
      organizationId,
      projectId,
    );
    return active.has(code);
  }

  /**
   * Remove `productCode` from project.orphanedInventoryCodes when no active
   * withdrawals remain for that code.
   */
  static async pruneOrphanedInventoryCode(
    organizationId: string,
    projectId: string,
    productCode: string,
  ): Promise<(Project & { id: string }) | null> {
    const code = normalizeProductCode(productCode);
    if (!code) return null;

    const project = await this.getById(organizationId, projectId);
    if (!project) return null;

    const current = (project.orphanedInventoryCodes ?? []).map(
      normalizeProductCode,
    );
    if (!current.includes(code)) {
      return project;
    }

    const stillActive = await this.hasActiveInventoryWithdrawalsForCode(
      organizationId,
      projectId,
      code,
    );
    if (stillActive) {
      return project;
    }

    const next = current.filter((c) => c !== code);
    const ref = db.collection(PROJECTS_COLLECTION).doc(projectId);
    await ref.update({
      orphanedInventoryCodes: next,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Project & { id: string };
  }

  /**
   * All inventory withdrawals for a project (rolls + unit outs), including reversed.
   * Newest first. Caller strips cost fields for non-admin.
   */
  static async listInventoryWithdrawals(
    organizationId: string,
    projectId: string,
  ): Promise<ProjectInventoryWithdrawal[]> {
    const project = await this.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const [rollSnap, unitSnap, catalog] = await Promise.all([
      db
        .collection(ROLL_WITHDRAWALS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("projectId", "==", projectId)
        .get(),
      db
        .collection(UNIT_MOVEMENTS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("projectId", "==", projectId)
        .where("type", "==", "out")
        .get(),
      ProductService.list(organizationId),
    ]);

    const productNameById = new Map(
      catalog.map((p) => [p.id, p.name || p.code || "Producto"]),
    );

    const rollIds = new Set<string>();
    for (const doc of rollSnap.docs) {
      const data = doc.data() as RollWithdrawal;
      if (data.rollId) rollIds.add(data.rollId);
    }

    const rollById = new Map<string, Roll & { id: string }>();
    if (rollIds.size > 0) {
      await Promise.all(
        Array.from(rollIds).map(async (rollId) => {
          const snap = await db.collection(ROLLS_COLLECTION).doc(rollId).get();
          if (!snap.exists) return;
          const data = snap.data() as Roll & { organizationId?: string };
          if (data.organizationId !== organizationId) return;
          rollById.set(rollId, { id: snap.id, ...data });
        }),
      );
    }

    const rows: ProjectInventoryWithdrawal[] = [];

    for (const doc of rollSnap.docs) {
      const data = doc.data() as RollWithdrawal;
      const roll = data.rollId ? rollById.get(data.rollId) : undefined;
      const productName =
        productNameById.get(data.productId) ||
        roll?.productName ||
        "Producto";
      rows.push({
        id: doc.id,
        sourceType: "roll",
        productId: data.productId,
        productName,
        quantity: Number(data.withdrawnArea) || 0,
        quantityUnit: "m2",
        withdrawnAt: data.withdrawnAt,
        performedBy: data.performedBy,
        reversed: data.reversed === true,
        rollId: data.rollId,
        barcodeValue: roll?.barcodeValue,
        unitCost: data.unitCost ?? null,
        totalCost: data.totalCost ?? null,
      });
    }

    for (const doc of unitSnap.docs) {
      const data = doc.data() as UnitStockMovement;
      rows.push({
        id: doc.id,
        sourceType: "unit",
        productId: data.productId,
        productName:
          data.productName ||
          productNameById.get(data.productId) ||
          "Producto",
        quantity: Number(data.quantity) || 0,
        quantityUnit: "unit",
        withdrawnAt: data.createdAt,
        performedBy: data.performedBy,
        reversed: data.reversed === true,
        unitCost: data.unitCost ?? null,
        totalCost: data.totalCost ?? null,
      });
    }

    const nameById = await UserService.getDisplayNamesByIds(
      rows
        .map((r) => r.performedBy)
        .filter((id): id is string => typeof id === "string"),
    );
    for (const row of rows) {
      row.performedByName =
        typeof row.performedBy === "string"
          ? nameById.get(row.performedBy) ?? null
          : null;
    }

    rows.sort((a, b) => {
      const ta =
        a.withdrawnAt &&
        typeof (a.withdrawnAt as { toMillis?: () => number }).toMillis ===
          "function"
          ? (a.withdrawnAt as { toMillis: () => number }).toMillis()
          : 0;
      const tb =
        b.withdrawnAt &&
        typeof (b.withdrawnAt as { toMillis?: () => number }).toMillis ===
          "function"
          ? (b.withdrawnAt as { toMillis: () => number }).toMillis()
          : 0;
      return tb - ta;
    });

    return rows;
  }

  /**
   * Active (non-reversed) inventory withdrawals for a product code on a project.
   * Used by admin reverse UI for orphaned codes.
   */
  static async listActiveInventoryWithdrawalsForCode(
    organizationId: string,
    projectId: string,
    productCode: string,
  ): Promise<{
    code: string;
    productId: string | null;
    productName: string | null;
    productType: "roll" | "unit" | null;
    rollWithdrawals: Array<Record<string, unknown> & { id: string }>;
    unitMovements: Array<Record<string, unknown> & { id: string }>;
  }> {
    const project = await this.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const code = normalizeProductCode(productCode);
    if (!code) {
      throw new ApiError(400, "code es requerido");
    }

    const catalog = await ProductService.list(organizationId);
    const matches = catalog.filter(
      (p) => normalizeProductCode(String(p.code ?? "")) === code,
    );
    const product = matches[0] ?? null;
    const productIdSet = new Set(matches.map((p) => p.id));

    const rollWithdrawals: Array<Record<string, unknown> & { id: string }> = [];
    const unitMovements: Array<Record<string, unknown> & { id: string }> = [];

    if (productIdSet.size > 0) {
      const rollSnap = await db
        .collection(ROLL_WITHDRAWALS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("projectId", "==", projectId)
        .get();
      for (const doc of rollSnap.docs) {
        const data = doc.data() as {
          productId?: string;
          reversed?: boolean;
          withdrawnAt?: unknown;
        };
        if (data.reversed === true) continue;
        if (!data.productId || !productIdSet.has(data.productId)) continue;
        rollWithdrawals.push({ id: doc.id, ...data });
      }

      const unitSnap = await db
        .collection(UNIT_MOVEMENTS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("projectId", "==", projectId)
        .where("type", "==", "out")
        .get();
      for (const doc of unitSnap.docs) {
        const data = doc.data() as {
          productId?: string;
          reversed?: boolean;
          createdAt?: unknown;
        };
        if (data.reversed === true) continue;
        if (!data.productId || !productIdSet.has(data.productId)) continue;
        unitMovements.push({ id: doc.id, ...data });
      }
    }

    rollWithdrawals.sort((a, b) => {
      const ta = (a.withdrawnAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const tb = (b.withdrawnAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      return tb - ta;
    });
    unitMovements.sort((a, b) => {
      const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      return tb - ta;
    });

    return {
      code,
      productId: product?.id ?? null,
      productName: product?.name ?? null,
      productType: product ? resolveProductType(product) : null,
      rollWithdrawals,
      unitMovements,
    };
  }
}
