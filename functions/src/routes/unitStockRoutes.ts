import { Router } from "express";
import { UnitStockController } from "../controllers/unitStockController";
import { loadOrganization } from "../middleware/loadOrganization";
import { requireRole } from "../middleware/requireRole";

const router = Router();
router.use(loadOrganization);

const fieldAndAdmin = requireRole(["admin", "chief", "technician"]);

router.post("/in", fieldAndAdmin, UnitStockController.stockIn);
router.post("/out", fieldAndAdmin, UnitStockController.stockOut);
router.get("/stock", UnitStockController.getStock);
router.get(
  "/products/:productId/movements",
  UnitStockController.listMovementsByProduct,
);
router.patch(
  "/movements/:id/reverse",
  requireRole(["admin"]),
  UnitStockController.reverseOutMovement,
);

export default router;
