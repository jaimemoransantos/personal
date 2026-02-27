import { Request, Response, NextFunction } from "express";
// import * as admin from "firebase-admin";
import { admin } from "../config/firebase-admin";
import * as logger from "firebase-functions/logger";
import { ApiError } from "../utils/errors";

/**
 * Middleware de autenticación con Firebase Auth
 * Verifica que el request incluya un token válido de Firebase Auth
 * y agrega la información del usuario decodificada a req.user
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        401,
        "No autorizado - Token de Firebase Auth faltante"
      );
    }

    const token = authHeader.split("Bearer ")[1];
    // Verificar el token con Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Bloquear usuarios cuyo email NO esté verificado
    if (!decodedToken.email_verified) {
      throw new ApiError(
        403,
        "Email no verificado. Por favor verifica tu correo electrónico."
      );
    }

    // Agregar información del usuario al request
    req.user = decodedToken;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    logger.error("Error de autenticación con Firebase Auth:", error);
    next(new ApiError(401, "Token de Firebase Auth inválido"));
  }
};
