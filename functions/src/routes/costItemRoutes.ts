import { Router } from "express";
import { CostItemController } from "../controllers/costItemController";
import { loadOrganization } from "../middleware/loadOrganization";

const router = Router();
router.use(loadOrganization);

router.get("/", CostItemController.list);
router.get("/:id", CostItemController.getById);
router.post("/", CostItemController.create);
router.put("/:id", CostItemController.update);
router.delete("/:id", CostItemController.delete);
router.post("/:id/facturas", CostItemController.addFactura);
router.delete("/:id/facturas", CostItemController.removeFactura);

export default router;
