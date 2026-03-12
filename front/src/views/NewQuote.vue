<template>
  <div class="quote-form-container">
    <nav class="quote-form-back">
      <button type="button" class="back-link" @click="onBackClick">
        <span class="back-icon" aria-hidden="true">←</span>
        Volver a cotizaciones
      </button>
    </nav>
    <header class="quote-form-header">
      <div class="quote-form-header-left">
        <h1>
          {{ isEditRoute ? "Editar cotización" : "Crear nueva cotización" }}
        </h1>
        <p>
          {{
            isEditRoute
              ? "Modifica los datos del cliente y los productos a cotizar."
              : "Completa los datos del cliente y los productos a cotizar."
          }}
        </p>
      </div>
      <div class="quote-form-header-actions">
        <div class="quote-form-header-actions-buttons">
          <!-- <button
          v-if="!isEditRoute"
          type="button"
          class="ghost-button"
          @click="fillMockQuote"
        >
          Rellenar datos de prueba
        </button> -->
          <button
            v-if="!isEditRoute"
            class="ghost-button ghost-button--danger"
            type="button"
            @click="onClear"
          >
            <svg
              class="icon-trash"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Limpiar
          </button>
        </div>
      </div>
    </header>

    <section class="card">
      <header class="card-header card-header--with-meta">
        <div
          v-if="isEditRoute && (quoteNumber || quoteUpdatedAtLabel)"
          class="card-header-top-row"
        >
          <p v-if="quoteNumber" class="card-header-quote-number">
            Nro. {{ quoteNumber }}
          </p>
          <span v-else></span>
          <p v-if="quoteUpdatedAtLabel" class="card-header-meta">
            Última modificación: {{ quoteUpdatedAtLabel }}
          </p>
        </div>
        <div class="card-header-row">
          <h2 class="card-title">Datos del cliente</h2>
          <div
            v-if="isEditRoute"
            class="status-badge-wrap"
            ref="statusBadgeWrapRef"
          >
            <button
              type="button"
              class="status-badge"
              :class="`status-badge--${form.status || 'pending'}`"
              aria-haspopup="listbox"
              :aria-expanded="statusDropdownOpen"
              @click="statusDropdownOpen = !statusDropdownOpen"
            >
              <span class="status-badge-dot" aria-hidden="true"></span>
              {{ quoteStatusLabel }}
              <span class="status-badge-chevron" aria-hidden="true">▼</span>
            </button>
            <transition name="dropdown-fade">
              <div
                v-show="statusDropdownOpen"
                class="status-dropdown"
                role="listbox"
                @click.stop
              >
                <button
                  type="button"
                  role="option"
                  :aria-selected="form.status === 'pending'"
                  class="status-dropdown-option status-dropdown-option--pending"
                  @click="setQuoteStatus('pending')"
                >
                  <span class="status-option-dot"></span>
                  Pendiente
                </button>
                <button
                  type="button"
                  role="option"
                  :aria-selected="form.status === 'accepted'"
                  class="status-dropdown-option status-dropdown-option--accepted"
                  @click="setQuoteStatus('accepted')"
                >
                  <span class="status-option-dot"></span>
                  Aceptada
                </button>
                <button
                  type="button"
                  role="option"
                  :aria-selected="form.status === 'rejected'"
                  class="status-dropdown-option status-dropdown-option--rejected"
                  @click="setQuoteStatus('rejected')"
                >
                  <span class="status-option-dot"></span>
                  Rechazada
                </button>
              </div>
            </transition>
          </div>
        </div>
      </header>

      <div class="card-body">
        <div v-if="!isEditRoute" class="form-row">
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
        <div
          v-if="isEditRoute && customerNotFound && (form.name ?? '').trim()"
          class="form-row form-row--actions form-row--update-client"
        >
          <p class="update-client-hint">
            El cliente vinculado a esta cotización ya no existe. Puedes crear un
            nuevo cliente con los datos del formulario y vincularlo al guardar.
          </p>
          <button
            type="button"
            class="btn-create-client"
            :disabled="creatingCustomer"
            @click="onCreateCustomerFromQuote"
          >
            {{ creatingCustomer ? "Creando…" : "Crear cliente" }}
          </button>
        </div>
        <div
          v-if="hasClientChanges"
          class="form-row form-row--actions form-row--update-client"
        >
          <p v-if="isEditRoute" class="update-client-hint">
            Los datos del formulario difieren del registro del cliente. Si
            actualizas, se guardarán en Clientes y podrían sobrescribir cambios
            hechos allí.
          </p>
          <button
            type="button"
            class="btn-update-client"
            :disabled="updatingCustomer"
            @click="onUpdateCustomer"
          >
            {{ updatingCustomer ? "Actualizando…" : "Actualizar cliente" }}
          </button>
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
                    {{ formatCurrency(product.price) }}
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
                :value="item.quantity"
                type="text"
                inputmode="decimal"
                placeholder="0.00"
                class="qty-input"
                @focus="
                  ($event) => ($event.target as HTMLInputElement)?.select()
                "
                @input="onDecimalInput($event, (v) => (item.quantity = v ?? 1))"
                @blur="onQtyBlur(item, $event)"
              />
            </div>
            <div class="col-price">
              <input
                :value="
                  item.price == null
                    ? ''
                    : item.price === 0
                      ? '0.00'
                      : item.price
                "
                type="text"
                inputmode="decimal"
                placeholder="0.00"
                class="price-input"
                @focus="
                  ($event) => ($event.target as HTMLInputElement)?.select()
                "
                @input="
                  onDecimalInput($event, (v) => setItemPrice(item, v), true)
                "
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
            :value="
              form.discount == null
                ? ''
                : form.discount === 0
                  ? '0.00'
                  : form.discount
            "
            type="text"
            inputmode="decimal"
            placeholder="0.00"
            class="discount-row-input"
            @focus="($event) => ($event.target as HTMLInputElement)?.select()"
            @input="onDecimalInput($event, (v) => (form.discount = v), true)"
            @blur="onDiscountBlur($event)"
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
            <div class="quick-fill-row quick-fill-row--right">
              <button
                v-for="opt in VALIDITY_OPTIONS"
                :key="opt"
                type="button"
                class="quick-fill-chip"
                @click="form.validity = opt"
              >
                {{ opt }}
              </button>
            </div>
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
            <div class="quick-fill-row quick-fill-row--right">
              <button
                v-for="opt in DELIVERY_TIME_OPTIONS"
                :key="opt"
                type="button"
                class="quick-fill-chip"
                @click="form.deliveryTime = opt"
              >
                {{ opt }}
              </button>
            </div>
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
            <div class="quick-fill-row quick-fill-row--right">
              <button
                v-for="opt in PAYMENT_METHOD_OPTIONS"
                :key="opt"
                type="button"
                class="quick-fill-chip"
                @click="form.paymentMethod = opt"
              >
                {{ opt }}
              </button>
            </div>
          </label>
        </div>
        <div class="form-row notes-row">
          <label class="field full">
            <span class="field-label">Notas</span>
            <textarea
              v-model="form.notes"
              rows="7"
              placeholder="Notas internas o aclaraciones para el cliente..."
            />
            <div class="quick-fill-row quick-fill-row--right">
              <button
                type="button"
                class="quick-fill-text-btn"
                @click="setDefaultNotes"
              >
                Usar texto por defecto
              </button>
            </div>
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
            <div class="quick-fill-row quick-fill-row--right">
              <button
                type="button"
                class="quick-fill-text-btn"
                @click="setDefaultDisclaimer"
              >
                Usar texto por defecto
              </button>
            </div>
          </label>
        </div>
      </div>
    </section>

    <div class="actions-row">
      <div class="actions-left">
        <div v-if="lastSavedAtLabel" class="save-status">
          Guardado el {{ lastSavedAtLabel }}
        </div>
      </div>
      <div class="actions-right">
        <button
          v-if="quoteId"
          class="secondary-action"
          type="button"
          :disabled="savingQuote"
          @click="onExportPdf"
        >
          Exportar PDF
        </button>
        <button
          class="primary-action"
          type="button"
          :disabled="savingQuote"
          @click="onSave"
        >
          {{ savingQuote ? "Guardando…" : "Guardar" }}
        </button>
      </div>
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
          <div class="pdf-client-row">
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
            <div v-if="quoteNumber || pdfQuoteDateLabel" class="pdf-quote-number-box">
              <div v-if="quoteNumber">Nro. {{ quoteNumber }}</div>
              <div v-if="pdfQuoteDateLabel" class="pdf-quote-date">{{ pdfQuoteDateLabel }}</div>
            </div>
          </div>

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
                    {{ formatCurrency(Number(item.price) || 0) }}
                  </td>
                  <td class="col-total">{{ formatCurrency(item.total) }}</td>
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

    <AppModal v-model="showBackConfirmModal" title="¿Salir sin guardar?">
      <p>
        Tienes cambios sin guardar. ¿Quieres salir de todos modos? Se perderán
        los datos no guardados.
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="onBackConfirmCancel"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="savingQuote"
          @click="onBackWithoutSaving"
        >
          No guardar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="savingQuote"
          @click="onSaveAndBack"
        >
          {{ savingQuote ? "Guardando…" : "Guardar" }}
        </button>
      </template>
    </AppModal>

    <AppModal v-model="showSaveConfirmModal" title="¿Actualizar cliente?">
      <p>
        Los datos del cliente han cambiado. ¿Desea actualizar también el
        registro del cliente antes de guardar la cotización?
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="savingQuote"
          @click="showSaveConfirmModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="savingQuote"
          @click="onSaveQuoteOnly"
        >
          {{ savingQuote ? "Guardando…" : "Solo guardar cotización" }}
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="savingQuote"
          @click="onSaveQuoteAndUpdateCustomer"
        >
          {{ savingQuote ? "Guardando…" : "Actualizar cliente y guardar" }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import {
  reactive,
  computed,
  ref,
  nextTick,
  watch,
  onMounted,
  onUnmounted,
} from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import html2pdf from "html2pdf.js";
import AppModal from "../components/AppModal.vue";
import { useApi } from "../composables/useApi";
import { useToastStore } from "../stores/toast";
import { useOrganizationStore } from "../stores/organization";
import { useQuoteDraftStore, type QuoteDraftItem } from "../stores/quoteDraft";
import { useUserStore } from "../stores/index";
import { NumerosALetras } from "numero-a-letras";
import {
  formatCurrency,
  parseDecimal,
  normalizeDecimalString,
} from "../utils/format";

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
    clients.value = (result?.data ?? []).map(
      (c: {
        id: string;
        name: string;
        document: string;
        phone: string;
        email: string;
        address: string;
      }) => ({
        id: c.id,
        name: c.name ?? "",
        document: c.document ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
        address: c.address ?? "",
      }),
    );
  } catch {
    clients.value = [];
  } finally {
    clientsLoading.value = false;
  }
}

