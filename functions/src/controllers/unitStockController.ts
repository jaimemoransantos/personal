import { Request, Response } from "express";
import { UnitStockService, presentUnitMovement } from "../services/unitStockService";
import { presentProduct } from "../services/productService";
import { UserService } from "../services/userService";
import type { UnitStockInData, UnitStockOutData } from "../types/unitStock";
import { handleError } from "../utils/errors";

async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const profile = await UserService.getProfile(userId);
  return profile.role === "admin";
}

export class UnitStockController {
  /** POST /api/unit-stock/in — body: { productId, quantity } */
  static async stockIn(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const body = req.body as UnitStockInData;
      // Intentionally ignore any cost fields from the client.
      const result = await UnitStockService.stockIn(
        organizationId,
        {
          productId: body.productId,
          quantity: body.quantity,
        },
        userId,
      );
      const admin = await isAdminUser(userId);
      res.status(201).json({
        success: true,
        data: {
          product: presentProduct(
            result.product as unknown as Record<string, unknown>,
            admin,
          ),
          movement: presentUnitMovement(
            result.movement as unknown as Record<string, unknown>,
            admin,
          ),
        },
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** POST /api/unit-stock/out — body: { productId, quantity, projectId } */
  static async stockOut(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const body = req.body as UnitStockOutData;
      const result = await UnitStockService.stockOut(
        organizationId,
        {
          productId: body.productId,
          quantity: body.quantity,
          projectId: body.projectId,
        },
        userId,
      );
      const admin = await isAdminUser(userId);
      res.status(201).json({
        success: true,
        data: {
          product: presentProduct(
            result.product as unknown as Record<string, unknown>,
            admin,
          ),
          movement: presentUnitMovement(
            result.movement as unknown as Record<string, unknown>,
            admin,
          ),
        },
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/unit-stock/stock — unitCost only for admin */
  static async getStock(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const admin = await isAdminUser(req.user?.uid);
      const stock = await UnitStockService.getStock(organizationId, admin);
      res.json({ success: true, data: stock });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/unit-stock/products/:productId/movements */
  static async listMovementsByProduct(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { productId } = req.params;
      const list = await UnitStockService.listMovementsByProduct(
        organizationId,
        productId,
      );
      const admin = await isAdminUser(req.user?.uid);
      const nameById = await UserService.getDisplayNamesByIds(
        list
          .map((m) => m.performedBy)
          .filter((uid): uid is string => typeof uid === "string"),
      );

      res.json({
        success: true,
        data: list.map((m) => {
          const presented = presentUnitMovement(
            m as unknown as Record<string, unknown>,
            admin,
          ) as Record<string, unknown>;
          const performedByName =
            typeof m.performedBy === "string"
              ? nameById.get(m.performedBy) ?? null
              : null;
          return {
            ...presented,
            performedByName,
          };
        }),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** PATCH /api/unit-stock/movements/:id/reverse — admin only */
  static async reverseOutMovement(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const { id } = req.params;
      const movement = await UnitStockService.reverseOutMovement(
        organizationId,
        id,
        userId,
      );
      res.json({
        success: true,
        data: presentUnitMovement(
          movement as unknown as Record<string, unknown>,
          true,
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
