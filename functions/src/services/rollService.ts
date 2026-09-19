import { db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { ApiError } from "../utils/errors";
import { ProductService } from "./productService";
import { ProjectService } from "./projectService";
import { CostItemService } from "./costItemService";
import { assertProductCodeInQuotation, assertProjectAllowsInventoryWithdrawal } from "../utils/quotationProducts";
import { isInventoryProduct, resolveProductType } from "../types/product";
import type {
  ProductStock,
  RegisterRollData,
  Roll,
  RollCostingGroup,
  RollCostingProduct,
  RollWithdrawal,
  SetRollCostData,
  WithdrawRollData,
} from "../types/roll";

const ROLLS_COLLECTION = "rolls";
const WITHDRAWALS_COLLECTION = "rollWithdrawals";
const UNIT_MOVEMENTS_COLLECTION = "unitStockMovements";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Remove cost fields so chief/technician never see inventory costs. */
export function stripRollCost<T extends Record<string, unknown>>(
  roll: T,
): Omit<T, "unitCost"> {
  const { unitCost: _unitCost, ...rest } = roll;
  return rest;
}

export function presentRoll<T extends Record<string, unknown>>(
  roll: T,
  isAdmin: boolean,
): T | Omit<T, "unitCost"> {
  if (isAdmin) return roll;
  return stripRollCost(roll);
}

export function stripWithdrawalCost<T extends Record<string, unknown>>(
  withdrawal: T,
): Omit<T, "unitCost" | "totalCost"> {
  const { unitCost: _u, totalCost: _t, ...rest } = withdrawal;
  return rest;
}

export function presentWithdrawal<T extends Record<string, unknown>>(
  withdrawal: T,
  isAdmin: boolean,
): T | Omit<T, "unitCost" | "totalCost"> {
  if (isAdmin) return withdrawal;
  return stripWithdrawalCost(withdrawal);
}

function receivedDateKey(receivedAt: unknown): string {
  if (
    receivedAt &&
    typeof receivedAt === "object" &&
    "toDate" in receivedAt &&
    typeof (receivedAt as { toDate: () => Date }).toDate === "function"
  ) {
    const d = (receivedAt as { toDate: () => Date }).toDate();
    return d.toISOString().slice(0, 10);
  }
  if (
    receivedAt &&
    typeof receivedAt === "object" &&
    "_seconds" in receivedAt
  ) {
    const seconds = Number(
      (receivedAt as { _seconds: number })._seconds,
    );
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString().slice(0, 10);
    }
  }
  return "unknown";
}

