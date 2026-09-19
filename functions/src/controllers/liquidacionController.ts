import { Request, Response } from "express";
import { LiquidacionService } from "../services/liquidacionService";
import { handleError } from "../utils/errors";

export class LiquidacionController {
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const summary = await LiquidacionService.computeSummary(
        organizationId,
        id,
      );
      res.json({ success: true, data: summary });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async exportExcel(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { buffer, filename } = await LiquidacionService.exportToExcel(
        organizationId,
        id,
      );
      res.json({
        success: true,
        data: {
          filename,
          base64: buffer.toString("base64"),
        },
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
