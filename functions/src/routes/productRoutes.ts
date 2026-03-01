import { Router } from "express";
import { ProductController } from "../controllers/productController";
import { loadOrganization } from "../middleware/loadOrganization";

const router = Router();
router.use(loadOrganization);

router.get("/", ProductController.list);
router.get("/:id", ProductController.getById);
router.post("/", ProductController.create);
router.put("/:id", ProductController.update);
router.delete("/:id", ProductController.delete);
router.post("/import-excel", ProductController.importExcel);

export default router;
