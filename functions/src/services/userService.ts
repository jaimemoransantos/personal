// import * as admin from "firebase-admin";
import { admin, db } from "../config/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ApiError } from "../utils/errors";

export interface CreateUserData {
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface UserProfile {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;
  updatedAt: any;
}

export class UserService {
  /**
   * Sincroniza el perfil del usuario en Firestore
   * NOTA: La autenticación se hace con Firebase Auth (no aquí)
   * Este método solo crea/actualiza el perfil en Firestore después de que
   * Firebase Auth ya autenticó al usuario
   *
   * @param userId - ID del usuario autenticado (viene de Firebase Auth)
   * @param data - Datos del usuario desde Firebase Auth
   * @returns Información si es nuevo usuario en Firestore y el perfil
   */
  static async syncUserProfile(
    userId: string,
    data: CreateUserData
  ): Promise<{ isNewUser: boolean; profile: UserProfile }> {
    if (!data.email) {
      throw new ApiError(400, "Email es requerido");
    }

    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Usuario nuevo en Firestore - Crear perfil
      // Usar Timestamp.now() DIRECTAMENTE en set()
      await userRef.set({
        email: data.email,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info(`Perfil creado en Firestore para usuario: ${userId}`);

      // Obtener el documento creado para retornarlo
      const createdDoc = await userRef.get();
      return {
        isNewUser: true,
        profile: createdDoc.data() as UserProfile,
      };
    } else {
      // Usuario existente en Firestore - Actualizar perfil
      // Usar FieldValue.serverTimestamp() DIRECTAMENTE en update()
      await userRef.update({
        email: data.email,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        updatedAt: Timestamp.now(),
      });

      logger.info(`Perfil actualizado en Firestore para usuario: ${userId}`);

      const updatedDoc = await userRef.get();
      return {
        isNewUser: false,
        profile: updatedDoc.data() as UserProfile,
      };
    }
  }

  /**
   * Obtiene el perfil de un usuario desde Firestore
   * El usuario ya debe estar autenticado con Firebase Auth
   */
  static async getProfile(userId: string): Promise<UserProfile> {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    return userDoc.data() as UserProfile;
  }

  /**
   * Actualiza el perfil de un usuario en Firestore
   * El usuario ya debe estar autenticado con Firebase Auth
   */
  static async updateProfile(
    userId: string,
    updates: Partial<CreateUserData>
  ): Promise<UserProfile> {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new ApiError(404, "Usuario no encontrado");
    }

    // Usar Timestamp.now() DIRECTAMENTE en update()
    await userRef.update({
      ...updates,
      updatedAt: Timestamp.now(),
    });

    const updatedDoc = await userRef.get();
    return updatedDoc.data() as UserProfile;
  }
}
