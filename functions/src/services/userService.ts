import { admin, db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ApiError } from "../utils/errors";
import type { CreateUserData, UserProfile } from "../types/user";
import { OrganizationService } from "./organizationService";

const USERS_COLLECTION = "users";

export class UserService {
  static usersRef() {
    return db.collection(USERS_COLLECTION);
  }

  /**
   * Syncs user profile to Firestore. Auth is handled by Firebase Auth; this only creates/updates the Firestore profile.
   * Ensures the user has an organizationId (default org for single-tenant).
   */
  static async syncUserProfile(
    userId: string,
    data: CreateUserData
  ): Promise<{ isNewUser: boolean; profile: UserProfile }> {
    if (!data.email) {
      throw new ApiError(400, "Email es requerido");
    }

    const userRef = admin.firestore().collection(USERS_COLLECTION).doc(userId);
    const userDoc = await userRef.get();

    const defaultOrg = await OrganizationService.getOrCreateDefault();

    if (!userDoc.exists) {
      await userRef.set({
        email: data.email,
        displayName: data.displayName ?? null,
        photoURL: data.photoURL ?? null,
        organizationId: data.organizationId ?? defaultOrg.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info(`User profile created in Firestore: ${userId}`);

      const createdDoc = await userRef.get();
      return {
        isNewUser: true,
        profile: createdDoc.data() as UserProfile,
      };
    }

    const existing = userDoc.data() as UserProfile | undefined;
    const organizationId = existing?.organizationId ?? defaultOrg.id;
    if (!existing?.organizationId) {
      logger.info(`User ${userId} assigned to organization: ${organizationId}`);
    }

    // Preserve manual edits in Firestore: only update email (from Auth) and updatedAt.
    // Do not overwrite displayName, photoURL, or organizationId when user already exists.
    const updatePayload: Record<string, unknown> = {
      email: data.email,
      updatedAt: Timestamp.now(),
    };
    if (!existing?.organizationId) {
      updatePayload.organizationId = organizationId;
    }
    await userRef.update(updatePayload);

    logger.info(`User profile updated in Firestore: ${userId}`);

    const updatedDoc = await userRef.get();
    return {
      isNewUser: false,
      profile: updatedDoc.data() as UserProfile,
    };
  }

  /** Gets a user profile from Firestore (user must already be authenticated via Firebase Auth). */
  static async getProfile(userId: string): Promise<UserProfile> {
    const userDoc = await this.usersRef().doc(userId).get();

    if (!userDoc.exists) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    return userDoc.data() as UserProfile;
  }

  /**
   * Gets organizationId for a user (for middleware). Returns null if user doc not found.
   */
  static async getOrganizationId(userId: string): Promise<string | null> {
    const userDoc = await this.usersRef().doc(userId).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data() as UserProfile | undefined;
    return data?.organizationId ?? null;
  }

  /**
   * Updates the user profile in Firestore. organizationId is not updatable via this method (admin-only later).
   */
  static async updateProfile(
    userId: string,
    updates: Partial<Pick<CreateUserData, "displayName" | "photoURL">>
  ): Promise<UserProfile> {
    const userRef = this.usersRef().doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    await userRef.update({
      ...updates,
      updatedAt: Timestamp.now(),
    });

    const updatedDoc = await userRef.get();
    return updatedDoc.data() as UserProfile;
  }
}
