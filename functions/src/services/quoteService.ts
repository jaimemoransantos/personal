import { db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Quote, CreateQuoteData } from "../types/quote";
import { ApiError } from "../utils/errors";

const QUOTES_COLLECTION = "quotes";

export class QuoteService {
  static async list(
    organizationId: string
  ): Promise<(Quote & { id: string })[]> {
    const snapshot = await db
      .collection(QUOTES_COLLECTION)
      .where("organizationId", "==", organizationId)
      .orderBy("updatedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Quote & { id: string })[];
  }

  static async getById(
    organizationId: string,
    quoteId: string
  ): Promise<(Quote & { id: string }) | null> {
    const doc = await db.collection(QUOTES_COLLECTION).doc(quoteId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Quote & { organizationId?: string };
    if (data?.organizationId !== organizationId) return null;
    return { id: doc.id, ...data } as Quote & { id: string };
  }

  static async create(
    organizationId: string,
    data: CreateQuoteData,
    createdBy?: string
  ): Promise<Quote & { id: string }> {
    const ref = db.collection(QUOTES_COLLECTION).doc();
    const now = Timestamp.now();
    const quote: Omit<Quote, "id"> = {
      organizationId,
      client: data.client,
      items: data.items,
      discount: data.discount ?? 0,
      validity: data.validity ?? "",
      deliveryPlace: data.deliveryPlace ?? "",
      deliveryTime: data.deliveryTime ?? "",
      paymentMethod: data.paymentMethod ?? "",
      disclaimer: data.disclaimer ?? "",
      notes: data.notes ?? "",
      createdAt: now,
      updatedAt: now,
      ...(createdBy ? { createdBy } : {}),
    };
    await ref.set(quote);
    const created = await ref.get();
    return { id: created.id, ...created.data() } as Quote & { id: string };
  }

  static async update(
    organizationId: string,
    quoteId: string,
    data: Partial<CreateQuoteData>
  ): Promise<Quote & { id: string }> {
    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    const existing = doc.data() as { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    await ref.update({
      ...data,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Quote & { id: string };
  }

  static async delete(
    organizationId: string,
    quoteId: string
  ): Promise<void> {
    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    const data = doc.data() as { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    await ref.delete();
  }
}
