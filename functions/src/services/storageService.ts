import sharp from "sharp";
import * as logger from "firebase-functions/logger";
import { admin } from "../config/firebase-admin";
import { ApiError } from "../utils/errors";

/**
 * Storage helpers — same public-URL / makePublic pattern as Tiiza.
 */
export const StorageService = {
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const bucket = admin.storage().bucket();
      const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
      const bucketName = bucket.name;

      // Extrae el filePath de la URL pública
      let filePath: string;
      if (isEmulator) {
        // http://127.0.0.1:9199/{bucket}/organizations/...
        const marker = `${bucketName}/`;
        const idx = fileUrl.indexOf(marker);
        if (idx === -1) return;
        filePath = fileUrl.slice(idx + marker.length);
      } else {
        // https://storage.googleapis.com/{bucket}/organizations/...
        const marker = `${bucketName}/`;
        const idx = fileUrl.indexOf(marker);
        if (idx === -1) return;
        filePath = fileUrl.slice(idx + marker.length);
      }

      await bucket.file(filePath).delete({ ignoreNotFound: true });
      logger.info("Archivo eliminado de Storage", { filePath });
    } catch (err) {
      // No lanzamos error — si falla el borrado, igual seguimos
      logger.warn("No se pudo eliminar archivo anterior de Storage", {
        fileUrl,
        err,
      });
    }
  },

  /** Extrae el path del objeto a partir de una URL pública/storage. */
  filePathFromUrl(fileUrl: string): string | null {
    const bucket = admin.storage().bucket();
    const bucketName = bucket.name;
    const marker = `${bucketName}/`;
    const idx = fileUrl.indexOf(marker);
    if (idx === -1) return null;
    return fileUrl.slice(idx + marker.length);
  },

  async downloadFile(
    fileUrl: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const filePath = StorageService.filePathFromUrl(fileUrl);
    if (!filePath) {
      throw new ApiError(404, "Archivo no encontrado");
    }
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ApiError(404, "Archivo no encontrado");
    }
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    const contentType =
      (metadata.contentType as string | undefined) || "image/webp";
    return { buffer, contentType };
  },

  async uploadFacturaImage(
    organizationId: string,
    costItemId: string,
    base64Data: string,
    mimeType: string,
  ): Promise<string> {
    const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
    // sin SVG aquí, una factura siempre es una foto
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    if (!ALLOWED.includes(mimeType)) {
      throw new ApiError(
        400,
        "Tipo de archivo no permitido. Usa PNG, JPEG o WEBP.",
      );
    }
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new ApiError(400, "El archivo supera el tamaño máximo de 5MB.");
    }

    let finalBuffer: Buffer;
    try {
      finalBuffer = Buffer.from(
        await sharp(buffer)
          .rotate() // respeta orientación EXIF de fotos de celular
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      );
    } catch (err) {
      logger.error("Error procesando factura con sharp", err);
      throw new ApiError(
        400,
        "No se pudo procesar la imagen. Verifica que sea un archivo válido.",
      );
    }

    const filename = `factura-${Date.now()}.webp`;
    const filePath = `organizations/${organizationId}/cost-items/${costItemId}/${filename}`;

    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    await file.save(finalBuffer, {
      metadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000",
      },
      public: true,
    });
    await file.makePublic();

    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    const publicUrl = isEmulator
      ? `http://127.0.0.1:9199/${bucket.name}/${filePath}`
      : `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    logger.info("Factura subida", { organizationId, costItemId, filePath });
    return publicUrl;
  },

  async uploadProjectPhoto(
    organizationId: string,
    projectId: string,
    base64Data: string,
    mimeType: string,
  ): Promise<string> {
    const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    if (!ALLOWED.includes(mimeType)) {
      throw new ApiError(
        400,
        "Tipo de archivo no permitido. Usa PNG, JPEG o WEBP.",
      );
    }
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_SIZE_BYTES) {
      throw new ApiError(400, "El archivo supera el tamaño máximo de 5MB.");
    }

    let finalBuffer: Buffer;
    try {
      finalBuffer = Buffer.from(
        await sharp(buffer)
          .rotate() // respeta orientación EXIF de fotos de celular
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      );
    } catch (err) {
      logger.error("Error procesando foto de proyecto con sharp", err);
      throw new ApiError(
        400,
        "No se pudo procesar la imagen. Verifica que sea un archivo válido.",
      );
    }

    const filename = `photo-${Date.now()}.webp`;
    const filePath = `organizations/${organizationId}/projects/${projectId}/photos/${filename}`;

    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    await file.save(finalBuffer, {
      metadata: {
        contentType: "image/webp",
        cacheControl: "private, max-age=3600",
      },
      // Privado: solo se sirve vía GET /api/project-photos/:id/image
    });

    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    const storageUrl = isEmulator
      ? `http://127.0.0.1:9199/${bucket.name}/${filePath}`
      : `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    logger.info("Foto de proyecto subida", {
      organizationId,
      projectId,
      filePath,
    });
    return storageUrl;
  },
};
