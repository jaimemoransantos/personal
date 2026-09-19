import { Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firebase-admin";
import type { ProjectPhoto } from "../types/project";
import { ApiError } from "../utils/errors";
import { ProjectService } from "./projectService";
import { StorageService } from "./storageService";

const PROJECT_PHOTOS_COLLECTION = "projectPhotos";

/** Strips optional data-URL prefix; returns raw base64 + mime if present. */
function normalizeImagePayload(
  input: string,
  mimeType?: string,
): { base64: string; mimeType: string } {
  const trimmed = input.trim();
  const dataUrlMatch = trimmed.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
  );
  if (dataUrlMatch) {
    return {
      mimeType: mimeType || dataUrlMatch[1],
      base64: dataUrlMatch[2],
    };
  }
  if (!mimeType) {
    throw new ApiError(400, "mimeType es requerido");
  }
  return { base64: trimmed, mimeType };
}

export class ProjectPhotoService {
  static async list(
    organizationId: string,
    projectId: string,
  ): Promise<(ProjectPhoto & { id: string })[]> {
    const snapshot = await db
      .collection(PROJECT_PHOTOS_COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("projectId", "==", projectId)
      .orderBy("uploadedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (ProjectPhoto & { id: string })[];
  }

  static async add(
    organizationId: string,
    projectId: string,
    base64Data: string,
    mimeType: string,
    uploadedBy?: string,
  ): Promise<ProjectPhoto & { id: string }> {
    if (!base64Data || typeof base64Data !== "string") {
      throw new ApiError(400, "imageBase64 es requerido");
    }

    const project = await ProjectService.getById(organizationId, projectId);
    if (!project) {
      throw new ApiError(404, "Proyecto no encontrado");
    }

    const { base64, mimeType: resolvedMime } = normalizeImagePayload(
      base64Data,
      mimeType,
    );
    const url = await StorageService.uploadProjectPhoto(
      organizationId,
      projectId,
      base64,
      resolvedMime,
    );

    const ref = db.collection(PROJECT_PHOTOS_COLLECTION).doc();
    const photo: ProjectPhoto = {
      organizationId,
      projectId,
      url,
      uploadedAt: Timestamp.now(),
      ...(uploadedBy ? { uploadedBy } : {}),
    };

    await ref.set(photo);
    return { id: ref.id, ...photo };
  }

  static async remove(organizationId: string, id: string): Promise<void> {
    const ref = db.collection(PROJECT_PHOTOS_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Foto no encontrada");
    }
    const data = doc.data() as ProjectPhoto & { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Foto no encontrada");
    }

    await StorageService.deleteFile(data.url);
    await ref.delete();
  }

  static async getImage(
    organizationId: string,
    id: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const ref = db.collection(PROJECT_PHOTOS_COLLECTION).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new ApiError(404, "Foto no encontrada");
    }
    const data = doc.data() as ProjectPhoto & { organizationId?: string };
    if (data?.organizationId !== organizationId) {
      throw new ApiError(404, "Foto no encontrada");
    }
    return StorageService.downloadFile(data.url);
  }
}
