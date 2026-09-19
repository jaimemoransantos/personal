import { Request, Response } from "express";
import {
  RollService,
  presentRoll,
  presentWithdrawal,
} from "../services/rollService";
import type {
  RegisterRollData,
  SetRollCostData,
  WithdrawRollData,
} from "../types/roll";
import { UserService } from "../services/userService";
import { handleError } from "../utils/errors";

async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const profile = await UserService.getProfile(userId);
  return profile.role === "admin";
}

export class RollController {
  /** POST /api/rolls */
  static async registerRoll(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const body = req.body as RegisterRollData;
      const roll = await RollService.registerRoll(
        organizationId,
        body,
        userId,
      );
      const admin = await isAdminUser(userId);
      res.status(201).json({
        success: true,
        data: presentRoll(roll as unknown as Record<string, unknown>, admin),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /**
   * GET /api/rolls
   * - ?barcode= → lookup by barcode
   * - ?productId= → list available rolls for product (FIFO)
   * - otherwise → list all available rolls
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const barcode = req.query.barcode;
      const productId = req.query.productId;
      const admin = await isAdminUser(req.user?.uid);

      if (typeof barcode === "string" && barcode.trim()) {
        const roll = await RollService.findByBarcode(
          organizationId,
          barcode.trim(),
        );
        if (!roll) {
          res.status(404).json({
            success: false,
            error:
              "Rollo no encontrado. Regístralo primero en una importación.",
          });
          return;
        }
        res.json({
          success: true,
          data: presentRoll(
            roll as unknown as Record<string, unknown>,
            admin,
          ),
        });
        return;
      }

      if (typeof productId === "string" && productId.trim()) {
        const rolls = await RollService.listByProduct(
          organizationId,
          productId.trim(),
        );
        res.json({
          success: true,
          data: rolls.map((r) =>
            presentRoll(r as unknown as Record<string, unknown>, admin),
          ),
        });
        return;
      }

      const onlyAvailableRaw = req.query.onlyAvailable;
      const onlyAvailable =
        onlyAvailableRaw === undefined ||
        onlyAvailableRaw === "true" ||
        onlyAvailableRaw === "1";
      const rolls = await RollService.listAll(organizationId, onlyAvailable);
      res.json({
        success: true,
        data: rolls.map((r) =>
          presentRoll(r as unknown as Record<string, unknown>, admin),
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/rolls/costing — admin only */
  static async listForCosting(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const data = await RollService.listForCosting(organizationId);
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** PATCH /api/rolls/:id/cost — admin only */
  static async setCost(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const body = req.body as SetRollCostData;
      if (body.mode !== "total" && body.mode !== "perM2") {
        res.status(400).json({
          success: false,
          error: "mode debe ser 'total' o 'perM2'",
        });
        return;
      }
      const roll = await RollService.setCost(organizationId, id, {
        mode: body.mode,
        totalCost: body.totalCost,
        unitCost: body.unitCost,
      });
      res.json({ success: true, data: roll });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** POST /api/rolls/withdraw */
  static async withdraw(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const body = req.body as WithdrawRollData;
      const withdrawal = await RollService.withdraw(
        organizationId,
        body,
        userId,
      );
      const admin = await isAdminUser(userId);
      res.status(201).json({
        success: true,
        data: presentWithdrawal(
          withdrawal as unknown as Record<string, unknown>,
          admin,
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/rolls/stock */
  static async getStock(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const stock = await RollService.getStockByProduct(organizationId);
      res.json({ success: true, data: stock });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/rolls/withdrawals?projectId= */
  static async listWithdrawalsByProject(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const projectId = req.query.projectId;
      if (!projectId || typeof projectId !== "string") {
        res
          .status(400)
          .json({ success: false, error: "projectId es requerido" });
        return;
      }
      const list = await RollService.listWithdrawalsByProject(
        organizationId,
        projectId,
      );
      const admin = await isAdminUser(req.user?.uid);
      res.json({
        success: true,
        data: list.map((w) =>
          presentWithdrawal(w as unknown as Record<string, unknown>, admin),
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/rolls/:id/withdrawals */
  static async listWithdrawalsByRoll(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const list = await RollService.listWithdrawalsByRoll(
        organizationId,
        id,
      );
      const admin = await isAdminUser(req.user?.uid);
      const nameById = await UserService.getDisplayNamesByIds(
        list
          .map((w) => w.performedBy)
          .filter((uid): uid is string => typeof uid === "string"),
      );

      res.json({
        success: true,
        data: list.map((w) => {
          const presented = presentWithdrawal(
            w as unknown as Record<string, unknown>,
            admin,
          ) as Record<string, unknown>;
          const performedByName =
            typeof w.performedBy === "string"
              ? nameById.get(w.performedBy) ?? null
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

  /** PATCH /api/rolls/withdrawals/:id/reverse — admin only */
  static async reverseWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const { id } = req.params;
      const withdrawal = await RollService.reverseWithdrawal(
        organizationId,
        id,
        userId,
      );
      res.json({
        success: true,
        data: presentWithdrawal(
          withdrawal as unknown as Record<string, unknown>,
          true,
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