const products = ref<Product[]>([]);
const productsLoading = ref(false);

async function fetchProducts() {
  productsLoading.value = true;
  try {
    const result = await api.get("/api/products");
    products.value = (result?.data ?? []).map(
      (p: {
        id: string;
        code: string;
        name: string;
        subtitle: string;
        price: number;
      }) => ({
        id: p.id,
        code: p.code ?? "",
        name: p.name ?? "",
        subtitle: p.subtitle ?? "",
        price: typeof p.price === "number" ? p.price : 0,
      }),
    );
  } catch {
    products.value = [];
  } finally {
    productsLoading.value = false;
  }
}

const route = useRoute();
const router = useRouter();
const quoteDraftStore = useQuoteDraftStore();
/** Referencia al handler de beforeunload (aviso al cerrar con cambios sin guardar en edición). */
let onBeforeUnloadRef: (e: BeforeUnloadEvent) => void = () => {};
/** True when user has changed form/items since load or last save; used for "Volver" confirm. */
const isDirty = ref(false);
/** Avoid marking dirty when we programmatically set form/items on load. */
const initialLoadDone = ref(false);
const userStore = useUserStore();

const isEditRoute = computed(() => !!route.params.id);

const statusDropdownOpen = ref(false);
const statusBadgeWrapRef = ref<HTMLElement | null>(null);
const QUOTE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
};

