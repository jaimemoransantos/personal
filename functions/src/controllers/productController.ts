import { Request, Response } from "express";
import {
  ProductService,
  presentProduct,
} from "../services/productService";
import { UnitStockService } from "../services/unitStockService";
import { RollService } from "../services/rollService";
import type { CreateProductData, UpdateProductData } from "../types/product";
import { UserService } from "../services/userService";
import { handleError } from "../utils/errors";

async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const profile = await UserService.getProfile(userId);
  return profile.role === "admin";
}

export class ProductController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const admin = await isAdminUser(req.user?.uid);
      const list = await ProductService.list(organizationId);
      res.json({
        success: true,
        data: list.map((p) =>
          presentProduct(p as unknown as Record<string, unknown>, admin),
        ),
      });
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
      const admin = await isAdminUser(req.user?.uid);
      res.json({
        success: true,
        data: presentProduct(
          product as unknown as Record<string, unknown>,
          admin,
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const body = req.body as Record<string, unknown>;
      const code =
        typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      const name =
        typeof body.name === "string" ? body.name.trim() : "";
      if (!code || !name) {
        res.status(400).json({
          success: false,
          error: "Código y nombre son obligatorios",
        });
        return;
      }
      if (body.kind !== "producto" && body.kind !== "servicio") {
        res.status(400).json({
          success: false,
          error: "Categoría es obligatoria (producto o servicio)",
        });
        return;
      }
      if (
        body.kind === "producto" &&
        body.type !== "roll" &&
        body.type !== "unit"
      ) {
        res.status(400).json({
          success: false,
          error: "Tipo de producto es obligatorio (roll o unit)",
        });
        return;
      }
      const subtitle =
        typeof body.subtitle === "string" ? body.subtitle.trim() : "";
      const priceRaw = body.price;
      const price =
        typeof priceRaw === "number" && !Number.isNaN(priceRaw)
          ? priceRaw
          : Number(priceRaw) || 0;
      const data: CreateProductData = {
        code,
        name,
        subtitle,
        price,
        kind: body.kind,
        ...(body.kind === "producto" &&
        (body.type === "roll" || body.type === "unit")
          ? { type: body.type }
          : {}),
      };
      const product = await ProductService.create(organizationId, data, userId);
      const admin = await isAdminUser(userId);
      res.status(201).json({
        success: true,
        data: presentProduct(
          product as unknown as Record<string, unknown>,
          admin,
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;
      // stockQuantity / unitCost are not editable via general update.
      const data: UpdateProductData = {};
      if (typeof body.code === "string") {
        data.code = body.code.trim().toUpperCase();
      }
      if (typeof body.name === "string") {
        data.name = body.name.trim();
      }
      if (typeof body.subtitle === "string") {
        data.subtitle = body.subtitle.trim();
      }
      if (body.price !== undefined) {
        const priceRaw = body.price;
        data.price =
          typeof priceRaw === "number" && !Number.isNaN(priceRaw)
            ? priceRaw
            : Number(priceRaw) || 0;
      }
      if (body.kind === "producto" || body.kind === "servicio") {
        data.kind = body.kind;
      }
      if (body.type === "roll" || body.type === "unit") {
        data.type = body.type;
      }
      const product = await ProductService.update(organizationId, id, data);
      const admin = await isAdminUser(req.user?.uid);
      res.json({
        success: true,
        data: presentProduct(
          product as unknown as Record<string, unknown>,
          admin,
        ),
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** GET /api/products/:id/inventory-activity */
  static async inventoryActivity(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const product = await ProductService.getById(organizationId, id);
      if (!product) {
        res.status(404).json({ success: false, error: "Producto no encontrado" });
        return;
      }
      const hasActivity = await ProductService.hasInventoryActivity(
        organizationId,
        id,
      );
      res.json({
        success: true,
        data: { hasInventoryActivity: hasActivity },
      });
    } catch (error) {
      handleError(error, res);
    }
  }

  /** PATCH /api/products/:id/unit-cost — admin only. Body: { unitCost: number | null } */
  static async updateUnitCost(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const body = req.body as { unitCost?: unknown };
      let unitCost: number | null;
      if (body.unitCost === null) {
        unitCost = null;
      } else if (
        typeof body.unitCost === "number" &&
        Number.isFinite(body.unitCost)
      ) {
        unitCost = body.unitCost;
      } else if (
        typeof body.unitCost === "string" &&
        body.unitCost.trim() !== ""
      ) {
        const n = Number(body.unitCost);
        if (!Number.isFinite(n)) {
          res.status(400).json({
            success: false,
            error: "unitCost debe ser un número >= 0 o null",
          });
          return;
        }
        unitCost = n;
      } else {
        res.status(400).json({
          success: false,
          error: "unitCost es requerido (número >= 0 o null)",
        });
        return;
      }
      const product = await ProductService.updateUnitCost(
        organizationId,
        id,
        unitCost,
      );

      // Symmetric with roll cost backfill: fill past outs without cost, sync rubros.
      if (typeof unitCost === "number") {
        const projectIds = await UnitStockService.backfillOutMovements(
          organizationId,
          id,
          unitCost,
        );
        for (const projectId of projectIds) {
          await RollService.syncProjectInventoryCost(
            organizationId,
            projectId,
          );
        }
      }

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
