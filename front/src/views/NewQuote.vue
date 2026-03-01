<template>
  <div class="quote-form-container">
    <header class="quote-form-header">
      <div>
        <h1>Crear nueva cotización</h1>
        <p>Completa los datos del cliente y los productos a cotizar.</p>
      </div>
      <div class="quote-form-header-actions">
        <button class="ghost-button" type="button">Limpiar</button>
      </div>
    </header>

    <section class="card">
      <header class="card-header">
        <h2 class="card-title">Datos del cliente</h2>
      </header>

      <div class="card-body">
        <div class="form-row">
          <label class="field full">
            <span class="field-label">Buscar cliente</span>
            <div class="client-search">
              <input
                ref="clientSearchInputRef"
                v-model="form.searchClient"
                type="text"
                placeholder="Buscar por nombre, RUC/CI, teléfono, email o dirección..."
                autocomplete="off"
                aria-autocomplete="list"
                :aria-expanded="
                  showClientSuggestions && filteredClients.length > 0
                "
                aria-haspopup="listbox"
                :aria-activedescendant="
                  clientHighlightIndex >= 0 &&
                  filteredClients[clientHighlightIndex]
                    ? `client-suggestion-${filteredClients[clientHighlightIndex]?.id}`
                    : undefined
                "
                @focus="onClientSearchFocus"
                @blur="onClientSearchBlur"
                @keydown="onClientSearchKeydown"
              />
              <ul
                v-if="showClientSuggestions && filteredClients.length"
                class="client-suggestions"
                role="listbox"
              >
                <li
                  v-for="(client, index) in filteredClients"
                  :key="client.id"
                  :id="`client-suggestion-${client.id}`"
                  role="option"
                  :aria-selected="index === clientHighlightIndex"
                  class="client-suggestion-item"
                  :class="{
                    'client-suggestion-item--highlighted':
                      index === clientHighlightIndex,
                  }"
                  @mousedown.prevent="selectClient(client)"
                >
                  <span class="client-suggestion-name">{{ client.name }}</span>
                  <span class="client-suggestion-doc">{{
                    client.document
                  }}</span>
                </li>
              </ul>
            </div>
          </label>
        </div>

        <div class="form-row">
          <label class="field">
            <span class="field-label">Nombre / Razón social</span>
            <input
              v-model="form.name"
              type="text"
              placeholder="Ej: Empresa ABC S.A."
            />
          </label>
          <label class="field">
            <span class="field-label">Cédula / RUC</span>
            <input
              v-model="form.document"
              type="text"
              placeholder="Ej: 1791234567001"
            />
          </label>
          <label class="field">
            <span class="field-label">
              Dirigida a
              <span class="field-optional">(Opcional)</span>
            </span>
            <input
              v-model="form.directedTo"
              type="text"
              placeholder="Ej: Jefe de Compras"
            />
          </label>
        </div>

        <div class="form-row">
          <label class="field">
            <span class="field-label">Teléfono</span>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="Ej: 0982136229"
            />
          </label>
          <label class="field">
            <span class="field-label">Email</span>
            <input
              v-model="form.email"
              type="email"
              placeholder="Ej: contacto@empresa.com"
            />
          </label>
          <label class="field">
            <span class="field-label">Dirección</span>
            <input
              v-model="form.address"
              type="text"
              placeholder="Ej: Av. Principal 123, Quito"
            />
          </label>
        </div>

        <div class="form-row">
          <label class="field full">
            <span class="field-label">
              Referencia
              <span class="field-optional">(Opcional)</span>
            </span>
            <input
              v-model="form.reference"
              type="text"
              placeholder="Ej: Obra Norte, Proyecto X"
            />
          </label>
        </div>
        <div class="form-row">
          <label class="field full">
            <span class="field-label">
              Proyecto
              <span class="field-optional">(Opcional)</span>
            </span>
            <input
              v-model="form.project"
              type="text"
              placeholder="Ej: Obra Norte, Lote 5..."
            />
          </label>
        </div>
      </div>
    </section>

    <section class="card card--overflow-visible">
      <header class="card-header">
        <h2 class="card-title">Detalles de la cotización</h2>
      </header>
      <div class="card-body">
        <div class="form-row">
          <label class="field full">
            <span class="field-label">Buscar productos</span>
            <div class="product-search">
              <input
                ref="productSearchInputRef"
                v-model="form.searchProduct"
                type="text"
                placeholder="Buscar producto..."
                autocomplete="off"
                aria-autocomplete="list"
                :aria-expanded="showSuggestions && filteredProducts.length > 0"
                aria-haspopup="listbox"
                :aria-activedescendant="
                  productHighlightIndex >= 0 &&
                  filteredProducts[productHighlightIndex]
                    ? `product-suggestion-${filteredProducts[productHighlightIndex]?.id}`
                    : undefined
                "
                @focus="onSearchFocus"
                @blur="onSearchBlur"
                @keydown="onProductSearchKeydown"
              />

              <ul
                v-if="showSuggestions && filteredProducts.length"
                class="product-suggestions"
                role="listbox"
                id="product-suggestions-listbox"
              >
                <li
                  v-for="(product, index) in filteredProducts"
                  :key="product.id"
                  :id="`product-suggestion-${product.id}`"
                  role="option"
                  :aria-selected="index === productHighlightIndex"
                  class="product-suggestion"
                  :class="{
                    'product-suggestion--highlighted':
                      index === productHighlightIndex,
                  }"
                  @mousedown.prevent="addProduct(product)"
                >
                  <span class="suggestion-code">{{ product.code }}</span>
                  <span class="suggestion-main">
                    <span class="suggestion-name">{{ product.name }}</span>
                    <span class="suggestion-subtitle">
                      {{ product.subtitle }}
                    </span>
                  </span>
                  <span class="suggestion-price">
                    ${{ product.price.toFixed(2) }}
                  </span>
                </li>
              </ul>
            </div>
          </label>
        </div>

        <div v-if="items.length" class="products-table">
          <div class="products-header">
            <span class="col-id">ID</span>
            <span class="col-name">Producto</span>
            <span class="col-qty">Cantidad</span>
            <span class="col-price">Precio unitario</span>
            <span class="col-total">Total</span>
            <span class="col-actions"></span>
          </div>

          <div v-for="item in items" :key="item.id" class="products-row">
            <div class="col-id">
              <span class="product-code">{{ item.code }}</span>
            </div>
            <div class="col-name">
              <p class="product-title">{{ item.name }}</p>
              <p class="product-subtitle">{{ item.subtitle }}</p>
            </div>
            <div class="col-qty">
              <input
                v-model.number="item.quantity"
                type="number"
                min="0.01"
                max="999999.99"
                step="0.01"
                placeholder="0.00"
                class="qty-input"
                @blur="onQtyBlur(item, $event)"
              />
            </div>
            <div class="col-price">
              <input
                v-model.number="item.price"
                type="number"
                min="0"
                step="0.01"
                class="price-input"
                @blur="onPriceBlur(item, $event)"
              />
            </div>
            <div class="col-total">
              <span>{{ item.totalFormatted }}</span>
            </div>
            <div class="col-actions">
              <button
                type="button"
                class="icon-button icon-button-delete"
                :aria-label="`Eliminar ${item.name}`"
                @click="openDeleteConfirm(item)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="items.length" class="discount-row">
          <label class="discount-row-label">Descuento (valor en $)</label>
          <input
            v-model.number="form.discount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            class="discount-row-input"
            @blur="onDiscountBlur"
          />
        </div>

        <div v-if="items.length" class="summary-block">
          <div class="summary-row">
            <div class="summary-label">Suma:</div>
            <div class="summary-value">{{ subtotalFormatted }}</div>
          </div>
          <div v-if="discountAmount > 0" class="summary-row">
            <div class="summary-label">Descuento:</div>
            <div class="summary-value">-{{ discountFormatted }}</div>
          </div>
          <div class="summary-row">
            <div class="summary-label">IVA 15%:</div>
            <div class="summary-value">{{ ivaFormatted }}</div>
          </div>
          <div class="summary-row summary-row-total">
            <div class="summary-label">Total:</div>
            <div class="summary-value">{{ totalFormatted }}</div>
          </div>
        </div>

        <div class="form-row">
          <label class="field full">
            <span class="field-label">Validez de la oferta</span>
            <input
              v-model="form.validity"
              type="text"
              placeholder="Ej: 15 días, Válida hasta 30/03/2025..."
            />
          </label>
        </div>
        <div class="form-row">
          <label class="field full">
            <span class="field-label">Lugar de entrega</span>
            <select v-model="form.deliveryPlace" class="field-select">
              <option value="">Seleccionar...</option>
              <option value="on_site">En obra/proyecto</option>
              <option value="warehouse">En bodega</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="field full">
            <span class="field-label">
              Tiempo de entrega
              <span class="field-optional">(si tiene instalación)</span>
            </span>
            <input
              v-model="form.deliveryTime"
              type="text"
              placeholder="Ej: 5 días hábiles después de confirmación..."
            />
          </label>
        </div>
        <div class="form-row">
          <label class="field full">
            <span class="field-label">Forma de pago</span>
            <input
              v-model="form.paymentMethod"
              type="text"
              placeholder="Ej: Contado, 30 días, 50% anticipo..."
            />
          </label>
        </div>
        <div class="form-row">
          <label class="field full">
            <span class="field-label">
              Aclaraciones
              <span class="field-optional">(Opcional)</span>
            </span>
            <textarea
              v-model="form.disclaimer"
              rows="2"
              placeholder="Ej: Sujeto a cambios en impuestos, aranceles de importación, tipo de cambio u otros factores."
            />
          </label>
        </div>
        <div class="form-row notes-row">
          <label class="field full">
            <span class="field-label">Notas</span>
            <textarea
              v-model="form.notes"
              rows="3"
              placeholder="Notas internas o aclaraciones para el cliente..."
            />
          </label>
        </div>
      </div>
    </section>

    <div class="actions-row">
      <button class="ghost-button" type="button" @click="onSave">
        Guardar
      </button>
      <button class="primary-action" type="button" @click="onExportPdf">
        Exportar a PDF
      </button>
    </div>

    <!-- Layout específico para PDF (oculto en la UI) -->
    <div class="pdf-wrapper">
      <div id="quote-pdf" ref="pdfRef" class="pdf-page">
        <div class="pdf-watermark"></div>
        <header class="pdf-header">
          <div class="pdf-header-left">
            <h1 class="pdf-title">Cotización</h1>
          </div>
          <div class="pdf-header-right">
            <img src="/logo_geomtech.jpg" alt="Geomtech" class="pdf-logo" />
          </div>
        </header>

        <div class="pdf-content">
          <section class="pdf-client">
            <div class="pdf-row">
              <span class="pdf-label">Cliente:</span>
              <span class="pdf-value">{{ form.name || "—" }}</span>
            </div>
            <div class="pdf-row">
              <span class="pdf-label">RUC / CI:</span>
              <span class="pdf-value">{{ form.document || "—" }}</span>
            </div>
            <div class="pdf-row">
              <span class="pdf-label">Email:</span>
              <span class="pdf-value">{{ form.email || "—" }}</span>
            </div>
            <div class="pdf-row">
              <span class="pdf-label">Teléfono:</span>
              <span class="pdf-value">{{ form.phone || "—" }}</span>
            </div>
            <div class="pdf-row">
              <span class="pdf-label">Dirección:</span>
              <span class="pdf-value">{{ form.address || "—" }}</span>
            </div>
            <div v-if="form.directedTo" class="pdf-row">
              <span class="pdf-label">Dirigida a:</span>
              <span class="pdf-value">{{ form.directedTo }}</span>
            </div>
            <div v-if="form.project" class="pdf-row">
              <span class="pdf-label">Proyecto:</span>
              <span class="pdf-value">{{ form.project }}</span>
            </div>
          </section>

          <section class="pdf-table-section" v-if="items.length">
            <table class="pdf-table">
              <thead>
                <tr>
                  <th class="col-name">Producto</th>
                  <th class="col-qty">Cantidad</th>
                  <th class="col-price">Precio Unit.</th>
                  <th class="col-total">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in items" :key="item.id">
                  <td class="col-name">
                    <div class="pdf-product-name">{{ item.name }}</div>
                    <div class="pdf-product-sub">{{ item.subtitle }}</div>
                  </td>
                  <td class="col-qty">
                    {{ formatQty(item.quantity) }}
                  </td>
                  <td class="col-price">
                    ${{ (Number(item.price) || 0).toFixed(2) }}
                  </td>
                  <td class="col-total">${{ item.total.toFixed(2) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="pdf-summary-label">Subtotal</td>
                  <td class="pdf-summary-value">{{ subtotalFormatted }}</td>
                </tr>
                <tr v-if="discountAmount > 0">
                  <td colspan="3" class="pdf-summary-label">Descuento</td>
                  <td class="pdf-summary-value">-{{ discountFormatted }}</td>
                </tr>
                <tr>
                  <td colspan="3" class="pdf-summary-label">IVA 15%</td>
                  <td class="pdf-summary-value">{{ ivaFormatted }}</td>
                </tr>
                <tr>
                  <td colspan="3" class="pdf-summary-label pdf-summary-total">
                    Total
                  </td>
                  <td class="pdf-summary-value pdf-summary-total">
                    {{ totalFormatted }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section v-if="totalInWordsSentence" class="pdf-notes">
            <p class="pdf-notes-text pdf-value-sentence">
              {{ totalInWordsSentence }}
            </p>
          </section>

          <section v-if="form.validity" class="pdf-notes">
            <h2 class="pdf-notes-title">Validez de la oferta</h2>
            <p class="pdf-notes-text">{{ form.validity }}</p>
          </section>
          <section v-if="form.deliveryPlace" class="pdf-notes">
            <h2 class="pdf-notes-title">Lugar de entrega</h2>
            <p class="pdf-notes-text">
              {{
                form.deliveryPlace === "on_site"
                  ? "En obra/proyecto"
                  : "En bodega"
              }}
            </p>
          </section>
          <section v-if="form.deliveryTime" class="pdf-notes">
            <h2 class="pdf-notes-title">Tiempo de entrega</h2>
            <p class="pdf-notes-text">{{ form.deliveryTime }}</p>
          </section>
          <section v-if="form.paymentMethod" class="pdf-notes">
            <h2 class="pdf-notes-title">Forma de pago</h2>
            <p class="pdf-notes-text">{{ form.paymentMethod }}</p>
          </section>
          <section v-if="form.disclaimer" class="pdf-notes">
            <h2 class="pdf-notes-title">Aclaraciones</h2>
            <p class="pdf-notes-text">{{ form.disclaimer }}</p>
          </section>
          <section v-if="form.notes" class="pdf-notes">
            <h2 class="pdf-notes-title">Notas</h2>
            <p class="pdf-notes-text">
              {{ form.notes }}
            </p>
          </section>
        </div>

        <footer class="pdf-footer">
          <p class="pdf-footer-text">
            <template v-if="organization">
              <span v-if="organization.ruc">RUC: {{ organization.ruc }}</span>
              <span v-if="organization.email">
                {{ organization.ruc ? " · " : "" }}Correo electrónico:
                {{ organization.email }}
              </span>
              <span v-if="organization.contactPhone">
                {{
                  organization.ruc || organization.email ? " · " : ""
                }}Teléfono: {{ formatPhone(organization.contactPhone) }}
              </span>
              <template
                v-if="
                  !organization.ruc &&
                  !organization.email &&
                  !organization.contactPhone
                "
                >—</template
              >
            </template>
            <template v-else>—</template>
          </p>
          <p class="pdf-footer-brand">{{ organization?.name || "—" }}</p>
        </footer>
      </div>
    </div>

    <AppModal
      v-model="showDeleteModal"
      title="¿Eliminar producto?"
      variant="danger"
    >
      <p v-if="itemToRemove">
        Se eliminará <strong>{{ itemToRemove.name }}</strong> de la cotización.
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="closeDeleteModal"
        >
          Cancelar
        </button>
        <button
          ref="deleteConfirmButtonRef"
          type="button"
          class="modal-btn modal-btn-primary"
          @click="confirmDelete"
        >
          Eliminar
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref, nextTick, watch, onMounted } from "vue";
import html2pdf from "html2pdf.js";
import AppModal from "../components/AppModal.vue";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";
import { useOrganizationStore } from "../stores/organization";
import { NumerosALetras } from "numero-a-letras";

const organizationStore = useOrganizationStore();
const organization = computed(() => organizationStore.organization);

/** Format phone for display (e.g. 0985218813 or 985218813 → +593 98 521 8813) */
function formatPhone(phone: string | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  let nine = digits;
  if (digits.length === 10 && digits.startsWith("0")) {
    nine = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith("593")) {
    nine = digits.slice(3);
  }
  if (nine.length === 9) {
    return `+593 ${nine.slice(0, 2)} ${nine.slice(2, 5)} ${nine.slice(5, 9)}`;
  }
  return phone;
}

const showSuggestions = ref(false);
const showClientSuggestions = ref(false);
const productHighlightIndex = ref(-1);
const productSearchInputRef = ref<HTMLInputElement | null>(null);
const clientHighlightIndex = ref(-1);
const clientSearchInputRef = ref<HTMLInputElement | null>(null);

type Product = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  price: number;
};

type Client = {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
};

const api = useApi();
const clients = ref<Client[]>([]);
const clientsLoading = ref(false);

async function fetchCustomers() {
  clientsLoading.value = true;
  try {
    const result = await api.get("/api/customers");
    clients.value = (result?.data ?? []).map((c: { id: string; name: string; document: string; phone: string; email: string; address: string }) => ({
      id: c.id,
      name: c.name ?? "",
      document: c.document ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
    }));
  } catch {
    clients.value = [];
  } finally {
    clientsLoading.value = false;
  }
}

onMounted(() => {
  fetchCustomers();
});

const form = reactive({
  searchClient: "",
  name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
  directedTo: "",
  reference: "",
  project: "",
  searchProduct: "",
  discount: 0 as number,
  validity: "",
  deliveryPlace: "" as "" | "on_site" | "warehouse",
  deliveryTime: "",
  paymentMethod: "",
  disclaimer: "",
  notes: "",
});

const pdfRef = ref<HTMLElement | null>(null);
const toastStore = useToastStore();

const filteredClients = computed(() => {
  const q = form.searchClient.trim().toLowerCase();
  if (!q) return [] as Client[];
  return clients.value.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.document && c.document.includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)),
  );
});