function receivedAtMillis(receivedAt: unknown): number {
  if (
    receivedAt &&
    typeof receivedAt === "object" &&
    "toMillis" in receivedAt &&
    typeof (receivedAt as { toMillis: () => number }).toMillis === "function"
  ) {
    return (receivedAt as { toMillis: () => number }).toMillis();
  }
  if (
    receivedAt &&
    typeof receivedAt === "object" &&
    "toDate" in receivedAt &&
    typeof (receivedAt as { toDate: () => Date }).toDate === "function"
  ) {
    return (receivedAt as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

export class RollService {
  static rollsRef() {
    return db.collection(ROLLS_COLLECTION);
  }

  static withdrawalsRef() {
    return db.collection(WITHDRAWALS_COLLECTION);
  }

  static async findByBarcode(
    organizationId: string,
    barcodeValue: string,
  ): Promise<(Roll & { id: string }) | null> {
    const snapshot = await this.rollsRef()
      .where("organizationId", "==", organizationId)
      .where("barcodeValue", "==", barcodeValue)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...(doc.data() as Roll) };
  }

  static async getById(
    organizationId: string,
    rollId: string,
  ): Promise<(Roll & { id: string }) | null> {
    const doc = await this.rollsRef().doc(rollId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Roll;
    if (data.organizationId !== organizationId) return null;
    return { id: doc.id, ...data };
  }

  static async registerRoll(
    organizationId: string,
    data: RegisterRollData,
    createdBy?: string,
  ): Promise<Roll & { id: string }> {
    const barcodeValue =
      typeof data.barcodeValue === "string" ? data.barcodeValue.trim() : "";
    if (!barcodeValue) {
      throw new ApiError(400, "El código de barras es requerido");
    }
    if (!data.productId || typeof data.productId !== "string") {
      throw new ApiError(400, "productId es requerido");
    }

    const rollLength = Number(data.rollLength);
    if (!Number.isFinite(rollLength) || rollLength <= 0) {
      throw new ApiError(400, "rollLength debe ser un número mayor a 0");
    }
    const rollWidth = Number(data.rollWidth);
    if (!Number.isFinite(rollWidth) || rollWidth <= 0) {
      throw new ApiError(400, "rollWidth debe ser un número mayor a 0");
    }

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

    const existing = await this.findByBarcode(organizationId, barcodeValue);
    if (existing) {
      throw new ApiError(400, "Este código de barras ya está registrado");
    }

    const totalArea = round2(rollLength * rollWidth);
    const now = Timestamp.now();
    const ref = this.rollsRef().doc();
    const roll: Roll = {
      organizationId,
      productId: data.productId,
      productName: product.name,
      barcodeValue,
      rollLength,
      rollWidth,
      totalArea,
      remainingArea: totalArea,
      unitCost: null,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
      ...(data.batchNumber?.trim()
        ? { batchNumber: data.batchNumber.trim() }
        : {}),
      ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
      ...(createdBy ? { createdBy } : {}),
    };

    await ref.set(roll);
    return { id: ref.id, ...roll };
  }

  /**
   * Rolls for a product with remaining area, oldest first (FIFO).
   */
  static async listByProduct(
    organizationId: string,
    productId: string,
  ): Promise<(Roll & { id: string })[]> {
    const snapshot = await this.rollsRef()
      .where("organizationId", "==", organizationId)
      .where("productId", "==", productId)
      .orderBy("receivedAt", "asc")
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Roll) }))
      .filter((roll) => roll.remainingArea > 0);
  }

  static async listAll(
    organizationId: string,
    onlyAvailable = true,
  ): Promise<(Roll & { id: string })[]> {
    const snapshot = await this.rollsRef()
      .where("organizationId", "==", organizationId)
      .orderBy("receivedAt", "desc")
      .get();

    const rolls = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Roll),
    }));

    if (!onlyAvailable) return rolls;
    return rolls.filter((roll) => roll.remainingArea > 0);
  }

  /**
   * Admin costing view: all rolls grouped by product → batch/date.
   * Excludes rolls whose catalog product is kind === "servicio".
   */
  static async listForCosting(
    organizationId: string,
  ): Promise<RollCostingProduct[]> {
    const [rolls, catalog] = await Promise.all([
      this.listAll(organizationId, false),
      ProductService.list(organizationId),
    ]);
    const serviceIds = new Set(
      catalog.filter((p) => !isInventoryProduct(p)).map((p) => p.id),
    );

    const byProduct = new Map<
      string,
      { productName: string; rolls: (Roll & { id: string })[] }
    >();

    for (const roll of rolls) {
      if (serviceIds.has(roll.productId)) continue;
      const existing = byProduct.get(roll.productId);
      if (existing) {
        existing.rolls.push(roll);
      } else {
        byProduct.set(roll.productId, {
          productName: roll.productName,
          rolls: [roll],
        });
      }
    }

    const products: RollCostingProduct[] = [];

    for (const [productId, entry] of byProduct.entries()) {
      const groupMap = new Map<string, RollCostingGroup>();

      for (const roll of entry.rolls) {
        const batch = roll.batchNumber?.trim() || null;
        const dateKey = receivedDateKey(roll.receivedAt);
        const key = `${batch ?? ""}::${dateKey}`;
        const existing = groupMap.get(key);
        if (existing) {
          existing.rolls.push(roll);
          if (
            receivedAtMillis(roll.receivedAt) <
            receivedAtMillis(existing.receivedAt)
          ) {
            existing.receivedAt = roll.receivedAt ?? null;
          }
        } else {
          groupMap.set(key, {
            batchNumber: batch,
            receivedDate: dateKey,
            receivedAt: roll.receivedAt ?? null,
            rolls: [roll],
          });
        }
      }

      const groups = Array.from(groupMap.values()).sort((a, b) => {
        return receivedAtMillis(b.receivedAt) - receivedAtMillis(a.receivedAt);
      });

      for (const group of groups) {
        group.rolls.sort(
          (a, b) =>
            receivedAtMillis(b.receivedAt) - receivedAtMillis(a.receivedAt),
        );
      }

      const uncostedRolls = entry.rolls.filter(
        (r) => r.unitCost == null || !Number.isFinite(r.unitCost),
      ).length;

      products.push({
        productId,
        productName: entry.productName,
        totalRolls: entry.rolls.length,
        uncostedRolls,
        groups,
      });
    }

    products.sort((a, b) => {
      if (a.uncostedRolls !== b.uncostedRolls) {
        return b.uncostedRolls - a.uncostedRolls;
      }
      return a.productName.localeCompare(b.productName);
    });

    return products;
  }

  static async withdraw(
    organizationId: string,
    data: WithdrawRollData,
    performedBy?: string,
  ): Promise<RollWithdrawal & { id: string }> {
    const barcodeValue =
      typeof data.barcodeValue === "string" ? data.barcodeValue.trim() : "";
    if (!barcodeValue) {
      throw new ApiError(400, "El código de barras es requerido");
    }
    if (!data.projectId || typeof data.projectId !== "string") {
      throw new ApiError(400, "projectId es requerido");
    }

    const withdrawnArea = Number(data.withdrawnArea);
    if (!Number.isFinite(withdrawnArea) || withdrawnArea <= 0) {
      throw new ApiError(400, "withdrawnArea debe ser un número mayor a 0");
    }

    const roll = await this.findByBarcode(organizationId, barcodeValue);
    if (!roll) {
      throw new ApiError(
        404,
        "Rollo no encontrado. Regístralo primero en una importación.",
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

    const product = await ProductService.getById(
      organizationId,
      roll.productId,
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
    assertProductCodeInQuotation(project, product.code);

    const rollRef = this.rollsRef().doc(roll.id);
    const withdrawalRef = this.withdrawalsRef().doc();

    const withdrawal = await db.runTransaction(async (tx) => {
      const rollSnap = await tx.get(rollRef);
      if (!rollSnap.exists) {
        throw new ApiError(
          404,
          "Rollo no encontrado. Regístralo primero en una importación.",
        );
      }

      const current = rollSnap.data() as Roll;
      if (current.organizationId !== organizationId) {
        throw new ApiError(
          404,
          "Rollo no encontrado. Regístralo primero en una importación.",
        );
      }

      if (withdrawnArea > current.remainingArea) {
        throw new ApiError(
          400,
          `No hay suficiente material en este rollo. Quedan ${current.remainingArea}m².`,
        );
      }

      const now = Timestamp.now();
      tx.update(rollRef, {
        remainingArea: round2(current.remainingArea - withdrawnArea),
        updatedAt: now,
      });

      const snapUnitCost =
        typeof current.unitCost === "number" &&
        Number.isFinite(current.unitCost)
          ? current.unitCost
          : null;
      const snapTotalCost =
        snapUnitCost != null
          ? round2(withdrawnArea * snapUnitCost)
          : null;

      const record: RollWithdrawal = {
        organizationId,
        rollId: roll.id,
        productId: current.productId,
        projectId: data.projectId,
        projectName: project.name,
        withdrawnArea,
        unitCost: snapUnitCost,
        totalCost: snapTotalCost,
        withdrawnAt: now,
        reversed: false,
        reversedAt: null,
        reversedBy: null,
        ...(performedBy ? { performedBy } : {}),
      };

      tx.set(withdrawalRef, record);
      return { id: withdrawalRef.id, ...record };
    });

    // Sync inventory materials rubro when this withdrawal already has a cost.
    if (withdrawal.totalCost != null) {
      await this.syncProjectInventoryCost(organizationId, data.projectId);
    }

    return withdrawal;
  }

  /**
   * Admin: set roll unitCost (per m²) from total roll cost or per-m² input.
   * Backfills null-cost withdrawals and syncs affected project cost rubros.
   */
  static async setCost(
    organizationId: string,
    rollId: string,
    data: SetRollCostData,
  ): Promise<Roll & { id: string }> {
    const roll = await this.getById(organizationId, rollId);
    if (!roll) {
      throw new ApiError(404, "Rollo no encontrado");
    }
    if (!(roll.totalArea > 0)) {
      throw new ApiError(400, "El rollo no tiene área válida para costear");
    }

    let unitCost: number;
    if (data.mode === "total") {
      const total = Number(data.totalCost);
      if (!Number.isFinite(total) || total < 0) {
        throw new ApiError(400, "totalCost debe ser un número >= 0");
      }
      unitCost = round2(total / roll.totalArea);
    } else if (data.mode === "perM2") {
      const perM2 = Number(data.unitCost);
      if (!Number.isFinite(perM2) || perM2 < 0) {
        throw new ApiError(400, "unitCost debe ser un número >= 0");
      }
      unitCost = round2(perM2);
    } else {
      throw new ApiError(400, "mode debe ser 'total' o 'perM2'");
    }

    const now = Timestamp.now();
    await this.rollsRef().doc(rollId).update({
      unitCost,
      updatedAt: now,
    });

    const affectedProjectIds = await this.backfillWithdrawals(
      organizationId,
      rollId,
      unitCost,
    );

    for (const projectId of affectedProjectIds) {
      await this.syncProjectInventoryCost(organizationId, projectId);
    }

    const updated = await this.getById(organizationId, rollId);
    if (!updated) {
      throw new ApiError(404, "Rollo no encontrado");
    }
    return updated;
  }

  /**
   * Fills unitCost/totalCost on withdrawals of this roll where totalCost is null.
   * Returns unique projectIds that were backfilled.
   */
  static async backfillWithdrawals(
    organizationId: string,
    rollId: string,
    unitCost: number,
  ): Promise<string[]> {
    const snapshot = await this.withdrawalsRef()
      .where("organizationId", "==", organizationId)
      .where("rollId", "==", rollId)
      .get();

    const projectIds = new Set<string>();
    const batch = db.batch();
    let ops = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data() as RollWithdrawal;
      if (data.reversed === true) continue;
      const needsBackfill =
        data.totalCost == null ||
        !Number.isFinite(Number(data.totalCost));
      if (!needsBackfill) continue;

      const totalCost = round2(Number(data.withdrawnArea) * unitCost);
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
   * Sum of non-null totalCosts from roll withdrawals (+ unit outs with totalCost)
   * and upsert the inventory materials cost item.
   */
  static async syncProjectInventoryCost(
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const amount = await this.sumInventoryTotalCost(
      organizationId,
      projectId,
    );
    await CostItemService.syncInventoryMaterialsCost(
      organizationId,
      projectId,
      amount,
    );
  }

  static async sumInventoryTotalCost(
    organizationId: string,
    projectId: string,
  ): Promise<number> {
    let total = 0;

    const rollSnap = await this.withdrawalsRef()
      .where("organizationId", "==", organizationId)
      .where("projectId", "==", projectId)
      .get();

    for (const doc of rollSnap.docs) {
      const data = doc.data() as RollWithdrawal;
      if (data.reversed === true) continue;
      if (typeof data.totalCost === "number" && Number.isFinite(data.totalCost)) {
        total += data.totalCost;
      }
    }

    // Unit stock outs that already carry totalCost (when that field exists).
    try {
      const unitSnap = await db
        .collection(UNIT_MOVEMENTS_COLLECTION)
        .where("organizationId", "==", organizationId)
        .where("projectId", "==", projectId)
        .where("type", "==", "out")
        .get();

      for (const doc of unitSnap.docs) {
        const data = doc.data() as {
          totalCost?: number | null;
          reversed?: boolean;
        };
        if (data.reversed === true) continue;
        if (
          typeof data.totalCost === "number" &&
          Number.isFinite(data.totalCost)
        ) {
          total += data.totalCost;
        }
      }
    } catch {
      // Index may be missing; roll costs still sync.
    }

    return round2(total);
  }

  /**
   * Aggregated stock per roll product.
   * Includes every physical catalog product with type === "roll" (legacy
   * missing type counts as roll), plus any product that already has roll
   * documents — matching unit-stock which lists all unit products even at 0.
   * Services (kind === "servicio") are always excluded.
   */
  static async getStockByProduct(
    organizationId: string,
  ): Promise<ProductStock[]> {
    const [rollsSnap, catalog] = await Promise.all([
      this.rollsRef().where("organizationId", "==", organizationId).get(),
      ProductService.list(organizationId),
    ]);

    const serviceIds = new Set(
      catalog.filter((p) => !isInventoryProduct(p)).map((p) => p.id),
    );
    const rollProducts = catalog.filter(
      (p) => isInventoryProduct(p) && resolveProductType(p) === "roll",
    );

    const byProduct = new Map<
      string,
      { productName: string; availableArea: number; availableRollCount: number }
    >();

    for (const product of rollProducts) {
      byProduct.set(product.id, {
        productName: product.name || "Producto",
        availableArea: 0,
        availableRollCount: 0,
      });
    }

    for (const doc of rollsSnap.docs) {
      const roll = doc.data() as Roll;
      if (serviceIds.has(roll.productId)) continue;

      const remainingRaw = Number(roll.remainingArea);
      // Legacy: if remainingArea was never written, fall back to totalArea.
      const available =
        Number.isFinite(remainingRaw) && remainingRaw > 0
          ? remainingRaw
          : (roll.remainingArea === undefined || roll.remainingArea === null) &&
              Number.isFinite(Number(roll.totalArea)) &&
              Number(roll.totalArea) > 0
            ? Number(roll.totalArea)
            : 0;

      const existing = byProduct.get(roll.productId);
      if (existing) {
        if (available > 0) {
          existing.availableArea = round2(existing.availableArea + available);
          existing.availableRollCount += 1;
        }
        if (!existing.productName && roll.productName) {
          existing.productName = roll.productName;
        }
      } else {
        byProduct.set(roll.productId, {
          productName: roll.productName || "Producto",
          availableArea: available > 0 ? round2(available) : 0,
          availableRollCount: available > 0 ? 1 : 0,
        });
      }
    }

    return Array.from(byProduct.entries())
      .map(([productId, stock]) => ({
        productId,
        productName: stock.productName,
        availableArea: stock.availableArea,
        availableRollCount: stock.availableRollCount,
      }))
      .sort((a, b) => b.availableArea - a.availableArea);
  }

  static async listWithdrawalsByProject(
    organizationId: string,
    projectId: string,
  ): Promise<(RollWithdrawal & { id: string })[]> {
    const snapshot = await this.withdrawalsRef()
      .where("organizationId", "==", organizationId)
      .where("projectId", "==", projectId)
      .orderBy("withdrawnAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as RollWithdrawal),
    }));
  }

  /**
   * All withdrawals for a single roll (including reversed), newest first.
   */
  static async listWithdrawalsByRoll(
    organizationId: string,
    rollId: string,
  ): Promise<(RollWithdrawal & { id: string })[]> {
    const roll = await this.getById(organizationId, rollId);
    if (!roll) {
      throw new ApiError(404, "Rollo no encontrado");
    }

    const snapshot = await this.withdrawalsRef()
      .where("organizationId", "==", organizationId)
      .where("rollId", "==", rollId)
      .get();

    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as RollWithdrawal),
    }));

    list.sort((a, b) => {
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

    return list;
  }

  /**
   * Admin: reverse a roll withdrawal — restore area to the roll and soft-mark
   * the withdrawal. Recalculates inventory cost rubro and orphaned codes.
   */
  static async reverseWithdrawal(
    organizationId: string,
    withdrawalId: string,
    reversedBy?: string,
  ): Promise<RollWithdrawal & { id: string }> {
    const withdrawalRef = this.withdrawalsRef().doc(withdrawalId);
    const withdrawalSnap = await withdrawalRef.get();
    if (!withdrawalSnap.exists) {
      throw new ApiError(404, "Retiro no encontrado");
    }
    const withdrawal = withdrawalSnap.data() as RollWithdrawal;
    if (withdrawal.organizationId !== organizationId) {
      throw new ApiError(404, "Retiro no encontrado");
    }
    if (withdrawal.reversed === true) {
      throw new ApiError(400, "Este retiro ya fue revertido");
    }

    const withdrawnArea = Number(withdrawal.withdrawnArea);
    if (!Number.isFinite(withdrawnArea) || withdrawnArea <= 0) {
      throw new ApiError(400, "El retiro no tiene un área válida");
    }

    const rollRef = this.rollsRef().doc(withdrawal.rollId);

    const updated = await db.runTransaction(async (tx) => {
      const [wdSnap, rollSnap] = await Promise.all([
        tx.get(withdrawalRef),
        tx.get(rollRef),
      ]);

      if (!wdSnap.exists) {
        throw new ApiError(404, "Retiro no encontrado");
      }
      const currentWd = wdSnap.data() as RollWithdrawal;
      if (currentWd.organizationId !== organizationId) {
        throw new ApiError(404, "Retiro no encontrado");
      }
      if (currentWd.reversed === true) {
        throw new ApiError(400, "Este retiro ya fue revertido");
      }

      if (!rollSnap.exists) {
        throw new ApiError(404, "Rollo no encontrado");
      }
      const roll = rollSnap.data() as Roll;
      if (roll.organizationId !== organizationId) {
        throw new ApiError(404, "Rollo no encontrado");
      }

      const area = Number(currentWd.withdrawnArea);
      const nextRemaining = round2(
        Math.min(
          Number(roll.totalArea) || 0,
          (Number(roll.remainingArea) || 0) + area,
        ),
      );
      const now = Timestamp.now();

      tx.update(rollRef, {
        remainingArea: nextRemaining,
        updatedAt: now,
      });
      tx.update(withdrawalRef, {
        reversed: true,
        reversedAt: now,
        reversedBy: reversedBy ?? null,
      });

      return {
        id: withdrawalId,
        ...currentWd,
        reversed: true,
        reversedAt: now,
        reversedBy: reversedBy ?? null,
      } as RollWithdrawal & { id: string };
    });

    // Always re-sum: reversed row must drop out even when totalCost was null.
    await this.syncProjectInventoryCost(organizationId, updated.projectId);

    const product = await ProductService.getById(
      organizationId,
      updated.productId,
    );
    if (product?.code) {
      await ProjectService.pruneOrphanedInventoryCode(
        organizationId,
        updated.projectId,
        product.code,
      );
    }

    return updated;
  }
}
