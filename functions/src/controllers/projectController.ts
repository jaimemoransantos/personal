import { Request, Response } from "express";
import { ProjectService } from "../services/projectService";
import { UserService } from "../services/userService";
import { handleError } from "../utils/errors";

async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const profile = await UserService.getProfile(userId);
  return profile.role === "admin";
}

export class ProjectController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const list = await ProjectService.list(organizationId);
      res.json({ success: true, data: list });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const project = await ProjectService.getById(organizationId, id);
      if (!project) {
        res
          .status(404)
          .json({ success: false, error: "Proyecto no encontrado" });
        return;
      }
      res.json({ success: true, data: project });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const data = req.body;
      const project = await ProjectService.update(organizationId, id, data);
      res.json({ success: true, data: project });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      await ProjectService.delete(organizationId, id);
      res.json({ success: true, message: "Proyecto eliminado" });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async linkDesign(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { designId } = req.body as { designId?: string };
      if (!designId || typeof designId !== "string") {
        res
          .status(400)
          .json({ success: false, error: "designId es requerido" });
        return;
      }
      const project = await ProjectService.linkDesign(
        organizationId,
        id,
        designId,
      );
      res.json({ success: true, data: project });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async unlinkDesign(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id, designId } = req.params;
      const project = await ProjectService.unlinkDesign(
        organizationId,
        id,
        designId,
      );
      res.json({ success: true, data: project });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/projects/:id/inventory-products */
  static async listInventoryProducts(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      // Operational stock only — never unitCost. Needed for withdraw UX for all roles.
      const data = await ProjectService.listInventoryProducts(
        organizationId,
        id,
        true,
      );
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/projects/:id/active-inventory-withdrawals?code= — admin only */
  static async listActiveInventoryWithdrawals(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const code = req.query.code;
      if (!code || typeof code !== "string") {
        res.status(400).json({ success: false, error: "code es requerido" });
        return;
      }
      const data = await ProjectService.listActiveInventoryWithdrawalsForCode(
        organizationId,
        id,
        code,
      );
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/projects/:id/inventory-withdrawals */
  static async listInventoryWithdrawals(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const list = await ProjectService.listInventoryWithdrawals(
        organizationId,
        id,
      );
      const admin = await isAdminUser(req.user?.uid);
      res.json({
        success: true,
        data: list.map((row) => {
          if (admin) return row;
          const {
            unitCost: _u,
            totalCost: _t,
            ...rest
          } = row;
          return rest;
        }),
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
