import { db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { ApiError } from "../utils/errors";
import { ProductService } from "./productService";
import { ProjectService } from "./projectService";
import { RollService } from "./rollService";
import { resolveProductType, isInventoryProduct } from "../types/product";
import { assertProductCodeInQuotation, assertProjectAllowsInventoryWithdrawal } from "../utils/quotationProducts";
import type {
  UnitProductStock,
  UnitStockInData,
  UnitStockMovement,
  UnitStockOutData,
} from "../types/unitStock";
import type { Product } from "../types/product";

const MOVEMENTS_COLLECTION = "unitStockMovements";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parsePositiveQuantity(raw: unknown, field = "quantity"): number {
  const quantity = Number(raw);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(400, `${field} debe ser un número mayor a 0`);
  }
  return round2(quantity);
}

/** Strip cost fields for non-admin responses. */
export function presentUnitMovement<T extends Record<string, unknown>>(
  movement: T,
  isAdmin: boolean,
): T | Omit<T, "unitCost" | "totalCost"> {
  if (isAdmin) return movement;
  const { unitCost: _u, totalCost: _t, ...rest } = movement;
  return rest;
}

export class UnitStockService {
  static movementsRef() {
    return db.collection(MOVEMENTS_COLLECTION);
  }

  /**
   * Register stock in for a unit product. Does not accept or store cost.
   */
  static async stockIn(
    organizationId: string,
    data: UnitStockInData,
    performedBy?: string,
  ): Promise<{
    product: Product & { id: string };
    movement: UnitStockMovement & { id: string };
  }> {
    if (!data.productId || typeof data.productId !== "string") {
      throw new ApiError(400, "productId es requerido");
    }
    const quantity = parsePositiveQuantity(data.quantity);

    const product = await ProductService.getById(
      organizationId,
      data.productId,
    );
    if (!product) {
      throw new ApiError(404, "Producto no encontrado");
    }
    if (!isInventoryProduct(product)) {
      throw new ApiError(
        400,
        "Los servicios no se registran en inventario",
      );
    }
    if (resolveProductType(product) !== "unit") {
      throw new ApiError(
        400,
        "Solo productos por unidad admiten movimientos de stock numérico",
      );
    }

    const productRef = db.collection("products").doc(product.id);
    const movementRef = this.movementsRef().doc();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(productRef);
      if (!snap.exists) {
        throw new ApiError(404, "Producto no encontrado");
      }
      const current = snap.data() as Product;
      if (current.organizationId !== organizationId) {
        throw new ApiError(404, "Producto no encontrado");
      }
      if (!isInventoryProduct(current)) {
        throw new ApiError(
          400,
          "Los servicios no se registran en inventario",
        );
      }
      if (resolveProductType(current) !== "unit") {
        throw new ApiError(
          400,
          "Solo productos por unidad admiten movimientos de stock numérico",
        );
      }

      const now = Timestamp.now();
      const prevQty =
        typeof current.stockQuantity === "number" &&
        Number.isFinite(current.stockQuantity)
          ? current.stockQuantity
          : 0;
      const nextQty = round2(prevQty + quantity);

      tx.update(productRef, {
        stockQuantity: nextQty,
        updatedAt: now,
      });

      const movement: UnitStockMovement = {
        organizationId,
        productId: product.id,
        productName: current.name,
        type: "in",
        quantity,
        createdAt: now,
        ...(performedBy ? { performedBy } : {}),
      };
      tx.set(movementRef, movement);

      return {
        product: {
          id: product.id,
          ...current,
          stockQuantity: nextQty,
          updatedAt: now,
        } as Product & { id: string },
        movement: { id: movementRef.id, ...movement },
      };
    });

    return result;
  }

  /**
   * Withdraw stock toward a project.
   * Validates product is in the project quotation.
   * Snapshots cost when product.unitCost is set and syncs inventory rubro.
   */
  static async stockOut(
    organizationId: string,
    data: UnitStockOutData,
    performedBy?: string,
  ): Promise<{
    product: Product & { id: string };
    movement: UnitStockMovement & { id: string };
  }> {
    if (!data.productId || typeof data.productId !== "string") {
      throw new ApiError(400, "productId es requerido");
    }
    if (!data.projectId || typeof data.projectId !== "string") {
      throw new ApiError(400, "projectId es requerido");
    }
    const quantity = parsePositiveQuantity(data.quantity);

    const product = await ProductService.getById(
      organizationId,
      data.productId,
    );
    if (!product) {
      throw new ApiError(404, "Producto no encontrado");
    }
    if (!isInventoryProduct(product)) {
      throw new ApiError(
        400,
        "Los servicios no se retiran de inventario",
      );
    }
    if (resolveProductType(product) !== "unit") {
      throw new ApiError(
        400,
        "Solo productos por unidad admiten movimientos de stock numérico",
      );
    }

    const project = await ProjectService.getById(
      organizationId,
      data.projectId,
    );
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }
    assertProjectAllowsInventoryWithdrawal(project);
    assertProductCodeInQuotation(project, product.code);

    const productRef = db.collection("products").doc(product.id);
    const movementRef = this.movementsRef().doc();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(productRef);
      if (!snap.exists) {
        throw new ApiError(404, "Producto no encontrado");
      }
      const current = snap.data() as Product;
      if (current.organizationId !== organizationId) {
        throw new ApiError(404, "Producto no encontrado");
      }
      if (!isInventoryProduct(current)) {
        throw new ApiError(
          400,
          "Los servicios no se retiran de inventario",
        );
      }
      if (resolveProductType(current) !== "unit") {
        throw new ApiError(
          400,
          "Solo productos por unidad admiten movimientos de stock numérico",
        );
      }

      const prevQty =
        typeof current.stockQuantity === "number" &&
        Number.isFinite(current.stockQuantity)
          ? current.stockQuantity
          : 0;
      if (quantity > prevQty) {
        throw new ApiError(
          400,
          `Stock insuficiente. Disponibles: ${prevQty}`,
        );
      }

      const now = Timestamp.now();
      const nextQty = round2(prevQty - quantity);

      tx.update(productRef, {
        stockQuantity: nextQty,
        updatedAt: now,
      });

      const snapUnitCost =
        typeof current.unitCost === "number" &&
        Number.isFinite(current.unitCost)
          ? current.unitCost
          : null;
      const snapTotalCost =
        snapUnitCost != null ? round2(quantity * snapUnitCost) : null;

      const movement: UnitStockMovement = {
        organizationId,
        productId: product.id,
        productName: current.name,
        type: "out",
        quantity,
        projectId: data.projectId,
        projectName: project.name,
        unitCost: snapUnitCost,
        totalCost: snapTotalCost,
        createdAt: now,
        reversed: false,
        reversedAt: null,
        reversedBy: null,
        ...(performedBy ? { performedBy } : {}),
      };
      tx.set(movementRef, movement);

      return {
        product: {
          id: product.id,
          ...current,
          stockQuantity: nextQty,
          updatedAt: now,
        } as Product & { id: string },
        movement: { id: movementRef.id, ...movement },
      };
    });

    if (result.movement.totalCost != null) {
      await RollService.syncProjectInventoryCost(
        organizationId,
        data.projectId,
      );
    }

    return result;
  }

  /**
   * Backfill out-movements of a product where totalCost is null, then sync projects.
   */
  static async backfillOutMovements(
    organizationId: string,
    productId: string,
    unitCost: number,
  ): Promise<string[]> {
    const snapshot = await this.movementsRef()
      .where("organizationId", "==", organizationId)
      .where("productId", "==", productId)
      .where("type", "==", "out")
      .get();

    const projectIds = new Set<string>();
    const batch = db.batch();
    let ops = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data() as UnitStockMovement;
      if (data.reversed === true) continue;
      const needsBackfill =
        data.totalCost == null || !Number.isFinite(Number(data.totalCost));
      if (!needsBackfill) continue;

      const totalCost = round2(Number(data.quantity) * unitCost);
      batch.update(doc.ref, { unitCost, totalCost });
      ops += 1;
      if (data.projectId) projectIds.add(data.projectId);
    }

    if (ops > 0) {
      await batch.commit();
    }

    return Array.from(projectIds);
  }

  /**
   * Admin: reverse a unit stock-out — restore quantity and soft-mark the movement.
   */
  static async reverseOutMovement(
    organizationId: string,
    movementId: string,
    reversedBy?: string,
  ): Promise<UnitStockMovement & { id: string }> {
    const movementRef = this.movementsRef().doc(movementId);
    const movementSnap = await movementRef.get();
    if (!movementSnap.exists) {
      throw new ApiError(404, "Movimiento no encontrado");
    }
    const movement = movementSnap.data() as UnitStockMovement;
    if (movement.organizationId !== organizationId) {
      throw new ApiError(404, "Movimiento no encontrado");
    }
    if (movement.type !== "out") {
      throw new ApiError(400, "Solo se pueden revertir movimientos de salida");
    }
    if (movement.reversed === true) {
      throw new ApiError(400, "Este movimiento ya fue revertido");
    }
    if (!movement.projectId) {
      throw new ApiError(400, "El movimiento no está vinculado a un proyecto");
    }

    const quantity = Number(movement.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, "El movimiento no tiene una cantidad válida");
    }

    const productRef = db.collection("products").doc(movement.productId);
    const projectId = movement.projectId;

    const updated = await db.runTransaction(async (tx) => {
      const [mvSnap, productSnap] = await Promise.all([
        tx.get(movementRef),
        tx.get(productRef),
      ]);

      if (!mvSnap.exists) {
        throw new ApiError(404, "Movimiento no encontrado");
      }
      const currentMv = mvSnap.data() as UnitStockMovement;
      if (currentMv.organizationId !== organizationId) {
        throw new ApiError(404, "Movimiento no encontrado");
      }
      if (currentMv.type !== "out") {
        throw new ApiError(400, "Solo se pueden revertir movimientos de salida");
      }
      if (currentMv.reversed === true) {
        throw new ApiError(400, "Este movimiento ya fue revertido");
      }

      if (!productSnap.exists) {
        throw new ApiError(404, "Producto no encontrado");
      }
      const product = productSnap.data() as Product;
      if (product.organizationId !== organizationId) {
        throw new ApiError(404, "Producto no encontrado");
      }

      const prevQty =
        typeof product.stockQuantity === "number" &&
        Number.isFinite(product.stockQuantity)
          ? product.stockQuantity
          : 0;
      const qty = Number(currentMv.quantity);
      const nextQty = round2(prevQty + qty);
      const now = Timestamp.now();

      tx.update(productRef, {
        stockQuantity: nextQty,
        updatedAt: now,
      });
      tx.update(movementRef, {
        reversed: true,
        reversedAt: now,
        reversedBy: reversedBy ?? null,
      });

      return {
        id: movementId,
        ...currentMv,
        reversed: true,
        reversedAt: now,
        reversedBy: reversedBy ?? null,
      } as UnitStockMovement & { id: string };
    });

    await RollService.syncProjectInventoryCost(organizationId, projectId);

    const product = await ProductService.getById(
      organizationId,
      updated.productId,
    );
    if (product?.code) {
      await ProjectService.pruneOrphanedInventoryCode(
        organizationId,
        projectId,
        product.code,
      );
    }

    return updated;
  }

  /**
   * All stock movements for a unit product (in/out, including reversed), newest first.
   */
  static async listMovementsByProduct(
    organizationId: string,
    productId: string,
  ): Promise<(UnitStockMovement & { id: string })[]> {
    const product = await ProductService.getById(organizationId, productId);
    if (!product) {
      throw new ApiError(404, "Producto no encontrado");
    }
    if (!isInventoryProduct(product)) {
      throw new ApiError(400, "Los servicios no tienen movimientos de inventario");
    }
    if (resolveProductType(product) !== "unit") {
      throw new ApiError(
        400,
        "Solo productos por unidad tienen este historial de movimientos",
      );
    }

    const snapshot = await this.movementsRef()
      .where("organizationId", "==", organizationId)
      .where("productId", "==", productId)
      .get();

    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as UnitStockMovement),
    }));

    list.sort((a, b) => {
      const ta =
        a.createdAt &&
        typeof (a.createdAt as { toMillis?: () => number }).toMillis ===
          "function"
          ? (a.createdAt as { toMillis: () => number }).toMillis()
          : 0;
      const tb =
        b.createdAt &&
        typeof (b.createdAt as { toMillis?: () => number }).toMillis ===
          "function"
          ? (b.createdAt as { toMillis: () => number }).toMillis()
          : 0;
      return tb - ta;
    });

    return list;
  }

  /**
   * List unit products with their current stock.
   * unitCost is only filled when includeCost is true (admin).
   */
  static async getStock(
    organizationId: string,
    includeCost: boolean,
  ): Promise<UnitProductStock[]> {
    const products = await ProductService.listByType(organizationId, "unit");
    return products.map((p) => {
      const row: UnitProductStock = {
        productId: p.id,
        productName: p.name,
        productCode: p.code,
        stockQuantity:
          typeof p.stockQuantity === "number" && Number.isFinite(p.stockQuantity)
            ? p.stockQuantity
            : 0,
      };
      if (includeCost) {
        row.unitCost =
          typeof p.unitCost === "number" && Number.isFinite(p.unitCost)
            ? p.unitCost
            : null;
      }
      return row;
    });
  }
}
