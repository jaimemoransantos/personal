import { db } from "../config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Quote, CreateQuoteData, QuoteClient } from "../types/quote";
import type { Project } from "../types/project";
import { ApiError } from "../utils/errors";
import { buildQuotationSnapshot } from "../utils/quotationProducts";
import { CustomerService } from "./customerService";
import { ProjectService } from "./projectService";

const QUOTES_COLLECTION = "quotes";
const PROJECTS_COLLECTION = "projects";
const QUOTE_COUNTERS_COLLECTION = "quoteCounters";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeSubtotal(
  items: { quantity: number; price: number }[] = [],
): number {
  const subtotal = items.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.price) || 0;
    return sum + q * p;
  }, 0);
  return round2(Math.max(0, subtotal));
}

function clampDiscount(discount: unknown, subtotal: number): number {
  const d = Number(discount);
  if (!Number.isFinite(d) || d <= 0) return 0;
  return round2(Math.min(d, subtotal));
}

function buildSearchTerms(client: QuoteClient): string {
  const parts = [
    client.name,
    client.reference,
    client.project,
    client.document,
  ].filter((s): s is string => typeof s === "string" && s.trim() !== "");
  return parts.join(" ").toLowerCase().trim();
}

/**
 * Atomically obtain the next sequential quote number for an organization and year.
 *
 * Format: `${year}${sequencePadded}`, e.g. 2026000079.
 * - year: current UTC year (e.g. 2026)
 * - sequence: per-organization counter for that year (starting at 79 in 2026 per current requirement)
 */
async function getNextQuoteNumber(organizationId: string): Promise<string> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const counterId = `${organizationId}_${year}`;
  const counterRef = db.collection(QUOTE_COUNTERS_COLLECTION).doc(counterId);

  const snapshot = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    let current = 0;

    if (!doc.exists) {
      // Start at 0 so the first generated number will be 0 in this year.
      // For future years, you can adjust this initial value if needed.
      current = 0;
      tx.set(counterRef, {
        organizationId,
        year,
        current,
        updatedAt: Timestamp.now(),
      });
    } else {
      const data = doc.data() as { current?: number };
      current = typeof data.current === "number" ? data.current : 0;
    }

    const next = current + 1;

    tx.update(counterRef, {
      current: next,
      updatedAt: Timestamp.now(),
    });

    return { year, sequence: next };
  });

  const sequencePadded = String(snapshot.sequence).padStart(6, "0");
  return `${snapshot.year}${sequencePadded}`;
}

export class QuoteService {
  static async list(
    organizationId: string,
  ): Promise<(Quote & { id: string })[]> {
    const snapshot = await db
      .collection(QUOTES_COLLECTION)
      .where("organizationId", "==", organizationId)
      .orderBy("updatedAt", "desc")
      .get();
    const result: (Quote & { id: string })[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data() as Quote;
      const items = (data.items ?? []) as { quantity: number; price: number }[];
      const subtotal = computeSubtotal(items);
      const appliedDiscount = clampDiscount(data.discount, subtotal);
      const amount = round2(Math.max(0, subtotal - appliedDiscount));

      const needsBackfill =
        typeof data.amount !== "number" ||
        !Number.isFinite(data.amount) ||
        typeof data.subtotal !== "number" ||
        !Number.isFinite(data.subtotal) ||
        data.discount !== appliedDiscount;

      if (needsBackfill) {
        await doc.ref.update({
          subtotal,
          discount: appliedDiscount,
          amount,
          updatedAt: Timestamp.now(),
        });
      }

      result.push({
        id: doc.id,
        ...data,
        subtotal,
        discount: appliedDiscount,
        amount,
      } as Quote & { id: string });
    }

    return result;
  }