/** Texto por defecto para Notas (mensaje estándar de equipo/técnicos). */
const DEFAULT_NOTES =
  "Esta cotización incluye 2 técnicos, 1 supervisor, un generador, una cuña, una extrusora, 2 sopladores, soldadura de polietileno, hospedaje, alimentación y movilización de personal. \n\nIMPORTANTE: Contar con una cuadrilla de 4 personas para labores menores como templado de geomembrana y anclaje.  Por ser un área grande a cubrir se debe contar una excavadora para realizar el corte del material mediante un aditamento proporcionado por nosotros.  Ver vídeo adjunto.";

/** Texto por defecto para Aclaraciones. */
const DEFAULT_DISCLAIMER =
  "Cabe indicar que los precios son fijos, pero podrían variar si existieran aumentos por parte del gobierno en tasas arancelarias, ISD, IVA o algún impuesto adicional, o por la subida de los precios de fletes internacionales.";

const VALIDITY_OPTIONS = ["15 días", "30 días", "60 días"];
const DELIVERY_TIME_OPTIONS = [
  "5 días hábiles",
  "10 días hábiles",
  "15 días hábiles",
];

const PAYMENT_METHOD_OPTIONS = [
  "50% anticipado y 50% contra entrega",
  "70% anticipado, 30% contra entrega",
  "80% anticipado, 20% contra entrega",
  "100% anticipado",
];

function setDefaultNotes() {
  form.notes = DEFAULT_NOTES;
}
function setDefaultDisclaimer() {
  form.disclaimer = DEFAULT_DISCLAIMER;
}

const quoteStatusLabel = computed(
  () => QUOTE_STATUS_LABELS[form.status || "pending"] ?? "Pendiente",
);
function setQuoteStatus(value: "pending" | "accepted" | "rejected") {
  form.status = value;
  statusDropdownOpen.value = false;
}

const quoteUpdatedAtLabel = computed(() => {
  const d = quoteUpdatedAt.value;
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(",", "")
    .trim();
});

/** Fecha formateada para el PDF (solo día/mes/año, sin hora). */
const pdfQuoteDateLabel = computed(() => {
  const d = quoteUpdatedAt.value;
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
});

function resetFormAndDraft() {
  form.searchClient = "";
  form.name = "";
  form.document = "";
  form.phone = "";
  form.email = "";
  form.address = "";
  form.directedTo = "";
  form.reference = "";
  form.project = "";
  form.searchProduct = "";
  form.discount = 0;
  form.status = "pending";
  form.validity = "";
  form.deliveryPlace = "";
  form.deliveryTime = "";
  form.paymentMethod = "";
  form.disclaimer = "";
  form.notes = "";
  selectedCustomerId.value = null;
  originalClient.value = null;
  customerNotFound.value = false;
  items.splice(0, items.length);
  // Si estamos editando, no borrar quoteId ni quoteUpdatedAt para que siga visible "Última modificación".
  if (!route.params.id) {
    quoteId.value = null;
    lastSavedAtLabel.value = "";
    quoteUpdatedAt.value = null;
    quoteDraftStore.clearDraft();
  }
}

watch(
  () => userStore.user?.uid ?? null,
  (newUid, oldUid) => {
    if (oldUid !== undefined && newUid !== oldUid) {
      resetFormAndDraft();
    }
  },
);

/** Al volver a "Nueva cotización" desde listado o edición, limpiar el formulario (evitar condición de carrera con nextTick). */
watch(
  () => [route.path, route.params.id] as const,
  ([newPath, newId], [oldPath, oldId]) => {
    const isNewQuotePath = newPath === "/cotizaciones/nueva" && !newId;
    const cameFromElsewhere =
      oldPath != null &&
      (oldPath !== newPath || (oldId != null && oldId !== newId));
    if (isNewQuotePath && (cameFromElsewhere || quoteId.value != null)) {
      nextTick(() => {
        resetFormAndDraft();
      });
    }
  },
);

onMounted(async () => {
  fetchCustomers();
  fetchProducts();
  const idFromRoute = route.params.id ?? route.query.quoteId;
  const quoteIdParam =
    typeof idFromRoute === "string"
      ? idFromRoute
      : Array.isArray(idFromRoute)
        ? idFromRoute[0]
        : "";
  if (quoteIdParam && quoteIdParam.trim()) {
    await loadQuoteById(quoteIdParam.trim());
    if (route.query.pdf === "1") {
      await nextTick();
      onExportPdf();
    }
  }
  nextTick(() => {
    initialLoadDone.value = true;
  });
  window.addEventListener("beforeunload", onBeforeUnloadRef);
});

