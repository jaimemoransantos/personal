import { Router } from "express";
import { OrganizationController } from "../controllers/organizationController";
import { loadOrganization } from "../middleware/loadOrganization";

const router = Router();

// All organization routes require the user to have an organization (loadOrganization)
router.use(loadOrganization);

// GET /api/organization/current - Current user's organization
router.get("/current", OrganizationController.getCurrent);

export default router;
