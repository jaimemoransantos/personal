import { Response } from "express";
import * as logger from "firebase-functions/logger";

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

export const handleError = (error: unknown, res: Response): void => {
  if (error instanceof ApiError) {
    logger.warn(`ApiError: ${error.message}`);
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
    return;
  }

  logger.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : "Error desconocido",
  });
};