function onStatusDropdownClickOutside(event: MouseEvent) {
  if (
    statusDropdownOpen.value &&
    statusBadgeWrapRef.value &&
    !statusBadgeWrapRef.value.contains(event.target as Node)
  ) {
    statusDropdownOpen.value = false;
  }
}
watch(statusDropdownOpen, (open) => {
  if (open) {
    setTimeout(() => {
      document.addEventListener("click", onStatusDropdownClickOutside);
    }, 0);
  } else {
    document.removeEventListener("click", onStatusDropdownClickOutside);
  }
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
  discount: 0 as number | null,
  status: "pending" as "pending" | "accepted" | "rejected",
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

/** Id del cliente seleccionado de la lista (si eligió uno existente). Se envía como customerId al guardar. */
const selectedCustomerId = ref<string | null>(null);
/** En edición: la cotización tenía customerId pero el cliente ya no existe (ej. fue eliminado). */
const customerNotFound = ref(false);
/** Snapshot de los campos del cliente al seleccionar; para detectar cambios y habilitar "Actualizar cliente". */
const originalClient = ref<{
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
} | null>(null);

const selectClient = (client: Client) => {
  form.name = client.name;
  form.document = client.document;
  form.phone = client.phone;
  form.email = client.email;
  form.address = client.address;
  form.directedTo = "";
  form.reference = "";
  form.searchClient = "";
  selectedCustomerId.value = client.id;
  originalClient.value = {
    name: client.name ?? "",
    document: client.document ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    address: client.address ?? "",
  };
  showClientSuggestions.value = false;
  clientSearchInputRef.value?.blur();
};

/** Hay cliente seleccionado y algún campo de cliente cambió respecto al original. */
const hasClientChanges = computed(() => {
  if (!selectedCustomerId.value || !originalClient.value) return false;
  const o = originalClient.value;
  const n = (v: string) => (v ?? "").trim();
  return (
    n(form.name) !== n(o.name) ||
    n(form.document) !== n(o.document) ||
    n(form.phone) !== n(o.phone) ||
    n(form.email) !== n(o.email) ||
    n(form.address) !== n(o.address)
  );
});

const updatingCustomer = ref(false);
const onUpdateCustomer = async () => {
  if (!selectedCustomerId.value) return;
  updatingCustomer.value = true;
  try {
    await api.put(`/api/customers/${selectedCustomerId.value}`, {
      name: (form.name ?? "").trim(),
      document: (form.document ?? "").trim(),
      phone: (form.phone ?? "").trim(),
      email: (form.email ?? "").trim(),
      address: (form.address ?? "").trim(),
    });
    const name = (form.name ?? "").trim();
    const document = (form.document ?? "").trim();
    const phone = (form.phone ?? "").trim();
    const email = (form.email ?? "").trim();
    const address = (form.address ?? "").trim();
    originalClient.value = { name, document, phone, email, address };
    toastStore.show("Cliente actualizado correctamente.", "success");
  } catch (err: any) {
    toastStore.show(err?.message ?? "Error al actualizar el cliente.", "error");
  } finally {
    updatingCustomer.value = false;
  }
};

const creatingCustomer = ref(false);
async function onCreateCustomerFromQuote() {
  const name = (form.name ?? "").trim();
  if (!name) {
    toastStore.show("Ingresa al menos el nombre del cliente.", "error");
    return;
  }
  creatingCustomer.value = true;
  try {
    const res = await api.post("/api/customers", {
      name,
      document: (form.document ?? "").trim(),
      phone: (form.phone ?? "").trim(),
      email: (form.email ?? "").trim(),
      address: (form.address ?? "").trim(),
    });
    const payload = res?.data as
      | {
          data?: {
            id?: string;
            name?: string;
            document?: string;
            phone?: string;
            email?: string;
            address?: string;
          };
        }
      | undefined;
    const created =
      payload?.data ??
      (res?.data as
        | {
            id?: string;
            name?: string;
            document?: string;
            phone?: string;
            email?: string;
            address?: string;
          }
        | undefined);
    if (created?.id) {
      selectedCustomerId.value = created.id;
      originalClient.value = {
        name: created.name ?? name,
        document: created.document ?? "",
        phone: created.phone ?? "",
        email: created.email ?? "",
        address: created.address ?? "",
      };
      customerNotFound.value = false;
      toastStore.show(
        "Cliente creado. Al guardar la cotización quedará vinculada a este cliente.",
        "success",
      );
    }
  } catch (err: any) {
    toastStore.show(err?.message ?? "Error al crear el cliente.", "error");
  } finally {
    creatingCustomer.value = false;
  }
}

// function fillMockQuote() {
//   resetFormAndDraft();
//   form.name = "Cliente de prueba S.A.";
//   form.document = "1234567890001";
//   form.phone = "0991234567";
//   form.email = "contacto@cliente-prueba.com";
//   form.address = "Av. Ejemplo 123, Quito";
//   form.directedTo = "Ing. Juan Pérez";
//   form.reference = "COT-PRUEBA-001";
//   form.project = "Proyecto piloto";
//   form.discount = 50;
//   form.validity = "15 días";
//   form.deliveryPlace = "on_site";
//   form.deliveryTime = "5 días hábiles";
//   form.paymentMethod = "50% anticipo, 50% a 30 días";

//   const mockItems = [
//     {
//       id: "mock-1",
//       code: "PROD-001",
//       name: "Producto de prueba A",
//       subtitle: "Descripción ejemplo",
//       price: 250.5,
//       quantity: 2,
//     },
//     {
//       id: "mock-2",
//       code: "PROD-002",
//       name: "Producto de prueba B",
//       subtitle: "Otro ítem de prueba",
//       price: 180,
//       quantity: 1.5,
//     },
//     {
//       id: "mock-3",
//       code: "PROD-003",
//       name: "Servicio de prueba",
//       subtitle: "Incluye instalación",
//       price: 500,
//       quantity: 1,
//     },
//   ];

//   items.splice(0, items.length);
//   mockItems.forEach((raw) => {
//     items.push({
//       id: raw.id,
//       code: raw.code,
//       name: raw.name,
//       subtitle: raw.subtitle,
//       price: raw.price,
//       quantity: raw.quantity,
//       get priceFormatted() {
//         return formatCurrency(Number(this.price) || 0);
//       },
//       get total() {
//         const p = Number(this.price);
//         const q = Number(this.quantity);
//         return (Number.isNaN(p) ? 0 : p) * (Number.isNaN(q) || q <= 0 ? 1 : q);
//       },
//       get totalFormatted() {
//         return formatCurrency(this.total);
//       },
//     });
//   });
//   isDirty.value = true;
// }

function onClear() {
  resetFormAndDraft();
}

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

onBeforeUnloadRef = (e: BeforeUnloadEvent) => {
  if (route.params.id && isDirty.value) {
    e.preventDefault();
    (e as unknown as { returnValue: string }).returnValue = "";
  }
};
onUnmounted(() => {
  window.removeEventListener("beforeunload", onBeforeUnloadRef);
  document.removeEventListener("click", onStatusDropdownClickOutside);
  // Al salir de "Nueva cotización" sin guardar, descartar el borrador para que al volver esté vacío.
  if (!route.params.id) quoteDraftStore.clearDraft();
});

watch(
  () => ({
    ...form,
    sid: selectedCustomerId.value,
    o: originalClient.value,
    len: items.length,
    itemsSnap: items.map((i) => ({ id: i.id, q: i.quantity, p: i.price })),
  }),
  () => {
    if (initialLoadDone.value) isDirty.value = true;
  },
  { deep: true, flush: "post" },
);

const filteredProducts = computed(() => {
  const q = form.searchProduct.trim().toLowerCase();
  if (!q) return [] as Product[];
  return products.value
    .filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)),
    )
    .slice(0, 10);
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
      price: product.price ?? 0,
      quantity: 1,
      get priceFormatted() {
        return formatCurrency(Number(this.price) || 0);
      },
      get total() {
        const p = Number(this.price);
        const q = Number(this.quantity);
        return (Number.isNaN(p) ? 0 : p) * (Number.isNaN(q) || q <= 0 ? 1 : q);
      },
      get totalFormatted() {
        return formatCurrency(this.total);
      },
    });
  }

  form.searchProduct = "";
  // Do not set showSuggestions = false here: input keeps focus, so the list
  // will hide because filteredProducts becomes []; when user types again, list reappears.
};

