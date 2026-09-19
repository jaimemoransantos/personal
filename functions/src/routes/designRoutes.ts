import { Router } from "express";
import { DesignController } from "../controllers/designController";
import { loadOrganization } from "../middleware/loadOrganization";

const router = Router();
router.use(loadOrganization);

router.get("/", DesignController.list);
router.get("/:id", DesignController.getById);
router.post("/", DesignController.create);
router.put("/:id", DesignController.update);
router.delete("/:id", DesignController.delete);

export default router;
