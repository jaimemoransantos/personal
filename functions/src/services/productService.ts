import { db } from "../config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductType,
  ProductKind,
} from "../types/product";
import {
  isInventoryProduct,
  resolveProductKind,
  resolveProductType,
} from "../types/product";
import { ApiError } from "../utils/errors";
import {
  parseExcelToRows,
  mapRowToProduct,
} from "../utils/excelParser";

const PRODUCTS_COLLECTION = "products";

/** Remove unitCost so chief/technician never see inventory cost. */
export function stripUnitCost<T extends Record<string, unknown>>(
  product: T,
): Omit<T, "unitCost"> {
  const { unitCost: _unitCost, ...rest } = product;
  return rest;
}

export function presentProduct<T extends Record<string, unknown>>(
  product: T,
  isAdmin: boolean,
): T | Omit<T, "unitCost"> {
  if (isAdmin) return product;
  return stripUnitCost(product);
}

export class ProductService {
  static async list(
    organizationId: string
  ): Promise<(Product & { id: string })[]> {
    const snapshot = await db
      .collection(PRODUCTS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Product & { id: string })[];
  }

  /**
   * Physical products (kind !== servicio) filtered by inventory type.
   * Services are never returned — they do not participate in stock.
   */
  static async listByType(
    organizationId: string,
    type: ProductType,
  ): Promise<(Product & { id: string })[]> {
    const all = await this.list(organizationId);
    return all.filter(
      (p) =>
        isInventoryProduct(p) && resolveProductType(p) === type,
    );
  }

  static async getById(
    organizationId: string,
    productId: string
  ): Promise<(Product & { id: string }) | null> {
    const doc = await db.collection(PRODUCTS_COLLECTION).doc(productId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Product & { organizationId?: string };
    if (data?.organizationId !== organizationId) return null;
    return { id: doc.id, ...data } as Product & { id: string };
  }

  static async create(
    organizationId: string,
    data: CreateProductData,
    createdBy?: string
  ): Promise<Product & { id: string }> {
    if (data.kind !== "producto" && data.kind !== "servicio") {
      throw new ApiError(
        400,
        "Categoría es obligatoria (producto o servicio)",
      );
    }
    const kind: ProductKind = data.kind;
    const ref = db.collection(PRODUCTS_COLLECTION).doc();
    const now = Timestamp.now();
    const payload: Record<string, unknown> = {
      organizationId,
      code: data.code,
      name: data.name,
      subtitle: data.subtitle,
      price: data.price,
      kind,
      createdAt: now,
      updatedAt: now,
      ...(createdBy ? { createdBy } : {}),
    };

    if (kind === "producto") {
      if (data.type !== "roll" && data.type !== "unit") {
        throw new ApiError(
          400,
          "Tipo de producto es obligatorio (roll o unit)",
        );
      }
      const type: ProductType = data.type;
      payload.type = type;
      if (type === "unit") {
        payload.stockQuantity = 0;
        payload.unitCost = null;
      }
    }

    await ref.set(payload);
    const created = await ref.get();
    return { id: created.id, ...created.data() } as Product & { id: string };
  }

  /**
   * True if the product already has rolls or unit stock movements.
   * Used to lock type/kind changes that affect inventory.
   */
  static async hasInventoryActivity(
    organizationId: string,
    productId: string,
  ): Promise<boolean> {
    const rollsSnap = await db
      .collection("rolls")
      .where("organizationId", "==", organizationId)
      .where("productId", "==", productId)
      .limit(1)
      .get();
    if (!rollsSnap.empty) return true;

    const movementsSnap = await db
      .collection("unitStockMovements")
      .where("organizationId", "==", organizationId)
      .where("productId", "==", productId)
      .limit(1)
      .get();
    return !movementsSnap.empty;
  }

  static async update(
    organizationId: string,
    productId: string,
    data: UpdateProductData
  ): Promise<Product & { id: string }> {
    const ref = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Producto no encontrado");
    }
    const existing = doc.data() as Product;
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Producto no encontrado");
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (data.code !== undefined) updatePayload.code = data.code;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.subtitle !== undefined) updatePayload.subtitle = data.subtitle;
    if (data.price !== undefined) updatePayload.price = data.price;

