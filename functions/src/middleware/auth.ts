import { Request, Response, NextFunction } from "express";
// import * as admin from "firebase-admin";
import { admin } from "../config/firebase-admin";
import * as logger from "firebase-functions/logger";
import { ApiError } from "../utils/errors";

/**
 * Firebase Auth authentication middleware.
 * Ensures the request has a valid Firebase Auth token and attaches decoded user info to req.user.
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    logger.error("Firebase Auth authentication error:", error);
    next(new ApiError(401, "Token de Firebase Auth inválido"));
  }
};
