import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/userService";
import { ApiError } from "../utils/errors";

/**
 * Loads the authenticated user's organizationId from Firestore and sets req.organizationId.
 * Must run after authenticate middleware (req.user must be set).
 * Use on routes that need organization context (quotes, clients, products, etc.).
 */
export const loadOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return next(new ApiError(401, "Usuario no autenticado"));
    }
    const organizationId = await UserService.getOrganizationId(userId);
    if (!organizationId) {
      return next(
        new ApiError(
          403,
          "Usuario sin organización asignada. Sincronice su perfil."
        )
      );
    }
    req.organizationId = organizationId;
    next();
  } catch (error) {
    next(error);
  }
};
