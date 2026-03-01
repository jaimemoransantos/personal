import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  ruc?: string;
  contactPhone?: string;
  email?: string;
}

export const useOrganizationStore = defineStore("organization", () => {
  const organization = ref<Organization | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const hasOrganization = computed(() => organization.value !== null);

  /**
   * Fetches the current user's organization from the API and stores it.
   * Call after the user is authenticated (and has synced profile so organizationId exists).
   * On 403 (no org yet), retries once after 2s to handle sync race.
   */
  async function fetchCurrentOrganization(retryCount = 0): Promise<Organization | null> {
    loading.value = true;
    error.value = null;
    try {
      const api = useApi();
      const result = await api.get("/api/organization/current");
      const data = result?.data as Organization | undefined;
      if (data) {
        organization.value = data;
        return data;
      }
      organization.value = null;
      return null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar la organización";
      error.value = message;
      organization.value = null;

      // Retry once after 2s (e.g. sync profile may not have set organizationId yet)
      if (retryCount < 1) {
        await new Promise((r) => setTimeout(r, 2000));
        return fetchCurrentOrganization(retryCount + 1);
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  function clearOrganization() {
    organization.value = null;
    error.value = null;
  }

  return {
    organization,
    loading,
    error,
    hasOrganization,
    fetchCurrentOrganization,
    clearOrganization,
  };
});
