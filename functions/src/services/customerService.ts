import { db } from "../config/firebase-admin";
import { Timestamp, type DocumentReference } from "firebase-admin/firestore";
import type { Customer, CreateCustomerData } from "../types/customer";
import { ApiError } from "../utils/errors";
import {
  parseExcelToRows,
  mapRowToCustomer,
} from "../utils/excelParser";

const CUSTOMERS_COLLECTION = "customers";

/** Find existing customer doc by organizationId + document. Returns doc ref or null. */
async function findByDocument(
  organizationId: string,
  document: string,
  excludeCustomerId?: string
): Promise<DocumentReference | null> {
  if (!document.trim()) return null;
  const snapshot = await db
    .collection(CUSTOMERS_COLLECTION)
    .where("organizationId", "==", organizationId)
    .where("document", "==", document.trim())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  if (excludeCustomerId && doc.id === excludeCustomerId) return null;
  return doc.ref;
}

export class CustomerService {
  /** Find customer id by organizationId + document (RUC/CI). For linking quotes to existing customers. */
  static async findIdByDocument(
    organizationId: string,
    document: string
  ): Promise<string | null> {
    const ref = await findByDocument(organizationId, document);
    return ref ? ref.id : null;
  }

  static async list(
    organizationId: string
  ): Promise<(Customer & { id: string })[]> {
    const snapshot = await db
      .collection(CUSTOMERS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .get();
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Customer & { id: string })[];
    list.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })
    );
    return list;
  }

  static async getById(
    organizationId: string,
    customerId: string
  ): Promise<(Customer & { id: string }) | null> {
    const doc = await db.collection(CUSTOMERS_COLLECTION).doc(customerId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Customer & { organizationId?: string };
    if (data?.organizationId !== organizationId) return null;
    return { id: doc.id, ...data } as Customer & { id: string };
  }

  static async create(
    organizationId: string,
    data: CreateCustomerData,
    createdBy?: string
  ): Promise<Customer & { id: string }> {
    const now = Timestamp.now();
    const payload = {
      organizationId,
      name: data.name,
      document: data.document ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      address: data.address ?? "",
      updatedAt: now,
    };

    if (data.document?.trim()) {
      const existingRef = await findByDocument(organizationId, data.document);
      if (existingRef) {
        await existingRef.update(payload);
        const updated = await existingRef.get();
        return { id: updated.id, ...updated.data() } as Customer & { id: string };
      }
    }

    const ref = db.collection(CUSTOMERS_COLLECTION).doc();
    await ref.set({
      ...payload,
      createdAt: now,
      updatedAt: now,
      ...(createdBy ? { createdBy } : {}),
    });
    const created = await ref.get();
    return { id: created.id, ...created.data() } as Customer & { id: string };
  }

  static async update(
    organizationId: string,
    customerId: string,
    data: Partial<CreateCustomerData>
  ): Promise<Customer & { id: string }> {
    const ref = db.collection(CUSTOMERS_COLLECTION).doc(customerId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cliente no encontrado");
    }
    const existing = doc.data() as { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Cliente no encontrado");
    }
    if (data.document !== undefined && data.document?.trim()) {
      const existingRef = await findByDocument(
        organizationId,
        data.document,
        customerId
      );
      if (existingRef) {
        throw new ApiError(
          409,
          "Ya existe otro cliente con este RUC/Cédula en esta organización."
        );
      }
    }
    await ref.update({
      ...data,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Customer & { id: string };
  }

  static async delete(
    organizationId: string,
    customerId: string
  ): Promise<void> {
    const ref = db.collection(CUSTOMERS_COLLECTION).doc(customerId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cliente no encontrado");
    }
    const data = doc.data() as { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Cliente no encontrado");
    }
    await ref.delete();
  }

  /**
   * Excel "Listado de Terceros": first two rows are text, row 3 (index 2) = column names.
   * If no rows are valid with index 2, tries index 1 (headers on second row).
   */
  static async importFromExcel(
    organizationId: string,
    base64: string,
    createdBy?: string
  ): Promise<{
    created: number;
    updated: number;
    skipped: number;
    skippedRows: { excelRow: number; name: string; document: string; email: string; phone: string; address: string }[];
  }> {
    const buffer = Buffer.from(base64, "base64");
    let rows = parseExcelToRows(buffer, 2);
    let headerRowIndex = 2;
    const validCount = rows.filter((row) => {
      const c = mapRowToCustomer(row);
      return !!(c.name || c.document || c.email);
    }).length;
    if (validCount === 0 && rows.length > 0) {
      rows = parseExcelToRows(buffer, 1);
      headerRowIndex = 1;
    }
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const skippedRows: { excelRow: number; name: string; document: string; email: string; phone: string; address: string }[] = [];
    const now = Timestamp.now();
    const coll = db.collection(CUSTOMERS_COLLECTION);
    const payload = (c: ReturnType<typeof mapRowToCustomer>) => ({
      organizationId,
      name: c.name || "",
      document: c.document || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      updatedAt: now,
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const c = mapRowToCustomer(row);
      const excelRow = headerRowIndex + 2 + i;
      if (!c.name && !c.document && !c.email) {
        skipped++;
        skippedRows.push({
          excelRow,
          name: c.name || "",
          document: c.document || "",
          email: c.email || "",
          phone: c.phone || "",
          address: c.address || "",
        });
        continue;
      }
      if (c.document?.trim()) {
        const existingRef = await findByDocument(organizationId, c.document);
        if (existingRef) {
          await existingRef.update(payload(c));
          updated++;
          continue;
        }
      }
      const docRef = coll.doc();
      await docRef.set({
        ...payload(c),
        createdAt: now,
        ...(createdBy ? { createdBy } : {}),
      });
      created++;
    }
    return { created, updated, skipped, skippedRows };
  }
}
