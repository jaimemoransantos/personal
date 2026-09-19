import { Router } from "express";
import { LiquidacionController } from "../controllers/liquidacionController";
import { ProjectController } from "../controllers/projectController";
import { loadOrganization } from "../middleware/loadOrganization";
import { requireRole } from "../middleware/requireRole";

const router = Router();
router.use(loadOrganization);

router.get("/", ProjectController.list);
router.get("/:id/liquidacion/export", LiquidacionController.exportExcel);
router.get("/:id/liquidacion", LiquidacionController.getSummary);
router.get(
  "/:id/inventory-products",
  ProjectController.listInventoryProducts,
);
router.get(
  "/:id/inventory-withdrawals",
  ProjectController.listInventoryWithdrawals,
);
router.get(
  "/:id/active-inventory-withdrawals",
  requireRole(["admin"]),
  ProjectController.listActiveInventoryWithdrawals,
);
router.get("/:id", ProjectController.getById);
router.put("/:id", ProjectController.update);
router.delete("/:id", ProjectController.delete);
router.post("/:id/elements", ProjectController.linkDesign);
router.delete("/:id/elements/:designId", ProjectController.unlinkDesign);

export default router;
