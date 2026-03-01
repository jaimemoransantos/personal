import { Router } from "express";
import { QuoteController } from "../controllers/quoteController";
import { loadOrganization } from "../middleware/loadOrganization";

const router = Router();
router.use(loadOrganization);

router.get("/", QuoteController.list);
router.get("/:id", QuoteController.getById);
router.post("/", QuoteController.create);
router.put("/:id", QuoteController.update);
router.delete("/:id", QuoteController.delete);

export default router;
