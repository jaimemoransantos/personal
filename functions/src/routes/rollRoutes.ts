import { Router } from "express";
import { RollController } from "../controllers/rollController";
import { loadOrganization } from "../middleware/loadOrganization";
import { requireRole } from "../middleware/requireRole";

const router = Router();
router.use(loadOrganization);

router.post("/withdraw", RollController.withdraw);
router.get("/stock", RollController.getStock);
router.get("/withdrawals", RollController.listWithdrawalsByProject);
router.patch(
  "/withdrawals/:id/reverse",
  requireRole(["admin"]),
  RollController.reverseWithdrawal,
);
router.get(
  "/costing",
  requireRole(["admin"]),
  RollController.listForCosting,
);
router.get("/:id/withdrawals", RollController.listWithdrawalsByRoll);
router.patch(
  "/:id/cost",
  requireRole(["admin"]),
  RollController.setCost,
);
router.get("/", RollController.list);
router.post("/", RollController.registerRoll);

export default router;
