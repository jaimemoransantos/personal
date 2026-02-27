<template>
  <div class="cotizaciones-container">
    <header class="cotizaciones-header">
      <div>
        <h1>Crear nueva cotización</h1>
        <p>Completa los datos del cliente y los productos a cotizar.</p>
      </div>
      <div class="cotizaciones-header-actions">
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
            <input
              v-model="form.searchClient"
              type="text"
              placeholder="Buscar cliente..."
            />
          </label>
        </div>

        <div class="form-row">
          <label class="field">
            <span class="field-label">Nombre / Razón social</span>
            <input v-model="form.name" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Cédula / RUC</span>
            <input v-model="form.document" type="text" />
          </label>
          <label class="field">
            <span class="field-label">Teléfono</span>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="Ej: 0982136229"
            />
          </label>
        </div>

        <div class="form-row">
          <label class="field">
            <span class="field-label">Email</span>
            <input v-model="form.email" type="email" />
          </label>
          <label class="field">
            <span class="field-label">Dirección</span>
            <input v-model="form.address" type="text" />
          </label>
        </div>

        <div class="form-row">
          <label class="field full">
            <span class="field-label">
              Referencia
              <span class="field-optional">(Opcional)</span>
            </span>
            <input v-model="form.reference" type="text" />
          </label>
        </div>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <h2 class="card-title">Detalles de la cotización</h2>
      </header>
      <div class="card-body">
        <div class="form-row">
          <label class="field full">
            <span class="field-label">Buscar productos</span>
            <div class="product-search">
              <input
                v-model="form.searchProduct"
                type="text"
                placeholder="Buscar producto..."
                @focus="onSearchFocus"
                @blur="onSearchBlur"
              />

              <ul
                v-if="showSuggestions && filteredProducts.length"
                class="product-suggestions"
              >
                <li
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="product-suggestion"
                  @click="addProduct(product)"
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
            <span class="col-price">Precio unitario</span>
            <span class="col-qty">Cantidad</span>
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
            <div class="col-qty">
              <input
                v-model.number="item.quantity"
                type="number"
                min="1"
                class="qty-input"
                @blur="onQtyBlur(item)"
              />
            </div>
            <div class="col-total">
              <span>{{ item.totalFormatted }}</span>
            </div>
            <div class="col-actions">
              <button class="icon-button" type="button">🗑️</button>
            </div>
          </div>
        </div>

        <div v-if="items.length" class="summary-block">
          <div class="summary-row">
            <div class="summary-label">Suma:</div>
            <div class="summary-value">{{ subtotalFormatted }}</div>
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
      <div id="cotizacion" ref="pdfRef" class="pdf-page">
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
            <div v-if="form.reference" class="pdf-row">
              <span class="pdf-label">Referencia:</span>
              <span class="pdf-value">{{ form.reference }}</span>
            </div>
          </section>

          <section class="pdf-table-section" v-if="items.length">
            <table class="pdf-table">
              <thead>
                <tr>
                  <th class="col-name">Producto</th>
                  <th class="col-price">Precio Unit.</th>
                  <th class="col-qty">Cantidad</th>
                  <th class="col-total">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in items" :key="item.id">
                  <td class="col-name">
                    <div class="pdf-product-name">{{ item.name }}</div>
                    <div class="pdf-product-sub">{{ item.subtitle }}</div>
                  </td>
                  <td class="col-price">${{ item.price.toFixed(2) }}</td>
                  <td class="col-qty">
                    {{ item.quantity }}
                  </td>
                  <td class="col-total">${{ item.total.toFixed(2) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="pdf-summary-label">Subtotal</td>
                  <td class="pdf-summary-value">{{ subtotalFormatted }}</td>
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

          <section v-if="form.notes" class="pdf-notes">
            <h2 class="pdf-notes-title">Notas</h2>
            <p class="pdf-notes-text">
              {{ form.notes }}
            </p>
          </section>
        </div>

        <footer class="pdf-footer">
          <p class="pdf-footer-text">
            RUC: 0000000000001 · Correo electrónico: info@gemotech.com.ec ·
            Teléfono: +593 98 521 8813
          </p>
          <p class="pdf-footer-brand">Geomtech S.A.</p>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from "vue";
import html2pdf from "html2pdf.js";
import { useToastStore } from "../stores/toast";

type Product = {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  price: number;
};

const form = reactive({
  searchClient: "",
  name: "",
  document: "",
  phone: "",
  email: "",
  address: "",
  reference: "",
  searchProduct: "",
  notes: "",
});

const showSuggestions = ref(false);
const pdfRef = ref<HTMLElement | null>(null);
const toastStore = useToastStore();

const onSearchFocus = () => {
  showSuggestions.value = true;
};

const onSearchBlur = () => {
  // Pequeño delay para permitir el click en la sugerencia
  setTimeout(() => {
    showSuggestions.value = false;
  }, 100);
};

const products: Product[] = [
  {
    id: "1",
    code: "CENT102502000065",
    name: 'REJILLA DE RETORNO 24" LARGO x 12" ALTO LAMINAIRE BLANCA',
    subtitle: "NO HAY STOCK. CONSULTAR FECHA DE LLEGADA",
    price: 30.94,
  },
  {
    id: "2",
    code: "CENT202402000112",
    name: "DUCTO RECTANGULAR GALVANIZADO 30x40 cm",
    subtitle: "CALIBRE 24, INCLUYE AISLANTE",
    price: 120.5,
  },
  {
    id: "3",
    code: "CENT302402000210",
    name: "UNIDAD MANEJADORA 5 TR",
    subtitle: "ALTA EFICIENCIA, 220V",
    price: 3840.0,
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
    // Si no hay búsqueda, no mostramos sugerencias
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

const addProduct = (product: Product) => {
  const existing = items.find((i) => i.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({
      ...product,
      // Precio se define siempre manualmente; iniciamos en 0
      price: 0,
      quantity: 1,
      get priceFormatted() {
        return `$${this.price.toFixed(2)}`;
      },
      get total() {
        return this.price * this.quantity;
      },
      get totalFormatted() {
        return `$${this.total.toFixed(2)}`;
      },
    });
  }

  form.searchProduct = "";
  showSuggestions.value = false;
};

const subtotal = computed(() =>
  items.reduce((sum, item) => sum + item.total, 0),
);

const iva = computed(() => subtotal.value * 0.15);

const total = computed(() => subtotal.value + iva.value);

const subtotalFormatted = computed(() => `$${subtotal.value.toFixed(2)}`);
const ivaFormatted = computed(() => `$${iva.value.toFixed(2)}`);
const totalFormatted = computed(() => `$${total.value.toFixed(2)}`);

const onPriceBlur = (item: { price: number }, event: FocusEvent) => {
  const target = event.target as HTMLInputElement | null;
  const raw = target?.value.trim() ?? "";

  if (!raw) {
    item.price = 0;
    if (target) target.value = "0";
    return;
  }

  // Reemplazar comas por puntos para manejar decimales con coma
  const normalized = raw.replace(/,/g, ".");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) {
    item.price = 0;
    if (target) target.value = "0";
  } else {
    item.price = parsed;
    if (target) target.value = parsed.toString();
  }
};

const onQtyBlur = (item: { quantity: number }) => {
  if (
    item.quantity == null ||
    Number.isNaN(item.quantity) ||
    item.quantity <= 0
  ) {
    item.quantity = 1;
  }
};

const onSave = () => {
  // TODO: conectar con backend para guardar cotización
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
    filename: "cotizacion-geomtech.pdf",
    image: { type: "jpeg", quality: 1.0 },
    // Aumentamos ligeramente el scale para mejorar nitidez
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
      // Si hay una segunda página vacía, la eliminamos.
      if (totalPages > 1) {
        pdf.deletePage(totalPages);
      }
    });

  await worker.save();
};
</script>

<style scoped>
.cotizaciones-container {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.cotizaciones-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.cotizaciones-header h1 {
  margin: 0;
  font-size: 1.6rem;
  color: #053f51;
}

.cotizaciones-header p {
  margin: 0.25rem 0 0 0;
  font-size: 0.95rem;
  color: #64748b;
}

.cotizaciones-header-actions {
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
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

input:focus,
textarea:focus {
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.3);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

/* Ocultar flechitas de los inputs numéricos */
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

.product-search {
  position: relative;
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
  z-index: 10;
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

.products-header,
.products-row {
  display: grid;
  grid-template-columns: 1.2fr 3fr 1.4fr 1.3fr 1.4fr 0.6fr;
  align-items: center;
  gap: 0.75rem;
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
  width: 70px;
  text-align: center;
}

.price-input {
  width: 90px;
  text-align: right;
}

.icon-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
}

.summary-block {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
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

#cotizacion {
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
  /* Bordes para evitar cualquier línea blanca por redondeos en los extremos */
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
  opacity: 0.03;
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
  .cotizaciones-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