watch(filteredClients, (list) => {
  if (list.length === 0) {
    clientHighlightIndex.value = -1;
  } else if (clientHighlightIndex.value >= list.length) {
    clientHighlightIndex.value = list.length - 1;
  } else if (clientHighlightIndex.value < 0) {
    clientHighlightIndex.value = 0;
  }
});

watch(clientHighlightIndex, (index) => {
  if (index < 0 || !showClientSuggestions.value) return;
  const list = filteredClients.value;
  const client = list[index];
  if (!client) return;
  nextTick(() => {
    const el = document.getElementById(`client-suggestion-${client.id}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
});

const onClientSearchFocus = () => {
  showClientSuggestions.value = true;
  if (filteredClients.value.length > 0) {
    clientHighlightIndex.value = 0;
  }
};

const onClientSearchBlur = () => {
  setTimeout(() => {
    showClientSuggestions.value = false;
    clientHighlightIndex.value = -1;
  }, 150);
};

const onClientSearchKeydown = (e: KeyboardEvent) => {
  const list = filteredClients.value;
  if (!showClientSuggestions.value || list.length === 0) {
    if (e.key === "Escape") {
      clientHighlightIndex.value = -1;
      clientSearchInputRef.value?.blur();
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      clientHighlightIndex.value =
        clientHighlightIndex.value < list.length - 1
          ? clientHighlightIndex.value + 1
          : 0;
      break;
    case "ArrowUp":
      e.preventDefault();
      clientHighlightIndex.value =
        clientHighlightIndex.value > 0
          ? clientHighlightIndex.value - 1
          : list.length - 1;
      break;
    case "Enter": {
      e.preventDefault();
      const selected = list[clientHighlightIndex.value];
      if (clientHighlightIndex.value >= 0 && selected) {
        selectClient(selected);
        clientSearchInputRef.value?.blur();
      }
      break;
    }
    case "Escape":
      e.preventDefault();
      clientHighlightIndex.value = -1;
      showClientSuggestions.value = false;
      clientSearchInputRef.value?.blur();
      break;
    default:
      break;
  }
};

const selectClient = (client: Client) => {
  form.name = client.name;
  form.document = client.document;
  form.phone = client.phone;
  form.email = client.email;
  form.address = client.address;
  form.directedTo = "";
  form.reference = "";
  form.searchClient = "";
  showClientSuggestions.value = false;
  clientSearchInputRef.value?.blur();
};

const showDeleteModal = ref(false);
const itemToRemove = ref<{ id: string; name: string } | null>(null);
const deleteConfirmButtonRef = ref<HTMLButtonElement | null>(null);

watch(showDeleteModal, (visible) => {
  if (visible) {
    nextTick(() => {
      deleteConfirmButtonRef.value?.focus();
    });
  }
});

const openDeleteConfirm = (item: { id: string; name: string }) => {
  itemToRemove.value = { id: item.id, name: item.name };
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  itemToRemove.value = null;
};

const confirmDelete = () => {
  if (!itemToRemove.value) return;
  const index = items.findIndex((i) => i.id === itemToRemove.value!.id);
  if (index !== -1) items.splice(index, 1);
  closeDeleteModal();
};

const onSearchFocus = () => {
  showSuggestions.value = true;
  if (filteredProducts.value.length > 0) {
    productHighlightIndex.value = 0;
  }
};

const onSearchBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false;
    productHighlightIndex.value = -1;
  }, 100);
};

const onProductSearchKeydown = (e: KeyboardEvent) => {
  const list = filteredProducts.value;
  if (!showSuggestions.value || list.length === 0) {
    if (e.key === "Escape") {
      productHighlightIndex.value = -1;
      productSearchInputRef.value?.blur();
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      productHighlightIndex.value =
        productHighlightIndex.value < list.length - 1
          ? productHighlightIndex.value + 1
          : 0;
      break;
    case "ArrowUp":
      e.preventDefault();
      productHighlightIndex.value =
        productHighlightIndex.value > 0
          ? productHighlightIndex.value - 1
          : list.length - 1;
      break;
    case "Enter": {
      e.preventDefault();
      const selected = list[productHighlightIndex.value];
      if (productHighlightIndex.value >= 0 && selected) {
        addProduct(selected);
      }
      break;
    }
    case "Escape":
      e.preventDefault();
      productHighlightIndex.value = -1;
      showSuggestions.value = false;
      productSearchInputRef.value?.blur();
      break;
    default:
      break;
  }
};

const products: Product[] = [
  {
    id: "geo-1",
    code: "GM-HDPE-1.0",
    name: "Geomembrana HDPE 1.0 mm",
    subtitle: "Polietileno de alta densidad, impermeabilización",
    price: 0,
  },
  {
    id: "geo-2",
    code: "GM-HDPE-0.75",
    name: "Geomembrana HDPE 0.75 mm",
    subtitle: "Polietileno de alta densidad, espesor estándar",
    price: 0,
  },
  {
    id: "geo-3",
    code: "GM-HDPE-1.5",
    name: "Geomembrana HDPE 1.5 mm",
    subtitle: "Polietileno de alta densidad, alta resistencia",
    price: 0,
  },
  {
    id: "geo-4",
    code: "GM-HDPE-2.0",
    name: "Geomembrana HDPE 2.0 mm",
    subtitle: "Polietileno de alta densidad, uso pesado",
    price: 0,
  },
  {
    id: "geo-5",
    code: "GM-LDPE-1.0",
    name: "Geomembrana LDPE 1.0 mm",
    subtitle: "Polietileno de baja densidad, flexibilidad",
    price: 0,
  },
  {
    id: "geo-6",
    code: "EC-STD",
    name: "Embed channel (canal de anclaje)",
    subtitle: "Canal para fijación de geomembrana",
    price: 0,
  },
  {
    id: "geo-7",
    code: "SOL-EXT",
    name: "Soldadura por extrusión",
    subtitle: "Servicio de soldadura de geomembranas",
    price: 0,
  },
  {
    id: "geo-8",
    code: "SOL-CUÑA",
    name: "Soldadura por cuña (doble)",
    subtitle: "Unión térmica de geomembranas",
    price: 0,
  },
  {
    id: "geo-9",
    code: "GT-NW",
    name: "Geotextil no tejido",
    subtitle: "Filtración y separación, varios pesos",
    price: 0,
  },
  {
    id: "geo-10",
    code: "GT-TEJ",
    name: "Geotextil tejido",
    subtitle: "Refuerzo y estabilización",
    price: 0,
  },
  {
    id: "geo-11",
    code: "GD-DREN",
    name: "Geodrén",
    subtitle: "Drenaje geosintético, núcleo + geotextil",
    price: 0,
  },
  {
    id: "geo-12",
    code: "GEOCELDA",
    name: "Geocelda",
    subtitle: "Confinamiento y refuerzo de suelos",
    price: 0,
  },
  {
    id: "inst-1",
    code: "INST",
    name: "Instalación",
    subtitle: "Servicio de instalación en obra",
    price: 0,
  },
];

const items = reactive<
  Array<
    Product & {
      quantity: number;
      priceFormatted: string;
      total: number;
      totalFormatted: string;
    }
  >
>([]);

const filteredProducts = computed(() => {
  const q = form.searchProduct.trim().toLowerCase();
  if (!q) {
    return [];
  }
  return products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q),
    )
    .slice(0, 5);
});

watch(filteredProducts, (list) => {
  if (list.length === 0) {
    productHighlightIndex.value = -1;
  } else if (productHighlightIndex.value >= list.length) {
    productHighlightIndex.value = list.length - 1;
  } else if (productHighlightIndex.value < 0) {
    productHighlightIndex.value = 0;
  }
});

watch(productHighlightIndex, (index) => {
  if (index < 0 || !showSuggestions.value) return;
  const list = filteredProducts.value;
  const product = list[index];
  if (!product) return;
  nextTick(() => {
    const el = document.getElementById(`product-suggestion-${product.id}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
});

const addProduct = (product: Product) => {
  const existing = items.find((i) => i.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({
      ...product,
      // Price is always set manually; we start at 0
      price: 0,
      quantity: 1,
      get priceFormatted() {
        const p = Number(this.price);
        return `$${(Number.isNaN(p) ? 0 : p).toFixed(2)}`;
      },
      get total() {
        const p = Number(this.price);
        const q = Number(this.quantity);
        return (Number.isNaN(p) ? 0 : p) * (Number.isNaN(q) || q <= 0 ? 1 : q);
      },
      get totalFormatted() {
        return `$${this.total.toFixed(2)}`;
      },
    });
  }

  form.searchProduct = "";
  // Do not set showSuggestions = false here: input keeps focus, so the list
  // will hide because filteredProducts becomes []; when user types again, list reappears.
};

const subtotal = computed(() =>
  items.reduce((sum, item) => sum + item.total, 0),
);

const discountAmount = computed(() => {
  const d = Number(form.discount);
  const s = subtotal.value;
  if (Number.isNaN(d) || d < 0) return 0;
  return Math.min(d, s);
});

const subtotalAfterDiscount = computed(
  () => subtotal.value - discountAmount.value,
);

const iva = computed(() => subtotalAfterDiscount.value * 0.15);

const total = computed(() => subtotalAfterDiscount.value + iva.value);

const subtotalFormatted = computed(() => `$${subtotal.value.toFixed(2)}`);
const discountFormatted = computed(() => `$${discountAmount.value.toFixed(2)}`);
const ivaFormatted = computed(() => `$${iva.value.toFixed(2)}`);
const totalFormatted = computed(() => `$${total.value.toFixed(2)}`);

/** Total amount in words for PDF: number in letters + ##/100 + "dólares" (e.g. "ocho mil cincuenta 50/100 dólares") */
const totalInWords = computed(() => {
  const val = total.value;
  if (val <= 0 || !Number.isFinite(val)) return "";
  try {
    const full = NumerosALetras(val);
    return full
      .toLowerCase()
      .trim()
      .replace(/\bpesos?\s+/gi, "")
      .replace(/\s+m\.n\.?/gi, " dólares");
  } catch {
    return "";
  }
});

/** Sentence for PDF: "Son [number in words] 50/100 dólares." (formal, standard in quotes/invoices) */
const totalInWordsSentence = computed(() => {
  const words = totalInWords.value;
  if (!words) return "";
  return `Son ${words}.`;
});

const onDiscountBlur = () => {
  const raw = Number(form.discount);
  if (Number.isNaN(raw) || raw < 0) {
    form.discount = 0;
    return;
  }
  const capped = Math.min(raw, subtotal.value);
  form.discount = Math.round(capped * 100) / 100;
};

/** Format quantity: up to 6 integer digits and 2 decimals for PDF/list */
const formatQty = (n: number) => {
  const val = Number(n);
  if (Number.isNaN(val) || val < 0) return "0.00";
  const clamped = Math.min(999999.99, Math.max(0, val));
  return clamped.toFixed(2);
};

const onPriceBlur = (item: { price: number }, event: FocusEvent) => {
  const raw = (event.target as HTMLInputElement | null)?.value.trim() ?? "";

  let newPrice: number;
  if (!raw) {
    newPrice = 0;
  } else {
    const normalized = raw.replace(/,/g, ".");
    const parsed = Number(normalized);
    newPrice = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }

  // Update in nextTick to avoid re-render during blur and prevent focus/scroll jump
  nextTick(() => {
    item.price = newPrice;
  });
};

const onQtyBlur = (item: { quantity: number }, event: FocusEvent) => {
  const raw = (event.target as HTMLInputElement | null)?.value.trim() ?? "";
  if (!raw) {
    nextTick(() => {
      item.quantity = 1;
    });
    return;
  }
  const normalized = raw.replace(/,/g, ".");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed <= 0) {
    nextTick(() => {
      item.quantity = 1;
    });
    return;
  }
  // Round to 2 decimals and clamp to 6 integer + 2 decimal digits (max 999999.99)
  const clamped = Math.min(
    999999.99,
    Math.max(0.01, Math.round(parsed * 100) / 100),
  );
  nextTick(() => {
    item.quantity = clamped;
  });
};

const onSave = () => {
  // TODO: connect to backend to save quote
  toastStore.show(
    "Cotización guardada (solo vista previa, sin backend).",
    "info",
  );
};

const onExportPdf = async () => {
  if (!pdfRef.value) return;

  const element = pdfRef.value;

  const opt = {
    margin: 0,
    filename: "quote-geomtech.pdf",
    image: { type: "jpeg", quality: 1.0 },
    html2canvas: { scale: 2.2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css"] },
  } as any;

  const worker: any = html2pdf().set(opt).from(element);

  await worker
    .toPdf()
    .get("pdf")
    .then((pdf: any) => {
      const totalPages = pdf.internal.getNumberOfPages();
      if (totalPages > 1) {
        pdf.deletePage(totalPages);
      }
    });

  await worker.save();
};
</script>

<style scoped>
.quote-form-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.quote-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.quote-form-header h1 {
  margin: 0;
  font-size: 1.6rem;
  color: #053f51;
}

.quote-form-header p {
  margin: 0.25rem 0 0 0;
  font-size: 0.95rem;
  color: #64748b;
}

.quote-form-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ghost-button {
  padding: 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #0f172a;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease-out;
}

.ghost-button:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.card--overflow-visible {
  overflow: visible;
}

.card-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.card-body {
  padding: 1.25rem 1.5rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field.full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
}

.field-optional {
  font-weight: 400;
  font-style: italic;
  color: #94a3b8;
}

input,
textarea {
  width: 100%;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.9rem;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

input::placeholder,
textarea::placeholder {
  color: #b8c4d4;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.3);
}

.field-select {
  width: 100%;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.9rem;
  outline: none;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2.25rem;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

/* Hide number input spinners */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.client-search {
  position: relative;
}

.client-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  padding: 0.35rem 0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  border: 1px solid #e2e8f0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  z-index: 10;
}

.client-suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.1s ease;
}

.client-suggestion-item:hover {
  background: #f8fafc;
}

.client-suggestion-item--highlighted,
.client-suggestion-item--highlighted:hover {
  background: #e2e8f0;
}

.client-suggestion-name {
  font-weight: 500;
  color: #0f172a;
}

.client-suggestion-doc {
  font-size: 0.8rem;
  color: #64748b;
}

.product-search {
  position: relative;
  z-index: 50;
}

.product-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  padding: 0.35rem 0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  border: 1px solid #e2e8f0;
  list-style: none;
  max-height: 260px;
  overflow-y: auto;
  z-index: 50;
}

.product-suggestion {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
  transition: background 0.1s ease;
}

.product-suggestion:hover {
  background: #f8fafc;
}

.product-suggestion--highlighted,
.product-suggestion--highlighted:hover {
  background: #e2e8f0;
}

.suggestion-code {
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 600;
}

.suggestion-main {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #0f172a;
}

.suggestion-subtitle {
  font-size: 0.75rem;
  color: #94a3b8;
}

.suggestion-price {
  font-size: 0.82rem;
  font-weight: 500;
  color: #053f51;
}

.products-table {
  width: 100%;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

/* Amount column width shared with summary block for alignment */
.products-header,
.products-row {
  display: grid;
  grid-template-columns: 1.2fr 3fr 1.4fr 1.3fr 8rem 2.5rem;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.products-header {
  padding: 0.7rem 1rem;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.products-row {
  padding: 0.8rem 1rem;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.product-code {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: #0f9f70;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #0f172a;
}

.product-subtitle {
  margin: 0.15rem 0 0 0;
  font-size: 0.78rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.qty-input {
  width: 100px;
  text-align: right;
}

.price-input {
  width: 90px;
  text-align: right;
}

.products-table .col-total {
  min-width: 8rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.icon-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.35rem;
  border-radius: 6px;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s,
    background 0.15s;
}

.icon-button:hover,
.icon-button:focus-visible {
  color: #b91c1c;
  background: #fef2f2;
  outline: none;
}

.summary-block {
  margin-top: 1rem;
  padding: 0.9rem 4rem 0.9rem 1rem; /* right 4rem aligns amount column with table Total (actions + gap) */
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-end;
}

.summary-row {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
}

.summary-row-total {
  font-weight: 600;
}

.summary-label {
  color: #64748b;
}

.summary-value {
  color: #0f172a;
  min-width: 8rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.discount-row {
  margin-top: 1rem;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.discount-row-label {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.discount-row-input {
  width: 6rem;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  text-align: right;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  -moz-appearance: textfield;
  appearance: textfield;
}

.discount-row-input::-webkit-outer-spin-button,
.discount-row-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.discount-row-input:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.25);
}

.discount-row + .summary-block {
  margin-top: 0.5rem;
}

.notes-row {
  margin-top: 0.5rem;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Layout PDF (A4) */
.pdf-wrapper {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 210mm;
  z-index: -1;
}

#quote-pdf {
  width: 210mm;
  min-height: 297mm;
  padding: 0 18mm 0;
  box-sizing: border-box;
  background: #ffffff;
  color: #0f172a;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.pdf-page {
  width: 210mm;
}

.pdf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8mm 0 6mm 0;
  margin: 0 -18mm 10mm -18mm;
  padding-left: 18mm;
  padding-right: 18mm;
  background: #053f51;
  color: #f9fafb;
  /* Borders to avoid white lines from rounding at edges */
  border-left: 1px solid #053f51;
  border-right: 1px solid #053f51;
}

.pdf-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.pdf-company-name {
  margin: 0 0 1mm 0;
  font-weight: 700;
}

.pdf-company-line {
  margin: 0;
  color: #e2e8f0;
}

.pdf-logo {
  max-width: 90px;
  height: auto;
}

.pdf-client {
  margin-bottom: 8mm;
}

.pdf-content {
  flex: 1;
}

.pdf-row {
  display: flex;
  gap: 3mm;
  margin-bottom: 1mm;
}

.pdf-label {
  min-width: 22mm;
  font-weight: 600;
}

.pdf-value {
  flex: 1;
}

.pdf-table-section {
  margin-bottom: 8mm;
}

.pdf-table {
  width: 100%;
  border-collapse: collapse;
}

.pdf-table thead th {
  background: #053f51;
  color: #f9fafb;
  font-weight: 600;
  padding: 4px 6px;
  border-top: 1px solid #053f51;
  border-bottom: 1px solid #053f51;
  border-left: none;
  border-right: none;
}

.pdf-table tbody td,
.pdf-table tfoot td {
  padding: 4px 6px;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  border-left: none;
  border-right: none;
}

.pdf-table .col-name {
  width: 55%;
}

.pdf-table .col-price {
  width: 15%;
  text-align: right;
}

.pdf-table .col-qty {
  width: 10%;
  text-align: center;
}

.pdf-table .col-total {
  width: 20%;
  text-align: right;
}

.pdf-product-name {
  font-weight: 500;
}

.pdf-product-sub {
  font-size: 10px;
  color: #6b7280;
}

.pdf-summary-label {
  text-align: right;
  font-weight: 500;
}

.pdf-summary-value {
  text-align: right;
}

.pdf-summary-total {
  font-weight: 700;
}

.pdf-notes {
  margin-top: 4mm;
}

.pdf-notes-title {
  margin: 0 0 1mm 0;
  font-size: 10px;
  font-weight: 600;
}

.pdf-notes-text {
  margin: 0;
}

.pdf-footer {
  margin: 0 -18mm 0 -18mm;
  padding: 4mm 18mm;
  background: #053f51;
  color: #f9fafb;
  font-size: 10px;
  text-align: center;
  border-left: 1px solid #053f51;
  border-right: 1px solid #053f51;
}

.pdf-footer-text {
  margin: 0;
}

.pdf-footer-brand {
  margin: 1mm 0 0 0;
  font-size: 9px;
  opacity: 0.85;
}

.pdf-watermark {
  position: absolute;
  inset: 0;
  background-image: url("/patron_geomtech.webp");
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 60%;
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
}

.pdf-header,
.pdf-content,
.pdf-footer {
  position: relative;
  z-index: 1;
}

@media (max-width: 960px) {
  .form-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .products-header,
  .products-row {
    grid-template-columns: 1.4fr 3fr 1.4fr 1.3fr;
    grid-template-areas:
      "id name name name"
      "id price qty total";
  }
}

@media (max-width: 640px) {
  .quote-form-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