    const currentKind = resolveProductKind(existing);
    const nextKind =
      data.kind === "producto" || data.kind === "servicio"
        ? data.kind
        : currentKind;
    const kindChanging = nextKind !== currentKind;

    if (kindChanging) {
      const locked = await this.hasInventoryActivity(
        organizationId,
        productId,
      );
      if (locked) {
        throw new ApiError(
          400,
          "No se puede cambiar la categoría: el producto ya tiene movimientos de inventario",
        );
      }
      updatePayload.kind = nextKind;

      if (nextKind === "servicio") {
        updatePayload.type = FieldValue.delete();
        updatePayload.stockQuantity = FieldValue.delete();
        updatePayload.unitCost = FieldValue.delete();
      } else {
        // Switching servicio → producto: type is required.
        if (data.type !== "roll" && data.type !== "unit") {
          throw new ApiError(
            400,
            "Tipo de producto es obligatorio al cambiar a producto (roll o unit)",
          );
        }
        updatePayload.type = data.type;
        if (data.type === "unit") {
          updatePayload.stockQuantity = 0;
          updatePayload.unitCost = null;
        }
      }
    } else if (nextKind === "producto" && data.type !== undefined) {
      if (data.type !== "roll" && data.type !== "unit") {
        throw new ApiError(400, "Tipo de producto inválido");
      }
      const currentType = resolveProductType(existing);
      if (data.type !== currentType) {
        const locked = await this.hasInventoryActivity(
          organizationId,
          productId,
        );
        if (locked) {
          throw new ApiError(
            400,
            "No se puede cambiar el tipo: el producto ya tiene movimientos de inventario",
          );
        }
        updatePayload.type = data.type;
        if (data.type === "unit") {
          if (existing.stockQuantity === undefined) {
            updatePayload.stockQuantity = 0;
          }
          if (existing.unitCost === undefined) {
            updatePayload.unitCost = null;
          }
        }
      }
    } else if (nextKind === "servicio" && data.type !== undefined) {
      // Type is meaningless for services — ignore silently.
    }

    await ref.update(updatePayload);
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Product & { id: string };
  }

  /**
   * Admin-only: set or clear unitCost on a type === "unit" product.
   */
  static async updateUnitCost(
    organizationId: string,
    productId: string,
    unitCost: number | null,
  ): Promise<Product & { id: string }> {
    const ref = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Producto no encontrado");
    }
    const existing = doc.data() as Product;
    if (existing.organizationId !== organizationId) {
      throw new ApiError(404, "Producto no encontrado");
    }
    if (!isInventoryProduct(existing)) {
      throw new ApiError(400, "Los servicios no admiten unitCost");
    }
    if (resolveProductType(existing) !== "unit") {
      throw new ApiError(
        400,
        "Solo productos por unidad admiten unitCost",
      );
    }
    if (unitCost !== null) {
      if (typeof unitCost !== "number" || !Number.isFinite(unitCost) || unitCost < 0) {
        throw new ApiError(400, "unitCost debe ser un número >= 0 o null");
      }
    }
    await ref.update({
      unitCost,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Product & { id: string };
  }

  static async delete(
    organizationId: string,
    productId: string
  ): Promise<void> {
    const ref = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Producto no encontrado");
    }
    const data = doc.data() as { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Producto no encontrado");
    }
    await ref.delete();
  }

  static async importFromExcel(
    organizationId: string,
    base64: string,
    createdBy?: string
  ): Promise<{ created: number; skipped: number }> {
    const buffer = Buffer.from(base64, "base64");
    const rows = parseExcelToRows(buffer);
    let created = 0;
    let skipped = 0;
    const now = Timestamp.now();
    const coll = db.collection(PRODUCTS_COLLECTION);
    for (const row of rows) {
      const p = mapRowToProduct(row);
      if (!p.code && !p.name) {
        skipped++;
        continue;
      }
      const docRef = coll.doc();
      await docRef.set({
        organizationId,
        code: p.code || "",
        name: p.name || "",
        subtitle: p.subtitle || "",
        price: p.price ?? 0,
        kind: "producto",
        type: "roll",
        createdAt: now,
        updatedAt: now,
        ...(createdBy ? { createdBy } : {}),
      });
      created++;
    }
    return { created, skipped };
  }
}