function pushItemFromDraft(raw: QuoteDraftItem) {
  items.push({
    id: raw.id,
    code: raw.code,
    name: raw.name,
    subtitle: raw.subtitle ?? "",
    price: raw.price ?? 0,
    quantity: raw.quantity ?? 1,
    get priceFormatted() {
      return formatCurrency(Number(this.price) || 0);
    },
    get total() {
      const p = Number(this.price);
      const q = Number(this.quantity);
      return (Number.isNaN(p) ? 0 : p) * (Number.isNaN(q) || q <= 0 ? 1 : q);
    },
    get totalFormatted() {
      return formatCurrency(this.total);
    },
  });
}

function parseQuoteUpdatedAt(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === "object" && raw !== null) {
    const sec =
      (raw as { seconds?: number; _seconds?: number }).seconds ??
      (raw as { seconds?: number; _seconds?: number })._seconds;
    if (typeof sec === "number") return new Date(sec * 1000);
  }
  return null;
}

async function loadQuoteById(id: string) {
  try {
    const res = await api.get(`/api/quotes/${id}`);
    const q = res?.data as {
      id?: string;
      quoteNumber?: string;
      updatedAt?: unknown;
      customerId?: string;
      client?: {
        name?: string;
        document?: string;
        phone?: string;
        email?: string;
        address?: string;
        directedTo?: string;
        reference?: string;
        project?: string;
      };
      items?: {
        id: string;
        code: string;
        name: string;
        subtitle?: string;
        quantity: number;
        price: number;
      }[];
      discount?: number;
      status?: string;
      validity?: string;
      deliveryPlace?: string;
      deliveryTime?: string;
      paymentMethod?: string;
      disclaimer?: string;
      notes?: string;
    };
    if (!q?.client || !Array.isArray(q.items)) return;
    quoteId.value = q.id ?? id;
    quoteNumber.value = q.quoteNumber ?? null;
    quoteUpdatedAt.value = parseQuoteUpdatedAt(q.updatedAt);
    const cid = q.customerId ?? null;
    const c = q.client;
    const quoteSnapshot = c
      ? {
          name: c.name ?? "",
          document: c.document ?? "",
          phone: c.phone ?? "",
          email: c.email ?? "",
          address: c.address ?? "",
        }
      : null;
    if (cid) {
      try {
        const custRes = await api.get(`/api/customers/${cid}`);
        const cust = custRes?.data as
          | {
              name?: string;
              document?: string;
              phone?: string;
              email?: string;
              address?: string;
            }
          | undefined;
        customerNotFound.value = false;
        selectedCustomerId.value = cid;
        originalClient.value = cust
          ? {
              name: cust.name ?? "",
              document: cust.document ?? "",
              phone: cust.phone ?? "",
              email: cust.email ?? "",
              address: cust.address ?? "",
            }
          : quoteSnapshot;
      } catch {
        selectedCustomerId.value = null;
        originalClient.value = quoteSnapshot;
        customerNotFound.value = true;
      }
    } else {
      customerNotFound.value = false;
      selectedCustomerId.value = null;
      originalClient.value = quoteSnapshot;
    }
    form.name = q.client.name ?? "";
    form.document = q.client.document ?? "";
    form.phone = q.client.phone ?? "";
    form.email = q.client.email ?? "";
    form.address = q.client.address ?? "";
    form.directedTo = q.client.directedTo ?? "";
    form.reference = q.client.reference ?? "";
    form.project = q.client.project ?? "";
    form.discount = Number(q.discount) ?? 0;
    form.status = (
      q.status === "accepted" || q.status === "rejected" ? q.status : "pending"
    ) as "pending" | "accepted" | "rejected";
    form.validity = q.validity ?? "";
    form.deliveryPlace = (
      q.deliveryPlace === "on_site" || q.deliveryPlace === "warehouse"
        ? q.deliveryPlace
        : ""
    ) as "" | "on_site" | "warehouse";
    form.deliveryTime = q.deliveryTime ?? "";
    form.paymentMethod = q.paymentMethod ?? "";
    form.disclaimer = q.disclaimer ?? "";
    form.notes = q.notes ?? "";
    items.splice(0, items.length);
    q.items.forEach((it) =>
      pushItemFromDraft({
        id: it.id,
        code: it.code,
        name: it.name,
        subtitle: it.subtitle ?? "",
        quantity: it.quantity,
        price: it.price,
      }),
    );
    isDirty.value = false;
  } catch (e) {
    console.error("Error loading quote:", e);
    toastStore.show("No se pudo cargar la cotización.", "error");
  }
}

