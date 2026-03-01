import { Request, Response } from "express";
import { OrganizationService } from "../services/organizationService";
import { handleError } from "../utils/errors";

export class OrganizationController {
  /**
   * GET /api/organization/current - Returns the authenticated user's organization.
   * Requires loadOrganization middleware (user must have organizationId).
   */
  static async getCurrent(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const organization = await OrganizationService.getById(organizationId);
      if (!organization) {
        res.status(404).json({
          success: false,
          error: "Organización no encontrada",
        });
        return;
      }
      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      handleError(error, res);
    }
  }
}
