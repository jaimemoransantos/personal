import { Request, Response } from "express";
import { CustomerService } from "../services/customerService";
import { handleError } from "../utils/errors";

export class CustomerController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const list = await CustomerService.list(organizationId);
      res.json({ success: true, data: list });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const customer = await CustomerService.getById(organizationId, id);
      if (!customer) {
        res
          .status(404)
          .json({ success: false, error: "Cliente no encontrado" });
        return;
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const data = req.body;
      const customer = await CustomerService.create(organizationId, data, userId);
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const data = req.body;
      const customer = await CustomerService.update(organizationId, id, data);
      res.json({ success: true, data: customer });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      await CustomerService.delete(organizationId, id);
      res.json({ success: true, message: "Cliente eliminado" });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** POST /api/customers/import-excel body: { base64: string } */
  static async importExcel(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { base64 } = req.body;
      if (!base64 || typeof base64 !== "string") {
        res.status(400).json({
          success: false,
          error: "Se requiere body.base64 (archivo Excel en base64)",
        });
        return;
      }
      const userId = req.user?.uid;
      const result = await CustomerService.importFromExcel(
        organizationId,
        base64,
        userId,
      );
      const parts = [`Importados ${result.created} clientes`];
      if (result.updated > 0)
        parts.push(`${result.updated} actualizados (mismo RUC/Cédula)`);
      if (result.skipped > 0) parts.push(`${result.skipped} filas omitidas`);
      const msg = parts.join(", ");
      res.json({
        success: true,
        message: msg,
        data: result,
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