const subtotal = computed(() =>
  items.reduce((sum, item) => sum + item.total, 0),
);

const discountAmount = computed(() => {
  const d = Number(form.discount ?? 0);
  const s = subtotal.value;
  if (Number.isNaN(d) || d < 0) return 0;
  return Math.min(d, s);
});

const subtotalAfterDiscount = computed(
  () => subtotal.value - discountAmount.value,
);

/** Round to 2 decimals so displayed IVA and total are consistent (no 1¢ error from banker's rounding). */
const round2 = (n: number) => Math.round(n * 100) / 100;

const iva = computed(() => round2(subtotalAfterDiscount.value * 0.15));

const total = computed(() => subtotalAfterDiscount.value + iva.value);

const subtotalFormatted = computed(() => formatCurrency(subtotal.value));
const discountFormatted = computed(() => formatCurrency(discountAmount.value));
const ivaFormatted = computed(() => formatCurrency(iva.value));
const totalFormatted = computed(() => formatCurrency(total.value));

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

/** En cantidad, precio y descuento: convierte coma a punto al escribir y mantiene el modelo sincronizado. */
function onDecimalInput(
  event: Event,
  setModel: (value: number | null) => void,
  allowEmpty = false,
) {
  const el = event.target as HTMLInputElement | null;
  if (!el) return;
  const normalized = normalizeDecimalString(el.value);
  if (normalized !== el.value) el.value = normalized;
  if (normalized === "" && allowEmpty) {
    setModel(null);
    return;
  }
  const num = Number(normalized);
  setModel(Number.isFinite(num) ? num : 0);
}

const onDiscountBlur = (event: FocusEvent) => {
  const el = event.target as HTMLInputElement | null;
  const raw = el?.value?.trim() ?? "";
  if (raw === "") {
    form.discount = 0;
    if (el) el.value = "0.00";
    return;
  }
  // Usar form.discount (ya actualizado en cada @input) para evitar leer un DOM desactualizado
  // cuando el blur se dispara antes de que Vue repinte el input.
  const current = form.discount ?? 0;
  if (current < 0) {
    form.discount = 0;
    if (el) el.value = "0.00";
    return;
  }
  const capped = Math.min(current, subtotal.value);
  form.discount = Math.round(capped * 100) / 100;
};

/** Format quantity: up to 6 integer digits and 2 decimals for PDF/list */
const formatQty = (n: number) => {
  const val = Number(n);
  if (Number.isNaN(val) || val < 0) return "0.00";
  const clamped = Math.min(999999.99, Math.max(0, val));
  return clamped.toFixed(2);
};

/** Asigna precio (permite null mientras el campo está vacío durante la edición). */
function setItemPrice(item: { price: number }, v: number | null) {
  (item as { price: number | null }).price = v;
}

const onPriceBlur = (item: { price: number }, event: FocusEvent) => {
  const el = event.target as HTMLInputElement | null;
  const raw = el?.value?.trim() ?? "";
  const newPrice = raw === "" ? 0 : Math.max(0, parseDecimal(raw));
  item.price = newPrice;
  if (el && newPrice === 0) el.value = "0.00";
};

const onQtyBlur = (item: { quantity: number }, event: FocusEvent) => {
  const raw = (event.target as HTMLInputElement | null)?.value?.trim() ?? "";
  if (!raw) {
    nextTick(() => {
      item.quantity = 1;
    });
    return;
  }
  const parsed = parseDecimal(raw);
  if (parsed <= 0) {
    nextTick(() => {
      item.quantity = 1;
    });
    return;
  }
  const clamped = Math.min(999999.99, Math.max(0.01, parsed));
  nextTick(() => {
    item.quantity = clamped;
  });
};

const showSaveConfirmModal = ref(false);
const showBackConfirmModal = ref(false);
const savingQuote = ref(false);
const lastSavedAtLabel = ref<string>("");
/** Ruta a la que ir si el usuario confirma "No guardar" (desde guard de navegación o desde Volver). */
const pendingLeaveTo = ref<string | null>(null);
/** Evita que el guard vuelva a abrir el modal cuando ya hicimos router.push tras "No guardar". */
const leaveConfirmed = ref(false);

onBeforeRouteLeave((to, _from, next) => {
  if (leaveConfirmed.value) {
    next();
    return;
  }
  if (!isDirty.value) {
    next();
    return;
  }
  pendingLeaveTo.value = to.fullPath;
  showBackConfirmModal.value = true;
  next(false);
});

function goBack() {
  router.push("/cotizaciones");
}

function onBackClick() {
  if (isDirty.value) {
    pendingLeaveTo.value = "/cotizaciones";
    showBackConfirmModal.value = true;
  } else {
    goBack();
  }
}

function onBackConfirmCancel() {
  showBackConfirmModal.value = false;
  pendingLeaveTo.value = null;
  leaveConfirmed.value = false;
}

function onBackWithoutSaving() {
  showBackConfirmModal.value = false;
  const target = pendingLeaveTo.value;
  pendingLeaveTo.value = null;
  quoteDraftStore.clearDraft();
  leaveConfirmed.value = true;
  if (target) {
    router.push(target);
  } else {
    goBack();
  }
}

async function onSaveAndBack() {
  const name = (form.name ?? "").trim();
  if (!name) {
    toastStore.show("Ingresa al menos el nombre del cliente.", "error");
    return;
  }
  if (items.length === 0) {
    toastStore.show("Agrega al menos un producto a la cotización.", "error");
    return;
  }
  try {
    savingQuote.value = true;
    await doSaveQuote();
    lastSavedAtLabel.value = formatSavedAt(new Date());
    isDirty.value = false;
    showBackConfirmModal.value = false;
    toastStore.show("Cotización guardada", "success");
    const target = pendingLeaveTo.value;
    pendingLeaveTo.value = null;
    leaveConfirmed.value = true;
    if (target) router.push(target);
    else goBack();
  } catch (err: any) {
    toastStore.show(err?.message ?? "Error al guardar la cotización.", "error");
  } finally {
    savingQuote.value = false;
  }
}
const quoteId = ref<string | null>(null);
/** Set when loading a quote for edit; used to show "Última modificación" in the card header. */
const quoteUpdatedAt = ref<Date | null>(null);
/** Número de cotización (ej. 2026000079); solo en modo edición. */
const quoteNumber = ref<string | null>(null);

