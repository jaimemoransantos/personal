import { Request, Response } from "express";
import { QuoteService } from "../services/quoteService";
import { handleError } from "../utils/errors";

export class QuoteController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const list = await QuoteService.list(organizationId);
      res.json({ success: true, data: list });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const quote = await QuoteService.getById(organizationId, id);
      if (!quote) {
        res
          .status(404)
          .json({ success: false, error: "Cotización no encontrada" });
        return;
      }
      res.json({ success: true, data: quote });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const data = req.body;
      const quote = await QuoteService.create(organizationId, data, userId);
      res.status(201).json({ success: true, data: quote });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const data = req.body;
      const quote = await QuoteService.update(organizationId, id, data);
      res.json({ success: true, data: quote });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      await QuoteService.delete(organizationId, id);
      res.json({ success: true, message: "Cotización eliminada" });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async convertToProject(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const { id } = req.params;
      const project = await QuoteService.convertToProject(
        organizationId,
        id,
        userId,
      );
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async updatePaidAmount(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { paidAmount } = req.body as { paidAmount?: number };
      if (paidAmount === undefined || paidAmount === null) {
        res
          .status(400)
          .json({ success: false, error: "paidAmount es requerido" });
        return;
      }
      const quote = await QuoteService.updatePaidAmount(
        organizationId,
        id,
        paidAmount,
      );
      res.json({ success: true, data: quote });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async writeOff(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { reason } = req.body as { reason?: string };
      const quote = await QuoteService.writeOff(organizationId, id, reason);
      res.json({ success: true, data: quote });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async undoWriteOff(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const quote = await QuoteService.undoWriteOff(organizationId, id);
      res.json({ success: true, data: quote });
    } catch (error) {
      handleError(error, res);
    }
  }
}
