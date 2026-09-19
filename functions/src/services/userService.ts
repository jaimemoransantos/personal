import { admin, db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ApiError } from "../utils/errors";
import type { CreateUserData, UserProfile, UserRole } from "../types/user";
import { OrganizationService } from "./organizationService";

const USERS_COLLECTION = "users";
const VALID_ROLES: UserRole[] = ["admin", "chief", "technician"];

function isFirebaseAuthError(
  error: unknown
): error is { code: string; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

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
        role: data.role ?? "technician",
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
    // Do not overwrite displayName, photoURL, organizationId, or role when user already exists.
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

  /** Lists all users belonging to an organization. */
  static async listByOrganization(
    organizationId: string
  ): Promise<(UserProfile & { id: string })[]> {
    const snapshot = await this.usersRef()
      .where("organizationId", "==", organizationId)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as UserProfile),
    }));
  }

  /**
   * Resolve Firebase Auth UIDs to a display label (displayName or email).
   * Missing users are omitted from the map.
   */
  static async getDisplayNamesByIds(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const unique = Array.from(
      new Set(
        userIds.filter(
          (id): id is string => typeof id === "string" && id.trim() !== "",
        ),
      ),
    );
    const map = new Map<string, string>();
    if (unique.length === 0) return map;

    await Promise.all(
      unique.map(async (id) => {
        try {
          const doc = await this.usersRef().doc(id).get();
          if (!doc.exists) return;
          const data = doc.data() as UserProfile;
          const name =
            (typeof data.displayName === "string" && data.displayName.trim()) ||
            (typeof data.email === "string" && data.email.trim()) ||
            id;
          map.set(id, name);
        } catch {
          // Skip unreadable profiles.
        }
      }),
    );
    return map;
  }

  /**
   * Updates only the role field. Prevents the last admin from demoting themselves.
   */
  static async updateRole(
    organizationId: string,
    userId: string,
    newRole: UserRole,
    actorUserId: string
  ): Promise<UserProfile & { id: string }> {
    if (!VALID_ROLES.includes(newRole)) {
      throw new ApiError(
        400,
        'El rol debe ser "admin", "chief" o "technician"'
      );
    }

    const userRef = this.usersRef().doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    const existing = userDoc.data() as UserProfile;
    if (existing.organizationId !== organizationId) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    if (
      userId === actorUserId &&
      newRole !== "admin" &&
      existing.role === "admin"
    ) {
      const adminsSnapshot = await this.usersRef()
        .where("organizationId", "==", organizationId)
        .where("role", "==", "admin")
        .get();

      if (adminsSnapshot.size <= 1) {
        throw new ApiError(
          400,
          "No puedes quitarte el rol de admin siendo el único administrador"
        );
      }
    }

    await userRef.update({
      role: newRole,
      updatedAt: Timestamp.now(),
    });

    const updatedDoc = await userRef.get();
    return {
      id: updatedDoc.id,
      ...(updatedDoc.data() as UserProfile),
    };
  }

  /**
   * Creates a Firebase Auth user and Firestore profile (admin-only).
   * Cleans up the Auth user if the Firestore write fails.
   */
  static async createUserByAdmin(
    organizationId: string,
    email: string,
    password: string,
    displayName: string | undefined,
    role?: UserRole
  ): Promise<UserProfile & { id: string }> {
    const resolvedRole: UserRole = role ?? "technician";
    if (!VALID_ROLES.includes(resolvedRole)) {
      throw new ApiError(
        400,
        'El rol debe ser "admin", "chief" o "technician"'
      );
    }
    if (!email) {
      throw new ApiError(400, "Email es requerido");
    }
    if (!password) {
      throw new ApiError(400, "Password es requerido");
    }

    let uid: string;
    try {
      const authUser = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || undefined,
      });
      uid = authUser.uid;
    } catch (error) {
      if (
        isFirebaseAuthError(error) &&
        error.code === "auth/email-already-exists"
      ) {
        throw new ApiError(400, "Este email ya está registrado");
      }
      throw error;
    }

    try {
      await this.usersRef()
        .doc(uid)
        .set({
          email,
          displayName: displayName ?? null,
          photoURL: null,
          organizationId,
          role: resolvedRole,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
    } catch (error) {
      try {
        await admin.auth().deleteUser(uid);
        logger.warn(`Cleaned up Auth user after Firestore failure: ${uid}`);
      } catch (cleanupError) {
        logger.error(
          `Failed to clean up Auth user ${uid} after profile create failure:`,
          cleanupError
        );
      }
      throw error;
    }

    logger.info(`User created by admin: ${uid}`);

    const createdDoc = await this.usersRef().doc(uid).get();
    return {
      id: createdDoc.id,
      ...(createdDoc.data() as UserProfile),
    };
  }

  /**
   * Deletes Firestore profile and Firebase Auth user (admin-only).
   * Verifies the user belongs to the organization before deleting.
   */
  static async deleteUserByAdmin(
    organizationId: string,
    userId: string
  ): Promise<void> {
    const userRef = this.usersRef().doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    const data = userDoc.data() as UserProfile;
    if (data.organizationId !== organizationId) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    await userRef.delete();
    await admin.auth().deleteUser(userId);

    logger.info(`User deleted by admin: ${userId}`);
  }
}
