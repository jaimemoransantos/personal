import { db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { DEFAULT_ORGANIZATION_ID } from "../constants/organization";
import type { Organization, CreateOrganizationData } from "../types/organization";
import * as logger from "firebase-functions/logger";

export class OrganizationService {
  static orgCollection() {
    return db.collection("organizations");
  }

  /** Get organization by ID. Returns null if not found. */
  static async getById(organizationId: string): Promise<Organization | null> {
    const doc = await this.orgCollection().doc(organizationId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Organization;
  }

  /**
   * Get or create the default organization (single-tenant / first company).
   * Used when syncing users so they have an organizationId.
   */
  static async getOrCreateDefault(): Promise<Organization> {
    const ref = this.orgCollection().doc(DEFAULT_ORGANIZATION_ID);
    const doc = await ref.get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() } as Organization;
    }
    const data: CreateOrganizationData = {
      name: "Geomtech",
      slug: "geomtech",
      address: "",
      ruc: "",
      contactPhone: "",
      email: "",
    };
    const now = Timestamp.now();
    await ref.set({
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    logger.info(`Default organization created: ${DEFAULT_ORGANIZATION_ID}`);
    const created = await ref.get();
    return { id: created.id, ...created.data() } as Organization;
  }

  /** Create a new organization (for future SaaS use). */
  static async create(data: CreateOrganizationData): Promise<Organization> {
    const ref = this.orgCollection().doc();
    await ref.set({
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const created = await ref.get();
    return { id: created.id, ...created.data() } as Organization;
  }
}
