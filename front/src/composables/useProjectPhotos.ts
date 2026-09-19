import { useApi } from "./useApi";

export interface ProjectPhoto {
  id: string;
  projectId: string;
  url: string;
  uploadedAt?: unknown;
  uploadedBy?: string;
}

const BASE = "/api/project-photos";

export function useProjectPhotos() {
  const api = useApi();

  async function list(projectId: string): Promise<ProjectPhoto[]> {
    const result = await api.get(
      `${BASE}?projectId=${encodeURIComponent(projectId)}`,
    );
    return (result?.data ?? []) as ProjectPhoto[];
  }

  async function add(
    projectId: string,
    base64: string,
    mimeType: string,
  ): Promise<ProjectPhoto> {
    const result = await api.post(BASE, {
      projectId,
      imageBase64: base64,
      mimeType,
    });
    return result?.data as ProjectPhoto;
  }

  async function remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  /**
   * Descarga la imagen privada autenticada y devuelve un blob URL.
   * El caller debe llamar URL.revokeObjectURL() cuando ya no lo necesite.
   */
  async function getImageBlobUrl(photoId: string): Promise<string> {
    const blob = await api.getBlob(`${BASE}/${photoId}/image`);
    return URL.createObjectURL(blob);
  }

  return {
    list,
    add,
    remove,
    getImageBlobUrl,
  };
}
