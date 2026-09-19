import { Request, Response } from "express";
import { ProjectPhotoService } from "../services/projectPhotoService";
import { handleError } from "../utils/errors";

export class ProjectPhotoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const projectId = req.query.projectId;
      if (!projectId || typeof projectId !== "string") {
        res
          .status(400)
          .json({ success: false, error: "projectId es requerido" });
        return;
      }
      const list = await ProjectPhotoService.list(organizationId, projectId);
      res.json({ success: true, data: list });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async add(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user?.uid;
      const { projectId, imageBase64, mimeType } = req.body as {
        projectId?: string;
        imageBase64?: string;
        mimeType?: string;
      };
      if (!projectId || typeof projectId !== "string") {
        res
          .status(400)
          .json({ success: false, error: "projectId es requerido" });
        return;
      }
      if (!imageBase64 || typeof imageBase64 !== "string") {
        res
          .status(400)
          .json({ success: false, error: "imageBase64 es requerido" });
        return;
      }
      const photo = await ProjectPhotoService.add(
        organizationId,
        projectId,
        imageBase64,
        typeof mimeType === "string" ? mimeType : "",
        userId,
      );
      res.status(201).json({ success: true, data: photo });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      await ProjectPhotoService.remove(organizationId, id);
      res.json({ success: true, message: "Foto eliminada" });
    } catch (error) {
      handleError(error, res);
    }
  }

  static async getImage(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.organizationId!;
      const { id } = req.params;
      const { buffer, contentType } = await ProjectPhotoService.getImage(
        organizationId,
        id,
      );
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.end(buffer);
    } catch (error) {
      handleError(error, res);
    }
  }
}
