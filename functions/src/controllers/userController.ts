import { Request, Response } from "express";
import { UserService } from "../services/userService";
import { handleError } from "../utils/errors";

export class UserController {
  /**
   * POST /api/users/sync-profile - Sync user profile to Firestore.
   * Auth is done via Firebase Auth; this endpoint only creates/updates the Firestore profile.
   * The 'authenticate' middleware ensures the user is authenticated before reaching here.
   */
  static async syncProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.uid;
      const { email, displayName, photoURL } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: "Email es requerido",
        });
        return;
      }

      const result = await UserService.syncUserProfile(userId, {
        email,
        displayName,
        photoURL,
      });

      res.json({
        success: true,
        isNewUser: result.isNewUser,
        message: result.isNewUser
          ? "Perfil creado exitosamente en Firestore"
          : "Perfil actualizado exitosamente",
        data: result.profile,
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * GET /api/users/profile
   * Obtiene el perfil del usuario autenticado desde Firestore
   * El usuario debe estar autenticado con Firebase Auth
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.uid;
      const profile = await UserService.getProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** PUT /api/users/profile - Update authenticated user's profile in Firestore. */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.uid;
      const updates = req.body;

      const profile = await UserService.updateProfile(userId, updates);

      res.json({
        success: true,
        message: "Perfil actualizado exitosamente",
        data: profile,
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
