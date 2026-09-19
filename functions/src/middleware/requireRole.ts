import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import { ApiError } from "../utils/errors";
import type { UserRole } from "../types/user";

/**
 * Ensures the authenticated user has one of the allowed roles.
 * Must run after authenticate middleware (req.user must be set).
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return next(new ApiError(401, "No autenticado"));
      }
      const profile = await UserService.getProfile(userId);
      if (!allowedRoles.includes(profile.role)) {
        return next(
          new ApiError(403, "No tienes permisos para esta acción")
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
