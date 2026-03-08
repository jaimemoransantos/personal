/**
 * Store para el borrador de "Nueva cotización".
 * Solo se usa clearDraft(): al salir sin guardar se descarta el borrador.
 * QuoteDraftItem es el tipo de ítem usado al cargar datos (p. ej. desde la API).
 */

import { defineStore } from "pinia";

const STORAGE_KEY = "quote-draft";

export interface QuoteDraftItem {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  quantity: number;
  price: number;
}

export const useQuoteDraftStore = defineStore("quoteDraft", () => {
  function clearDraft(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return {
    clearDraft,
  };
});