function formatSavedAt(date: Date): string {
  const raw = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return raw.replace(",", "").replace(/\s+/g, " ").trim();
}

async function doSaveQuote() {
  const name = (form.name || "").trim();
  const payload = {
    ...(selectedCustomerId.value
      ? { customerId: selectedCustomerId.value }
      : {}),
    client: {
      name,
      document: form.document?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      address: form.address?.trim() || undefined,
      directedTo: form.directedTo?.trim() || undefined,
      reference: form.reference?.trim() || undefined,
      project: form.project?.trim() || undefined,
    },
    items: items.map((i) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      subtitle: i.subtitle ?? "",
      quantity: parseDecimal(i.quantity),
      price: parseDecimal(Number(i.price ?? 0)),
    })),
    discount: parseDecimal(form.discount ?? 0),
    status: form.status || "pending",
    validity: (form.validity ?? "").trim(),
    deliveryPlace: form.deliveryPlace || "",
    deliveryTime: (form.deliveryTime ?? "").trim(),
    paymentMethod: (form.paymentMethod ?? "").trim(),
    disclaimer: (form.disclaimer ?? "").trim(),
    notes: (form.notes ?? "").trim(),
  };
  const result = quoteId.value
    ? await api.put(`/api/quotes/${quoteId.value}`, payload)
    : await api.post("/api/quotes", payload);

  const savedId = result?.data?.id;
  if (typeof savedId === "string" && savedId) {
    quoteId.value = savedId;
    const updated = parseQuoteUpdatedAt(result?.data?.updatedAt);
    if (updated) quoteUpdatedAt.value = updated;
    return savedId;
  }
  return null;
}

const onSave = async () => {
  const name = (form.name || "").trim();
  if (!name) {
    toastStore.show("Ingresa al menos el nombre del cliente.", "error");
    return;
  }
  if (items.length === 0) {
    toastStore.show("Agrega al menos un producto a la cotización.", "error");
    return;
  }
  if (hasClientChanges.value) {
    showSaveConfirmModal.value = true;
    return;
  }
  try {
    savingQuote.value = true;
    const wasNewQuote = !route.params.id;
    const savedId = await doSaveQuote();
    lastSavedAtLabel.value = formatSavedAt(new Date());
    isDirty.value = false;
    if (wasNewQuote && savedId) {
      quoteDraftStore.clearDraft();
      router.replace({ name: "EditQuote", params: { id: savedId } });
      toastStore.show(
        "Cotización creada. Ya puedes editarla o volver al listado.",
        "success",
      );
    } else {
      toastStore.show("Cotización guardada", "success");
    }
  } catch (err: any) {
    toastStore.show(err?.message ?? "Error al guardar la cotización.", "error");
  } finally {
    savingQuote.value = false;
  }
};

async function onSaveQuoteOnly() {
  showSaveConfirmModal.value = false;
  try {
    savingQuote.value = true;
    const wasNewQuote = !route.params.id;
    const savedId = await doSaveQuote();
    lastSavedAtLabel.value = formatSavedAt(new Date());
    isDirty.value = false;
    if (wasNewQuote && savedId) {
      quoteDraftStore.clearDraft();
      router.replace({ name: "EditQuote", params: { id: savedId } });
      toastStore.show(
        "Cotización creada. Ya puedes editarla o volver al listado.",
        "success",
      );
    } else {
      toastStore.show("Cotización guardada", "success");
    }
  } catch (err: any) {
    toastStore.show(err?.message ?? "Error al guardar la cotización.", "error");
  } finally {
    savingQuote.value = false;
  }
}

async function onSaveQuoteAndUpdateCustomer() {
  if (!selectedCustomerId.value) return;
  savingQuote.value = true;
  showSaveConfirmModal.value = false;
  try {
    await api.put(`/api/customers/${selectedCustomerId.value}`, {
      name: (form.name ?? "").trim(),
      document: (form.document ?? "").trim(),
      phone: (form.phone ?? "").trim(),
      email: (form.email ?? "").trim(),
      address: (form.address ?? "").trim(),
    });
    const name = (form.name ?? "").trim();
    const document = (form.document ?? "").trim();
    const phone = (form.phone ?? "").trim();
    const email = (form.email ?? "").trim();
    const address = (form.address ?? "").trim();
    originalClient.value = { name, document, phone, email, address };
    const wasNewQuote = !route.params.id;
    const savedId = await doSaveQuote();
    lastSavedAtLabel.value = formatSavedAt(new Date());
    isDirty.value = false;
    if (wasNewQuote && savedId) {
      quoteDraftStore.clearDraft();
      router.replace({ name: "EditQuote", params: { id: savedId } });
      toastStore.show(
        "Cotización creada. Ya puedes editarla o volver al listado.",
        "success",
      );
    } else {
      toastStore.show("Cotización guardada", "success");
    }
  } catch (err: any) {
    toastStore.show(err?.message ?? "Error al guardar.", "error");
  } finally {
    savingQuote.value = false;
  }
}

