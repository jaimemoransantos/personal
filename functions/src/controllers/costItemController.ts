import { Request, Response } from "express";
import { CostItemService } from "../services/costItemService";
import type { CreateCostItemData } from "../types/costItem";
import { handleError } from "../utils/errors";

export class CostItemController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const projectId = req.query.projectId;
      if (!projectId || typeof projectId !== "string") {
        res
          .status(400)
          .json({ success: false, error: "projectId es requerido" });
        return;
      }
      const list = await CostItemService.list(organizationId, projectId);
      res.json({ success: true, data: list });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const item = await CostItemService.getById(organizationId, id);
      if (!item) {
        res
          .status(404)
          .json({ success: false, error: "Ítem de costo no encontrado" });
        return;
      }
      res.json({ success: true, data: item });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const body = req.body as CreateCostItemData & { projectId?: string };
      const { projectId, ...data } = body;
      if (!projectId || typeof projectId !== "string") {
        res
          .status(400)
          .json({ success: false, error: "projectId es requerido" });
        return;
      }
      const item = await CostItemService.create(
        organizationId,
        projectId,
        data,
        userId,
      );
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const data = req.body;
      const item = await CostItemService.update(organizationId, id, data);
      res.json({ success: true, data: item });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      await CostItemService.delete(organizationId, id);
      res.json({ success: true, message: "Ítem de costo eliminado" });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async addFactura(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };
      if (!imageBase64 || typeof imageBase64 !== "string") {
        res
          .status(400)
          .json({ success: false, error: "imageBase64 es requerido" });
        return;
      }
      const item = await CostItemService.addFactura(
        organizationId,
        id,
        imageBase64,
        typeof mimeType === "string" ? mimeType : "",
      );
      res.json({ success: true, data: item });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async removeFactura(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { url } = req.body as { url?: string };
      if (!url || typeof url !== "string") {
        res.status(400).json({ success: false, error: "url es requerida" });
        return;
      }
      const item = await CostItemService.removeFactura(
        organizationId,
        id,
        url,
      );
      res.json({ success: true, data: item });
    } catch (error) {
      handleError(error, res);
    }
  }
}
