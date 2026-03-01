import { Router } from "express";
import { CustomerController } from "../controllers/customerController";
import { loadOrganization } from "../middleware/loadOrganization";

const router = Router();
router.use(loadOrganization);

router.get("/", CustomerController.list);
router.get("/:id", CustomerController.getById);
router.post("/", CustomerController.create);
router.put("/:id", CustomerController.update);
router.delete("/:id", CustomerController.delete);
router.post("/import-excel", CustomerController.importExcel);

export default router;