const onExportPdf = async () => {
  if (!quoteId.value) return;
  if (!pdfRef.value) return;

  const element = pdfRef.value;
  const filename = quoteNumber.value
    ? `cotizacion-${quoteNumber.value}.pdf`
    : "cotizacion-geomtech.pdf";

  const opt = {
    margin: 0,
    filename,
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

.quote-form-back {
  margin: -0.25rem 0 0 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border: none;
  border-radius: 8px;
  background: none;
  font-size: 0.9rem;
  color: #64748b;
  text-decoration: none;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
  outline: none;
}

.back-link:hover {
  color: #0f9f70;
}

.back-link:focus-visible {
  color: #0f9f70;
  background-color: rgba(15, 159, 112, 0.08);
  box-shadow: 0 0 0 2px #0f9f70;
}

.back-link:active {
  color: #0c7a57;
  background-color: rgba(15, 159, 112, 0.12);
}

.back-icon {
  font-size: 1.1rem;
  line-height: 1;
  pointer-events: none;
}

.quote-form-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.quote-form-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quote-form-header h1 {
  margin: 0;
  font-size: 1.6rem;
  color: #053f51;
}

.quote-form-header p {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
}

.quote-form-meta {
  margin: 0.4rem 0 0 0;
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
}

/* Badge de estado con dropdown (en card header Cliente, solo edición) */
.card-header .status-badge-wrap {
  position: relative;
  align-self: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    box-shadow 0.15s ease,
    transform 0.1s ease;
}

.status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.status-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge--pending {
  background: rgba(234, 179, 8, 0.15);
  color: #b45309;
  border-color: rgba(234, 179, 8, 0.35);
}
.status-badge--pending .status-badge-dot {
  background: #b45309;
}

.status-badge--accepted {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.35);
}
.status-badge--accepted .status-badge-dot {
  background: #15803d;
}

.status-badge--rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.3);
}
.status-badge--rejected .status-badge-dot {
  background: #b91c1c;
}

.status-badge-chevron {
  font-size: 0.55rem;
  opacity: 0.8;
}

.status-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: auto;
  min-width: 140px;
  padding: 0.35rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
  border: 1px solid #e2e8f0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.status-dropdown-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.status-dropdown-option:hover {
  background: #f1f5f9;
}

.status-dropdown-option--pending .status-option-dot {
  background: #b45309;
}
.status-dropdown-option--accepted .status-option-dot {
  background: #15803d;
}
.status-dropdown-option--rejected .status-option-dot {
  background: #b91c1c;
}

.status-option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.quote-form-header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.quote-form-header-actions-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quote-form-header-actions .ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.quote-form-header-actions .icon-trash {
  flex-shrink: 0;
}

.ghost-button {
  padding: 0.6rem 1rem;
  border-radius: 8px;
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

/* Ghost danger: mismo estilo ghost pero con rojo suave */
.ghost-button--danger {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.ghost-button--danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
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
  padding: 1rem 1.5rem 0 1.5rem;
  /* border-bottom: 1px solid #e2e8f0; */
}

.card-header--with-meta {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card-header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.card-header-row .card-title {
  margin-left: -0.5rem;
}

.card-header-row .status-badge-wrap {
  margin-right: -0.5rem;
}

.card-header-quote-number {
  margin: 0;
  margin-left: -0.5rem;
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  background: #e5edff;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
}

.card-header-meta {
  margin: 0;
  margin-right: -0.5rem;
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.card-meta {
  font-size: 0.85rem;
  color: #64748b;
  white-space: nowrap;
  font-style: italic;
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

.form-row--actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.form-row--update-client {
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.update-client-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  max-width: 100%;
  text-align: right;
}

.btn-update-client {
  padding: 0.6rem 1.25rem;
  border-radius: 999px;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.1s ease-out;
}

.btn-update-client:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-update-client:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-create-client {
  padding: 0.6rem 1.25rem;
  border-radius: 999px;
  border: 1px solid #0f9f70;
  background: transparent;
  color: #0f9f70;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.btn-create-client:hover:not(:disabled) {
  background: #0f9f70;
  color: #fff;
}

.btn-create-client:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.field-label-row .field-label {
  margin-bottom: 0;
}

.quick-fill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.quick-fill-row--right {
  justify-content: flex-end;
  margin-top: 0.35rem;
  margin-bottom: 0;
}

.quick-fill-chip {
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #0f9f70;
  background: rgba(15, 159, 112, 0.08);
  border: 1px solid rgba(15, 159, 112, 0.3);
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.quick-fill-chip:hover {
  background: rgba(15, 159, 112, 0.14);
  border-color: rgba(15, 159, 112, 0.5);
}

.quick-fill-text-btn {
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.quick-fill-text-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
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
  flex-shrink: 0;
  width: 8.5rem;
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: #053f51;
  color: #fff;
  font-weight: 600;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  padding: 0.12rem 0.35rem;
  border-radius: 6px;
  background: #0f9f70;
  color: #fff;
  font-size: 0.65rem;
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.actions-left {
  flex: 1;
  min-width: 240px;
}

.actions-right {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.save-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.12);
  color: #1e3a8a;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
}

.primary-action {
  padding: 0.7rem 1.25rem;
  border-radius: 8px;
  border: none;
  background: #0f9f70;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 650;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  box-shadow: 0 10px 22px rgba(15, 159, 112, 0.32);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease-out;
}

.primary-action:hover:not(:disabled) {
  background: #0c7a57;
  box-shadow: 0 12px 26px rgba(15, 159, 112, 0.42);
  transform: translateY(-1px);
}

.primary-action:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(15, 159, 112, 0.25),
    0 10px 22px rgba(15, 159, 112, 0.32);
}

.primary-action:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.secondary-action {
  padding: 0.7rem 1.25rem;
  border-radius: 8px;
  border: 1px solid rgba(15, 159, 112, 0.35);
  background: #ffffff;
  color: #0c7a57;
  font-size: 0.95rem;
  font-weight: 650;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.15s ease-out,
    box-shadow 0.2s ease;
}

.secondary-action:hover:not(:disabled) {
  background: rgba(15, 159, 112, 0.08);
  border-color: rgba(15, 159, 112, 0.55);
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
}

.secondary-action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(15, 159, 112, 0.18);
}

.secondary-action:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
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

.pdf-client-row {
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  margin-bottom: 8mm;
}

.pdf-client {
  flex: 1;
  margin-bottom: 0;
}

.pdf-quote-number-box {
  align-self: flex-start;
  text-align: right;
  font-size: 11px;
  font-weight: 600;
}

.pdf-quote-date {
  margin-top: 2mm;
  font-weight: 400;
  font-size: 10px;
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
  white-space: pre-line;
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
