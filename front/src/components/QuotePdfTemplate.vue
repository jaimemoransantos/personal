<template>
  <div class="quote-pdf-root pdf-page">
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
          <span class="pdf-value">{{ client.name || "—" }}</span>
        </div>
        <div class="pdf-row">
          <span class="pdf-label">RUC / CI:</span>
          <span class="pdf-value">{{ client.document || "—" }}</span>
        </div>
        <div class="pdf-row">
          <span class="pdf-label">Email:</span>
          <span class="pdf-value">{{ client.email || "—" }}</span>
        </div>
        <div class="pdf-row">
          <span class="pdf-label">Teléfono:</span>
          <span class="pdf-value">{{ client.phone || "—" }}</span>
        </div>
        <div class="pdf-row">
          <span class="pdf-label">Dirección:</span>
          <span class="pdf-value">{{ client.address || "—" }}</span>
        </div>
        <div v-if="client.directedTo" class="pdf-row">
          <span class="pdf-label">Dirigida a:</span>
          <span class="pdf-value">{{ client.directedTo }}</span>
        </div>
        <div v-if="client.project" class="pdf-row">
          <span class="pdf-label">Proyecto:</span>
          <span class="pdf-value">{{ client.project }}</span>
        </div>
      </section>

      <section v-if="items.length" class="pdf-table-section">
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
                <div class="pdf-product-sub">{{ item.subtitle ?? "" }}</div>
              </td>
              <td class="col-qty">{{ formatQty(item.quantity) }}</td>
              <td class="col-price">
                {{ formatCurrency(Number(item.price) || 0) }}
              </td>
              <td class="col-total">{{ formatCurrency(itemTotal(item)) }}</td>
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
      <section v-if="quote.validity" class="pdf-notes">
        <h2 class="pdf-notes-title">Validez de la oferta</h2>
        <p class="pdf-notes-text">{{ quote.validity }}</p>
      </section>
      <section v-if="quote.deliveryPlace" class="pdf-notes">
        <h2 class="pdf-notes-title">Lugar de entrega</h2>
        <p class="pdf-notes-text">
          {{
            quote.deliveryPlace === "on_site" ? "En obra/proyecto" : "En bodega"
          }}
        </p>
      </section>
      <section v-if="quote.deliveryTime" class="pdf-notes">
        <h2 class="pdf-notes-title">Tiempo de entrega</h2>
        <p class="pdf-notes-text">{{ quote.deliveryTime }}</p>
      </section>
      <section v-if="quote.paymentMethod" class="pdf-notes">
        <h2 class="pdf-notes-title">Forma de pago</h2>
        <p class="pdf-notes-text">{{ quote.paymentMethod }}</p>
      </section>
      <section v-if="quote.disclaimer" class="pdf-notes">
        <h2 class="pdf-notes-title">Aclaraciones</h2>
        <p class="pdf-notes-text">{{ quote.disclaimer }}</p>
      </section>
      <section v-if="quote.notes" class="pdf-notes">
        <h2 class="pdf-notes-title">Notas</h2>
        <p class="pdf-notes-text">{{ quote.notes }}</p>
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
            {{ organization.ruc || organization.email ? " · " : "" }}Teléfono:
            {{ formatPhone(organization.contactPhone) }}
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
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NumerosALetras } from "numero-a-letras";
import type { Organization } from "../stores/organization";
import { formatCurrency } from "../utils/format";

export interface QuotePdfItem {
  id: string;
  code: string;
  name: string;
  subtitle?: string;
  quantity: number;
  price: number;
}

export interface QuotePdfClient {
  name?: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  directedTo?: string;
  reference?: string;
  project?: string;
}

export interface QuotePdfPayload {
  quote: {
    client: QuotePdfClient;
    items: QuotePdfItem[];
    discount: number;
    validity?: string;
    deliveryPlace?: string;
    deliveryTime?: string;
    paymentMethod?: string;
    disclaimer?: string;
    notes?: string;
  };
  organization: Organization | null;
}

const props = defineProps<{
  payload: QuotePdfPayload | null;
}>();

const quote = computed(
  () => props.payload?.quote ?? { client: {}, items: [], discount: 0 },
);
const client = computed(() => quote.value.client ?? {});
const items = computed(() => quote.value.items ?? []);
const organization = computed(() => props.payload?.organization ?? null);

const round2 = (n: number) => Math.round(n * 100) / 100;

const subtotal = computed(() =>
  items.value.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0),
    0,
  ),
);
const discountAmount = computed(() => {
  const d = Number(quote.value.discount);
  const s = subtotal.value;
  if (!Number.isFinite(d) || d < 0) return 0;
  return round2(Math.min(d, s));
});
const subtotalAfterDiscount = computed(
  () => subtotal.value - discountAmount.value,
);
const iva = computed(() => round2(subtotalAfterDiscount.value * 0.15));
const total = computed(() => subtotalAfterDiscount.value + iva.value);

const subtotalFormatted = computed(() => formatCurrency(subtotal.value));
const discountFormatted = computed(() => formatCurrency(discountAmount.value));
const ivaFormatted = computed(() => formatCurrency(iva.value));
const totalFormatted = computed(() => formatCurrency(total.value));

const totalInWordsSentence = computed(() => {
  const val = total.value;
  if (val <= 0 || !Number.isFinite(val)) return "";
  try {
    const full = NumerosALetras(val);
    const words = full
      .toLowerCase()
      .trim()
      .replace(/\bpesos?\s+/gi, "")
      .replace(/\s+m\.n\.?/gi, " dólares");
    return words ? `Son ${words}.` : "";
  } catch {
    return "";
  }
});

function itemTotal(item: QuotePdfItem) {
  const q = Number(item.quantity) || 0;
  const p = Number(item.price) || 0;
  return q * p;
}

function formatQty(n: number) {
  const val = Number(n);
  if (!Number.isFinite(val) || val < 0) return "0.00";
  return Math.min(999999.99, Math.max(0, val)).toFixed(2);
}

function formatPhone(phone: string | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  let nine = digits;
  if (digits.length === 10 && digits.startsWith("0")) nine = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith("593"))
    nine = digits.slice(3);
  if (nine.length === 9) {
    return `+593 ${nine.slice(0, 2)} ${nine.slice(2, 5)} ${nine.slice(5, 9)}`;
  }
  return phone;
}
</script>

<style scoped>
.quote-pdf-root {
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
  border-left: 1px solid #053f51;
  border-right: 1px solid #053f51;
}

.pdf-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
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
</style>
