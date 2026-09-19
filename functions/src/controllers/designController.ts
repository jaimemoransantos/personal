import { Request, Response } from "express";
import { DesignService } from "../services/designService";
import { handleError } from "../utils/errors";

export class DesignController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const list = await DesignService.list(organizationId);
      res.json({ success: true, data: list });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const design = await DesignService.getById(organizationId, id);
      if (!design) {
        res
          .status(404)
          .json({ success: false, error: "Diseño no encontrado" });
        return;
      }
      res.json({ success: true, data: design });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const data = req.body;
      const design = await DesignService.create(organizationId, data, userId);
      res.status(201).json({ success: true, data: design });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const data = req.body;
      const design = await DesignService.update(organizationId, id, data);
      res.json({ success: true, data: design });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      await DesignService.delete(organizationId, id);
      res.json({ success: true, message: "Diseño eliminado" });
    } catch (error) {
      handleError(error, res);
    }
  }
}
