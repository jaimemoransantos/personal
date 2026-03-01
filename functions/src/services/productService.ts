import { db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Product, CreateProductData } from "../types/product";
import { ApiError } from "../utils/errors";
import {
  parseExcelToRows,
  mapRowToProduct,
} from "../utils/excelParser";

const PRODUCTS_COLLECTION = "products";

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
    const ref = db.collection(PRODUCTS_COLLECTION).doc();
    const now = Timestamp.now();
    await ref.set({
      organizationId,
      ...data,
      createdAt: now,
      updatedAt: now,
      ...(createdBy ? { createdBy } : {}),
    });
    const created = await ref.get();
    return { id: created.id, ...created.data() } as Product & { id: string };
  }

  static async update(
    organizationId: string,
    productId: string,
    data: Partial<CreateProductData>
  ): Promise<Product & { id: string }> {
    const ref = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Producto no encontrado");
    }
    const existing = doc.data() as { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Producto no encontrado");
    }
    await ref.update({
      ...data,
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
        createdAt: now,
        updatedAt: now,
        ...(createdBy ? { createdBy } : {}),
      });
      created++;
    }
    return { created, skipped };
  }
}
