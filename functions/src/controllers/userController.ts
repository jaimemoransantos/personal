import { Request, Response } from "express";
import { UserService } from "../services/userService";
import { handleError } from "../utils/errors";

export class UserController {
  /**
   * POST /api/users/sync-profile
   * Sincroniza el perfil del usuario en Firestore
   *
   * IMPORTANTE: La autenticación se hace con Firebase Auth (no aquí)
   * Este endpoint solo crea/actualiza el perfil en Firestore después
   * de que Firebase Auth ya autenticó al usuario.
   *
   * El middleware 'authenticate' verifica que el usuario esté autenticado
   * con Firebase Auth antes de llegar aquí.
   */
  static async syncProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.uid; // Viene del token de Firebase Auth
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

  /**
   * PUT /api/users/profile
   * Actualiza el perfil del usuario autenticado en Firestore
   * El usuario debe estar autenticado con Firebase Auth
   */
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
