import { Request, Response } from "express";
import { ProductService } from "../services/productService";
import { handleError } from "../utils/errors";

export class ProductController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const list = await ProductService.list(organizationId);
      res.json({ success: true, data: list });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const product = await ProductService.getById(organizationId, id);
      if (!product) {
        res.status(404).json({ success: false, error: "Producto no encontrado" });
        return;
      }
      res.json({ success: true, data: product });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const data = req.body;
      const product = await ProductService.create(organizationId, data, userId);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const data = req.body;
      const product = await ProductService.update(organizationId, id, data);
      res.json({ success: true, data: product });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      await ProductService.delete(organizationId, id);
      res.json({ success: true, message: "Producto eliminado" });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** POST /api/products/import-excel body: { base64: string } */
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
      const result = await ProductService.importFromExcel(
        organizationId,
        base64,
        userId
      );
      res.json({
        success: true,
        message: `Importados ${result.created} productos, ${result.skipped} filas omitidas`,
        data: result,
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