  static async getById(
    organizationId: string,
    quoteId: string,
  ): Promise<(Quote & { id: string }) | null> {
    const doc = await db.collection(QUOTES_COLLECTION).doc(quoteId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Quote & { organizationId?: string };
    if (data?.organizationId !== organizationId) return null;
    const items = (data.items ?? []) as { quantity: number; price: number }[];
    const subtotal = computeSubtotal(items);
    const appliedDiscount = clampDiscount(data.discount, subtotal);
    const amount = round2(Math.max(0, subtotal - appliedDiscount));

    const needsBackfill =
      typeof data.amount !== "number" ||
      !Number.isFinite(data.amount) ||
      typeof data.subtotal !== "number" ||
      !Number.isFinite(data.subtotal) ||
      data.discount !== appliedDiscount;

    if (needsBackfill) {
      await doc.ref.update({
        subtotal,
        discount: appliedDiscount,
        amount,
        updatedAt: Timestamp.now(),
      });
    }

    return {
      id: doc.id,
      ...data,
      subtotal,
      discount: appliedDiscount,
      amount,
    } as Quote & { id: string };
  }

  static async create(
    organizationId: string,
    data: CreateQuoteData,
    createdBy?: string,
  ): Promise<Quote & { id: string }> {
    let customerId = data.customerId ?? undefined;
    if (!customerId && data.client?.document?.trim()) {
      const found = await CustomerService.findIdByDocument(
        organizationId,
        data.client.document,
      );
      if (found) customerId = found;
    }
    const ref = db.collection(QUOTES_COLLECTION).doc();
    const now = Timestamp.now();
    const subtotal = computeSubtotal(data.items || []);
    const appliedDiscount = clampDiscount(data.discount, subtotal);
    const amount = round2(Math.max(0, subtotal - appliedDiscount));

    const quoteNumber = await getNextQuoteNumber(organizationId);

    const quote: Omit<Quote, "id"> = {
      organizationId,
      ...(customerId ? { customerId } : {}),
      client: data.client,
      items: data.items,
      subtotal,
      discount: appliedDiscount,
      amount,
      quoteNumber,
      status: data.status ?? "pending",
      searchTerms: buildSearchTerms(data.client),
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
    data: Partial<CreateQuoteData>,
  ): Promise<Quote & { id: string }> {
    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    const existing = doc.data() as Quote & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    const effectiveItems = (data.items ?? existing.items ?? []) as {
      quantity: number;
      price: number;
    }[];
    const effectiveDiscount =
      data.discount !== undefined ? data.discount : existing.discount;
    const subtotal = computeSubtotal(effectiveItems);
    const appliedDiscount = clampDiscount(effectiveDiscount, subtotal);
    const amount = round2(Math.max(0, subtotal - appliedDiscount));

    const client = data.client ?? existing.client;
    const updatePayload: Record<string, unknown> = {
      ...data,
      items: effectiveItems,
      discount: appliedDiscount,
      subtotal,
      amount,
      searchTerms: buildSearchTerms(client),
      updatedAt: Timestamp.now(),
    };
    if (data.status !== undefined) updatePayload.status = data.status;
    if (
      client?.document?.trim() &&
      updatePayload.customerId === undefined &&
      existing.customerId === undefined
    ) {
      const found = await CustomerService.findIdByDocument(
        organizationId,
        client.document,
      );
      if (found) updatePayload.customerId = found;
    }
    await ref.update(updatePayload);
    const updated = await ref.get();
    const quote = { id: updated.id, ...updated.data() } as Quote & {
      id: string;
    };

    const projectId =
      typeof quote.projectId === "string" && quote.projectId.trim()
        ? quote.projectId.trim()
        : typeof existing.projectId === "string" && existing.projectId.trim()
          ? existing.projectId.trim()
          : null;

    if (projectId) {
      const snapshot = buildQuotationSnapshot(quote);
      await ProjectService.syncQuotationSnapshot(
        organizationId,
        projectId,
        snapshot,
      );
    }

    return quote;
  }

  static async delete(organizationId: string, quoteId: string): Promise<void> {
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

  /**
   * Convierte una cotización aceptada en un proyecto.
   * Crea el proyecto y marca la cotización de forma atómica.
   */
  static async convertToProject(
    organizationId: string,
    quoteId: string,
    createdBy?: string,
  ): Promise<Project & { id: string }> {
    const quoteRef = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const projectRef = db.collection(PROJECTS_COLLECTION).doc();

    return db.runTransaction(async (tx) => {
      const quoteDoc = await tx.get(quoteRef);
      if (!quoteDoc.exists) {
        throw new ApiError(404, "Cotización no encontrada");
      }
      const quote = quoteDoc.data() as Quote & { organizationId?: string };
      if (quote?.organizationId !== organizationId) {
        throw new ApiError(404, "Cotización no encontrada");
      }
      if (quote.status !== "accepted") {
        throw new ApiError(
          400,
          "Solo se puede convertir una cotización aceptada",
        );
      }
      if (quote.projectId) {
        throw new ApiError(
          400,
          `Esta cotización ya fue convertida a un proyecto (${quote.projectId})`,
        );
      }

      const now = Timestamp.now();
      const quotationSnapshot = buildQuotationSnapshot(quote);
      const name = `Proyecto ${quote.client?.name ?? quote.quoteNumber ?? quoteId}`;

      const project: Omit<Project, "id"> = {
        organizationId,
        quotationId: quoteId,
        quotationSnapshot,
        name,
        status: "planificado",
        elements: [],
        createdAt: now,
        updatedAt: now,
        ...(createdBy ? { createdBy } : {}),
      };

      tx.set(projectRef, project);
      tx.update(quoteRef, {
        projectId: projectRef.id,
        convertedAt: now,
        updatedAt: now,
      });

      return { id: projectRef.id, ...project } as Project & { id: string };
    });
  }

  /**
   * Monto por cobrar (calculado en el frontend sobre GET /api/quotes):
   *
   *   por_cobrar_de_una_cotización =
   *     (status === "accepted" && !writtenOff)
   *       ? max(0, amount - paidAmount)
   *       : 0
   */

  static async updatePaidAmount(
    organizationId: string,
    quoteId: string,
    paidAmount: number,
  ): Promise<Quote & { id: string }> {
    const value = round2(Number(paidAmount));
    if (!Number.isFinite(value) || value < 0) {
      throw new ApiError(400, "El monto pagado debe ser mayor o igual a 0");
    }

    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    const existing = doc.data() as Quote & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Cotización no encontrada");
    }

    const amount =
      typeof existing.amount === "number" && Number.isFinite(existing.amount)
        ? existing.amount
        : 0;
    if (value > amount) {
      throw new ApiError(
        400,
        "El monto pagado no puede superar el total de la cotización",
      );
    }

    await ref.update({
      paidAmount: value,
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Quote & { id: string };
  }

  static async writeOff(
    organizationId: string,
    quoteId: string,
    reason?: string,
  ): Promise<Quote & { id: string }> {
    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    const existing = doc.data() as Quote & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    if (existing.status !== "accepted") {
      throw new ApiError(
        400,
        "Solo se puede dar de baja una cotización aceptada",
      );
    }

    const now = Timestamp.now();
    const trimmedReason =
      typeof reason === "string" && reason.trim() ? reason.trim() : null;

    await ref.update({
      writtenOff: true,
      writtenOffAt: now,
      writtenOffReason: trimmedReason,
      updatedAt: now,
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Quote & { id: string };
  }

  static async undoWriteOff(
    organizationId: string,
    quoteId: string,
  ): Promise<Quote & { id: string }> {
    const ref = db.collection(QUOTES_COLLECTION).doc(quoteId);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    const existing = doc.data() as Quote & { organizationId?: string };
    if (existing?.organizationId !== organizationId) {
      throw new ApiError(404, "Cotización no encontrada");
    }
    if (!existing.writtenOff) {
      throw new ApiError(400, "Esta cotización no está dada de baja");
    }

    await ref.update({
      writtenOff: false,
      writtenOffAt: FieldValue.delete(),
      writtenOffReason: FieldValue.delete(),
      updatedAt: Timestamp.now(),
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as Quote & { id: string };
  }
}
