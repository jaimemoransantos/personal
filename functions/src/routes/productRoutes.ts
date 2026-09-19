import { Router } from "express";
import { ProductController } from "../controllers/productController";
import { loadOrganization } from "../middleware/loadOrganization";
import { requireRole } from "../middleware/requireRole";

const router = Router();
router.use(loadOrganization);

router.get("/", ProductController.list);
router.post("/import-excel", ProductController.importExcel);
router.patch(
  "/:id/unit-cost",
  requireRole(["admin"]),
  ProductController.updateUnitCost,
);
router.get("/:id/inventory-activity", ProductController.inventoryActivity);
router.get("/:id", ProductController.getById);
router.post("/", ProductController.create);
router.put("/:id", ProductController.update);
router.delete("/:id", ProductController.delete);

export default router;
