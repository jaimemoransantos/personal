import { Router } from "express";
import { QuoteController } from "../controllers/quoteController";
import { loadOrganization } from "../middleware/loadOrganization";
import { requireRole } from "../middleware/requireRole";

const router = Router();
router.use(loadOrganization);
router.use(requireRole(["admin"]));

router.get("/", QuoteController.list);
router.get("/:id", QuoteController.getById);
router.post("/", QuoteController.create);
router.post("/:id/convert-to-project", QuoteController.convertToProject);
router.post("/:id/write-off", QuoteController.writeOff);
router.post("/:id/undo-write-off", QuoteController.undoWriteOff);
router.put("/:id/paid-amount", QuoteController.updatePaidAmount);
router.put("/:id", QuoteController.update);
router.delete("/:id", QuoteController.delete);

export default router;
