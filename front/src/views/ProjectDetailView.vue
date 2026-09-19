<template>
  <div class="page">
    <nav class="page-back">
      <button
        type="button"
        class="back-link"
        @click="router.push('/proyectos')"
      >
        <span aria-hidden="true">←</span>
        Volver a proyectos
      </button>
    </nav>

    <div v-if="loading" class="state-box">
      <p>Cargando proyecto…</p>
    </div>
    <div v-else-if="error" class="state-box">
      <p>{{ error }}</p>
      <button type="button" class="btn-secondary" @click="loadProject">
        Reintentar
      </button>
    </div>

    <template v-else-if="project">
      <header class="detail-header">
        <div class="detail-header-left">
          <div v-if="editingName && !userStore.isFieldRole" class="name-edit-row">
            <input
              ref="nameInputRef"
              v-model="nameDraft"
              type="text"
              class="name-input"
              @keydown.enter="saveName"
              @keydown.escape="cancelEditName"
            />
            <button
              type="button"
              class="btn-secondary btn-sm"
              :disabled="savingName"
              @click="saveName"
            >
              {{ savingName ? "…" : "Guardar" }}
            </button>
            <button
              type="button"
              class="btn-ghost btn-sm"
              :disabled="savingName"
              @click="cancelEditName"
            >
              Cancelar
            </button>
          </div>
          <div v-else class="name-display-row">
            <h1 class="page-title">{{ project.name }}</h1>
            <button
              v-if="!userStore.isFieldRole"
              type="button"
              class="icon-button"
              aria-label="Editar nombre"
              title="Editar nombre"
              @click="startEditName"
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
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </button>
          </div>
          <button
            v-if="!userStore.isFieldRole"
            type="button"
            class="quote-link"
            @click="router.push(`/cotizaciones/editar/${project.quotationId}`)"
          >
            Ver cotización original →
          </button>
        </div>

        <div class="status-badge-wrap" ref="statusBadgeWrapRef">
          <!-- Field roles: read-only status badge -->
          <span
            v-if="userStore.isFieldRole"
            class="status-badge status-badge--readonly"
            :class="`status-badge--${project.status}`"
          >
            <span class="status-badge-dot" aria-hidden="true"></span>
            {{ statusLabel(project.status) }}
          </span>
          <template v-else>
            <button
              type="button"
              class="status-badge"
              :class="`status-badge--${project.status}`"
              aria-haspopup="listbox"
              :aria-expanded="statusDropdownOpen"
              @click="statusDropdownOpen = !statusDropdownOpen"
            >
              <span class="status-badge-dot" aria-hidden="true"></span>
              {{ statusLabel(project.status) }}
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
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  type="button"
                  role="option"
                  :aria-selected="project.status === opt.value"
                  class="status-dropdown-option"
                  :class="`status-dropdown-option--${opt.value}`"
                  @click="setStatus(opt.value)"
                >
                  <span class="status-option-dot"></span>
                  {{ opt.label }}
                </button>
              </div>
            </transition>
          </template>
        </div>
      </header>

      <section
        v-if="orphanedInventoryCodes.length"
        class="orphan-banner"
        role="status"
      >
        <div class="orphan-banner-copy">
          <p class="orphan-banner-title">
            Material retirado que ya no está en la cotización
          </p>
          <p class="orphan-banner-text">
            Hay retiros de inventario para códigos que no figuran en la
            cotización actual del proyecto. Revisa y revierte si corresponde.
          </p>
        </div>
        <ul class="orphan-code-list">
          <li
            v-for="code in orphanedInventoryCodes"
            :key="code"
            class="orphan-code-row"
          >
            <span class="orphan-code-badge">{{ code }}</span>
            <button
              v-if="userStore.isAdmin"
              type="button"
              class="btn-secondary btn-sm"
              :disabled="reverseLoadingCode === code"
              @click="openReverseForCode(code)"
            >
              {{
                reverseLoadingCode === code
                  ? "Cargando…"
                  : "Revertir retiro(s)"
              }}
            </button>
          </li>
        </ul>
      </section>

      <div class="detail-tabs" role="tablist" aria-label="Secciones del proyecto">
        <button
          v-for="tab in detailTabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="detail-tab"
          :class="{ 'detail-tab--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab: Resumen -->
      <template v-if="activeTab === 'resumen'">
        <section class="card">
          <header class="card-header">
            <h2 class="card-title">Resumen de cotización</h2>
          </header>
          <div class="card-body summary-grid">
            <div class="summary-item">
              <span class="summary-label">Nro. cotización</span>
              <span class="summary-value">
                {{ project.quotationSnapshot?.quoteNumber || "—" }}
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Cliente</span>
              <span class="summary-value">
                {{ project.quotationSnapshot?.client?.name || "—" }}
              </span>
            </div>
            <template v-if="!userStore.isFieldRole">
              <div class="summary-item">
                <span class="summary-label">Monto</span>
                <span class="summary-value">
                  {{ formatCurrency(project.quotationSnapshot?.amount ?? 0) }}
                </span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Subtotal</span>
                <span class="summary-value">
                  {{ formatCurrency(project.quotationSnapshot?.subtotal ?? 0) }}
                </span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Descuento</span>
                <span class="summary-value">
                  {{ formatCurrency(project.quotationSnapshot?.discount ?? 0) }}
                </span>
              </div>
            </template>
          </div>
        </section>

        <section
          v-if="userStore.isFieldRole"
          class="card"
        >
          <header class="card-header">
            <h2 class="card-title">Historial de retiros</h2>
          </header>
          <div class="card-body">
            <div v-if="inventoryWithdrawalsLoading" class="empty-inline">
              <p>Cargando retiros…</p>
            </div>
            <div
              v-else-if="inventoryWithdrawalsError"
              class="empty-inline"
            >
              <p>{{ inventoryWithdrawalsError }}</p>
              <button
                type="button"
                class="btn-secondary btn-sm"
                @click="loadInventoryWithdrawals"
              >
                Reintentar
              </button>
            </div>
            <div
              v-else-if="inventoryWithdrawals.length === 0"
              class="empty-inline"
            >
              <p>Todavía no se ha retirado material para este proyecto.</p>
            </div>
            <ul v-else class="cost-list inventory-list">
              <li
                v-for="row in inventoryWithdrawals"
                :key="`field-${row.sourceType}-${row.id}`"
                class="cost-item inventory-item"
                :class="{
                  'inventory-item--reversed': row.reversed,
                  'inventory-item--link':
                    row.sourceType === 'roll' && row.productId,
                }"
                :role="
                  row.sourceType === 'roll' && row.productId
                    ? 'button'
                    : undefined
                "
                :tabindex="
                  row.sourceType === 'roll' && row.productId ? 0 : undefined
                "
                @click="
                  row.sourceType === 'roll' && row.productId
                    ? goToProductInventory(row)
                    : undefined
                "
                @keydown.enter.prevent="
                  row.sourceType === 'roll' && row.productId
                    ? goToProductInventory(row)
                    : undefined
                "
              >
                <div class="cost-item-main">
                  <div class="cost-item-top">
                    <p class="cost-item-desc">{{ row.productName }}</p>
                    <span
                      class="category-badge"
                      :class="
                        row.sourceType === 'roll'
                          ? 'category-badge--materials'
                          : 'category-badge--equipment'
                      "
                    >
                      {{ row.sourceType === "roll" ? "Rollo" : "Unidad" }}
                    </span>
                    <span
                      v-if="row.reversed"
                      class="history-reversed-badge"
                    >
                      Revertido
                    </span>
                  </div>
                  <p class="inventory-item-meta">
                    <span>
                      {{
                        row.quantityUnit === "m2"
                          ? `${formatArea(row.quantity)} m²`
                          : `${formatQty(row.quantity)} u.`
                      }}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{{ formatDateTime(row.withdrawnAt) }}</span>
                    <span aria-hidden="true">·</span>
                    <span>{{
                      row.performedByName?.trim() ||
                      row.performedBy?.trim() ||
                      "—"
                    }}</span>
                    <template v-if="row.barcodeValue">
                      <span aria-hidden="true">·</span>
                      <span class="inventory-barcode">{{
                        row.barcodeValue
                      }}</span>
                    </template>
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section class="card">
          <header class="card-header card-header-row">
            <h2 class="card-title">Notas</h2>
            <button
              type="button"
              class="btn-secondary btn-sm"
              :disabled="savingNotes"
              @click="saveNotes"
            >
              {{ savingNotes ? "Guardando…" : "Guardar notas" }}
            </button>
          </header>
          <div class="card-body">
            <textarea
              v-model="notesDraft"
              class="notes-textarea"
              rows="4"
              placeholder="Notas del proyecto…"
              @blur="saveNotesOnBlur"
            />
          </div>
        </section>
      </template>

      <!-- Tab: Diseños -->
      <section v-else-if="activeTab === 'disenos'" class="card">
        <header class="card-header card-header-row">
          <h2 class="card-title">Diseños vinculados</h2>
          <button
            type="button"
            class="btn-secondary btn-sm"
            @click="openLinkModal"
          >
            + Vincular diseño
          </button>
        </header>
        <div class="card-body">
          <div v-if="!project.elements?.length" class="empty-inline">
            <p>No hay diseños vinculados todavía.</p>
          </div>
          <ul v-else class="element-list">
            <li
              v-for="el in project.elements"
              :key="el.designId"
              class="element-item"
              :class="{ 'menu-open': openDesignMenuId === el.designId }"
              role="button"
              tabindex="0"
              @click="openDesignViewer(el)"
              @keydown.enter.prevent="openDesignViewer(el)"
              @keydown.space.prevent="openDesignViewer(el)"
            >
              <div class="element-main">
                <p class="element-name">{{ el.designName }}</p>
                <p class="element-meta">
                  {{ designTypeLabel(el.designType) }}
                  ·
                  {{ formatArea(el.m2Snapshot) }} m²
                </p>
              </div>
              <div class="element-menu-wrap" @click.stop>
                <button
                  type="button"
                  class="element-menu-btn"
                  :aria-expanded="openDesignMenuId === el.designId"
                  aria-haspopup="true"
                  aria-label="Abrir menú del diseño"
                  @click.stop="toggleDesignMenu(el, $event)"
                >
                  <span class="element-menu-dots" aria-hidden="true">⋯</span>
                </button>
              </div>
            </li>
          </ul>
          <Teleport to="body">
            <div
              v-if="openDesignMenuId && openDesignMenuElement"
              class="element-menu-dropdown"
              role="menu"
              :style="designMenuStyle"
              @click.stop
            >
              <button
                type="button"
                class="element-menu-option"
                role="menuitem"
                @click="openDesignViewer(openDesignMenuElement)"
              >
                Ver en 3D
              </button>
              <button
                type="button"
                class="element-menu-option element-menu-option--danger"
                role="menuitem"
                @click="openUnlinkFromMenu(openDesignMenuElement)"
              >
                Desvincular
              </button>
            </div>
          </Teleport>
        </div>
      </section>

      <!-- Tab: Fotos -->
      <section v-else-if="activeTab === 'fotos'" class="card">
        <header class="card-header card-header-row">
          <h2 class="card-title">Fotos</h2>
          <div class="photo-header-actions">
            <span v-if="uploadingPhotos" class="photo-upload-progress">
              Subiendo {{ photoUploadCurrent }} de {{ photoUploadTotal }}…
            </span>
            <label class="btn-secondary btn-sm photo-add-btn">
              📷 Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                class="photo-file-input"
                :disabled="uploadingPhotos"
                @change="onProjectPhotosSelected"
              />
            </label>
            <label class="btn-secondary btn-sm photo-add-btn">
              🖼️ Subir de galería
              <input
                type="file"
                accept="image/*"
                multiple
                class="photo-file-input"
                :disabled="uploadingPhotos"
                @change="onProjectPhotosSelected"
              />
            </label>
          </div>
        </header>
        <div class="card-body">
          <div v-if="photosLoading" class="empty-inline">
            <p>Cargando fotos…</p>
          </div>
          <div v-else-if="projectPhotos.length === 0" class="empty-inline">
            <p>Aún no hay fotos de este proyecto.</p>
          </div>
          <ul v-else class="photo-grid">
            <li
              v-for="(photo, index) in projectPhotos"
              :key="photo.id"
              class="photo-thumb"
            >
              <button
                type="button"
                class="photo-thumb-open"
                :aria-label="`Ver foto ${index + 1}`"
                @click="openPhotoViewer(index)"
              >
                <span
                  v-if="!photoBlobUrls[photo.id]"
                  class="photo-thumb-placeholder"
                >
                  …
                </span>
                <img
                  v-else
                  :src="photoBlobUrls[photo.id]"
                  alt=""
                />
              </button>
              <button
                type="button"
                class="photo-thumb-remove"
                aria-label="Eliminar foto"
                @click.stop="openRemovePhotoConfirm(photo)"
              >
                ×
              </button>
            </li>
          </ul>
        </div>
      </section>

      <!-- Tab: Inventario -->
      <section v-else-if="activeTab === 'inventario'" class="card">
        <header class="card-header">
          <h2 class="card-title">Inventario retirado</h2>
        </header>
        <div class="card-body">
          <div v-if="inventoryWithdrawalsLoading" class="empty-inline">
            <p>Cargando retiros…</p>
          </div>
          <div
            v-else-if="inventoryWithdrawalsError"
            class="empty-inline"
          >
            <p>{{ inventoryWithdrawalsError }}</p>
            <button
              type="button"
              class="btn-secondary btn-sm"
              @click="loadInventoryWithdrawals"
            >
              Reintentar
            </button>
          </div>
          <div
            v-else-if="inventoryWithdrawals.length === 0"
            class="empty-inline"
          >
            <p>Todavía no se ha retirado material para este proyecto.</p>
          </div>
          <ul v-else class="cost-list inventory-list">
            <li
              v-for="row in inventoryWithdrawals"
              :key="`${row.sourceType}-${row.id}`"
              class="cost-item inventory-item"
              :class="{
                'inventory-item--reversed': row.reversed,
                'inventory-item--link': row.sourceType === 'roll' && row.productId,
              }"
              :role="
                row.sourceType === 'roll' && row.productId ? 'button' : undefined
              "
              :tabindex="
                row.sourceType === 'roll' && row.productId ? 0 : undefined
              "
              @click="
                row.sourceType === 'roll' && row.productId
                  ? goToProductInventory(row)
                  : undefined
              "
              @keydown.enter.prevent="
                row.sourceType === 'roll' && row.productId
                  ? goToProductInventory(row)
                  : undefined
              "
            >
              <div class="cost-item-main">
                <div class="cost-item-top">
                  <p class="cost-item-desc">{{ row.productName }}</p>
                  <span
                    class="category-badge"
                    :class="
                      row.sourceType === 'roll'
                        ? 'category-badge--materials'
                        : 'category-badge--equipment'
                    "
                  >
                    {{ row.sourceType === "roll" ? "Rollo" : "Unidad" }}
                  </span>
                  <span
                    v-if="row.reversed"
                    class="history-reversed-badge"
                  >
                    Revertido
                  </span>
                </div>
                <p class="inventory-item-meta">
                  <span>
                    {{
                      row.quantityUnit === "m2"
                        ? `${formatArea(row.quantity)} m²`
                        : `${formatQty(row.quantity)} u.`
                    }}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{{ formatDateTime(row.withdrawnAt) }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{
                    row.performedByName?.trim() ||
                    row.performedBy?.trim() ||
                    "—"
                  }}</span>
                  <template v-if="row.barcodeValue">
                    <span aria-hidden="true">·</span>
                    <span class="inventory-barcode">{{ row.barcodeValue }}</span>
                  </template>
                  <template
                    v-if="userStore.isAdmin && row.totalCost != null"
                  >
                    <span aria-hidden="true">·</span>
                    <span>{{ formatCurrency(row.totalCost) }}</span>
                  </template>
                </p>
              </div>
              <div
                v-if="userStore.isAdmin && !row.reversed"
                class="cost-item-actions"
              >
                <button
                  type="button"
                  class="btn-secondary btn-sm"
                  :disabled="reversing"
                  @click.stop="askReverseOne(row.sourceType, row.id)"
                >
                  Revertir
                </button>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- Tab: Rubros de costos -->
      <section v-else-if="activeTab === 'rubros'" class="card">
        <header class="card-header card-header-row">
          <h2 class="card-title">Rubros de costos</h2>
          <div class="cost-header-actions">
            <button
              type="button"
              class="btn-secondary btn-sm"
              @click="openCostForm()"
            >
              + Agregar rubro
            </button>
          </div>
        </header>
        <div class="card-body">
          <div v-if="costItemsLoading" class="empty-inline">
            <p>Cargando rubros…</p>
          </div>
          <div v-else-if="filteredCostItems.length === 0" class="empty-inline">
            <p>
              {{
                costItems.length === 0
                  ? "No hay rubros de costo todavía."
                  : "No hay rubros en esta categoría."
              }}
            </p>
          </div>
          <template v-else>
            <ul class="cost-list">
              <li
                v-for="item in filteredCostItems"
                :key="item.id"
                class="cost-item"
              >
                <div class="cost-item-main">
                  <div class="cost-item-top">
                    <p class="cost-item-desc">{{ item.description }}</p>
                    <span
                      class="category-badge"
                      :class="`category-badge--${item.category}`"
                    >
                      {{ categoryLabel(item.category) }}
                    </span>
                  </div>
                  <div class="cost-item-amounts">
                    <span class="cost-monto">{{
                      formatCurrency(item.amount)
                    }}</span>
                    <span
                      v-if="typeof item.estimatedAmount === 'number'"
                      class="cost-diff"
                      :class="diffClass(item)"
                    >
                      Est. {{ formatCurrency(item.estimatedAmount) }}
                      ·
                      {{ diffLabel(item) }}
                    </span>
                  </div>
                  <div v-if="item.invoiceUrls?.length" class="cost-thumbs">
                    <a
                      v-for="(url, idx) in item.invoiceUrls"
                      :key="`${item.id}-${idx}`"
                      :href="url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="cost-thumb"
                    >
                      <img :src="url" alt="Factura" />
                    </a>
                  </div>
                </div>
                <div class="cost-item-actions">
                  <button
                    type="button"
                    class="icon-button"
                    aria-label="Editar rubro"
                    @click="openCostForm(item)"
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
                      <path
                        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      />
                      <path
                        d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="icon-button icon-button-delete"
                    :aria-label="`Eliminar rubro de ${item.description}`"
                    @click="openDeleteCostConfirm(item)"
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
              </li>
            </ul>
            <div class="cost-total-row">
              <span class="cost-total-label">Total</span>
              <span class="cost-total-value">{{
                formatCurrency(costItemsTotal)
              }}</span>
            </div>
          </template>
        </div>
      </section>

      <!-- Tab: Liquidación -->
      <template v-else-if="activeTab === 'liquidacion'">
        <div class="liq-toolbar">
          <button
            type="button"
            class="btn-secondary"
            :disabled="exportingExcel || liquidacionLoading"
            @click="downloadLiquidacionExcel"
          >
            {{
              exportingExcel
                ? "Generando Excel…"
                : "Descargar Excel de liquidación"
            }}
          </button>
        </div>

        <div v-if="liquidacionLoading" class="state-box">
          <p>Cargando liquidación…</p>
        </div>
        <div v-else-if="liquidacionError" class="state-box">
          <p>{{ liquidacionError }}</p>
          <button
            type="button"
            class="btn-secondary"
            @click="loadLiquidacion"
          >
            Reintentar
          </button>
        </div>
        <template v-else-if="liquidacion">
          <section
            class="card liq-hero"
            :class="
              liquidacion.margin >= 0
                ? 'liq-hero--positive'
                : 'liq-hero--negative'
            "
          >
            <div class="liq-hero-grid">
              <div class="liq-metric">
                <span class="liq-metric-label">Ingreso total</span>
                <span class="liq-metric-value">{{
                  formatCurrency(liquidacion.totalIncome)
                }}</span>
              </div>
              <div class="liq-metric">
                <span class="liq-metric-label">Costo total</span>
                <span class="liq-metric-value">{{
                  formatCurrency(liquidacion.totalCost)
                }}</span>
              </div>
              <div class="liq-metric liq-metric--emphasis">
                <span class="liq-metric-label">Margen</span>
                <span class="liq-metric-value">{{
                  formatCurrency(liquidacion.margin)
                }}</span>
                <span class="liq-metric-sub"
                  >{{ liquidacion.marginPercentage.toFixed(2) }}%</span
                >
              </div>
            </div>
          </section>

          <section class="card">
            <header class="card-header">
              <h2 class="card-title">Costos por categoría</h2>
            </header>
            <div class="card-body">
              <ul class="liq-category-list">
                <li
                  v-for="opt in categoryOptions"
                  :key="opt.value"
                  class="liq-category-row"
                >
                  <span
                    class="category-badge"
                    :class="`category-badge--${opt.value}`"
                  >
                    {{ opt.label }}
                  </span>
                  <span class="liq-category-amount">{{
                    formatCurrency(
                      liquidacion.costsByCategory[opt.value] ?? 0,
                    )
                  }}</span>
                </li>
              </ul>
            </div>
          </section>

          <section class="card">
            <header class="card-header">
              <h2 class="card-title">Comparación de m²</h2>
            </header>
            <div class="card-body">
              <template
                v-if="
                  liquidacion.geometricM2 != null &&
                  liquidacion.actualM2 != null
                "
              >
                <div class="liq-m2-grid">
                  <div class="liq-metric">
                    <span class="liq-metric-label">m² geométrico</span>
                    <span class="liq-metric-value liq-metric-value--sm">{{
                      formatArea(liquidacion.geometricM2)
                    }}</span>
                  </div>
                  <div class="liq-metric">
                    <span class="liq-metric-label">m² real comprado</span>
                    <span class="liq-metric-value liq-metric-value--sm">{{
                      formatArea(liquidacion.actualM2)
                    }}</span>
                  </div>
                  <div class="liq-metric">
                    <span class="liq-metric-label">% desperdicio real</span>
                    <span
                      class="liq-metric-value liq-metric-value--sm"
                      :class="desperdicioClass"
                    >
                      {{
                        liquidacion.actualWastePercentage != null
                          ? `${liquidacion.actualWastePercentage.toFixed(2)}%`
                          : "—"
                      }}
                    </span>
                  </div>
                </div>
              </template>
              <p v-else class="liq-hint">
                {{ m2MissingHint }}
              </p>
            </div>
          </section>
        </template>
      </template>
    </template>

    <AppModal
      v-model="showUnlinkModal"
      title="¿Desvincular diseño?"
      variant="danger"
    >
      <p v-if="elementToUnlink">
        Se desvinculará <strong>{{ elementToUnlink.designName }}</strong> del
        proyecto. El diseño no se elimina.
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="showUnlinkModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="unlinking"
          @click="confirmUnlink"
        >
          {{ unlinking ? "Desvinculando…" : "Desvincular" }}
        </button>
      </template>
    </AppModal>

    <AppModal v-model="showLinkModal" title="Vincular diseño">
      <div v-if="designsLoading" class="empty-inline">
        <p>Cargando diseños…</p>
      </div>
      <div v-else-if="availableDesigns.length === 0" class="empty-inline">
        <p>No hay diseños disponibles para vincular.</p>
      </div>
      <ul v-else class="design-picker-list">
        <li v-for="design in availableDesigns" :key="design.id">
          <button
            type="button"
            class="design-picker-item"
            :class="{
              'design-picker-item--selected': selectedDesignId === design.id,
            }"
            @click="selectedDesignId = design.id"
          >
            <span class="design-picker-name">{{ design.name }}</span>
            <span class="design-picker-meta">
              {{ designTypeLabel(design.type) }} ·
              {{ formatArea(design.area?.total) }} m²
            </span>
          </button>
        </li>
      </ul>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="showLinkModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="!selectedDesignId || linking"
          @click="confirmLink"
        >
          {{ linking ? "Vinculando…" : "Vincular" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showCostFormModal"
      :title="editingCostId ? 'Editar rubro' : 'Agregar rubro'"
    >
      <div class="cost-form">
        <label class="cost-field">
          <span class="cost-field-label">Categoría</span>
          <select v-model="costForm.category" class="cost-input">
            <option
              v-for="opt in categoryOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </label>

        <label class="cost-field">
          <span class="cost-field-label">Descripción</span>
          <input
            v-model="costForm.description"
            type="text"
            class="cost-input"
            placeholder="Ej: Geomembrana, jornales, flete…"
          />
        </label>

        <label class="cost-field">
          <span class="cost-field-label">
            Monto estimado
            <span class="cost-field-optional">(opcional)</span>
          </span>
          <input
            v-model.number="costForm.estimatedAmount"
            type="number"
            min="0"
            step="0.01"
            class="cost-input"
            placeholder="0.00"
          />
        </label>

        <template v-if="costForm.category === 'labor'">
          <label class="cost-toggle">
            <input v-model="useLaborFormula" type="checkbox" />
            <span>¿Usar fórmula de días + metraje?</span>
          </label>

          <div v-if="useLaborFormula" class="labor-grid">
            <label class="cost-field">
              <span class="cost-field-label">Días trabajados</span>
              <input
                v-model.number="costForm.laborFormula.daysWorked"
                type="number"
                min="0"
                step="0.01"
                class="cost-input"
              />
            </label>
            <label class="cost-field">
              <span class="cost-field-label">Tarifa diaria</span>
              <input
                v-model.number="costForm.laborFormula.dailyRate"
                type="number"
                min="0"
                step="0.01"
                class="cost-input"
              />
            </label>
            <label class="cost-field">
              <span class="cost-field-label">Metros instalados</span>
              <input
                v-model.number="costForm.laborFormula.metersInstalled"
                type="number"
                min="0"
                step="0.01"
                class="cost-input"
              />
            </label>
            <label class="cost-field">
              <span class="cost-field-label">Tarifa por metro</span>
              <input
                v-model.number="costForm.laborFormula.ratePerMeter"
                type="number"
                min="0"
                step="0.01"
                class="cost-input"
              />
            </label>
            <p class="labor-preview">
              Monto calculado:
              <strong>{{ formatCurrency(laborPreviewMonto) }}</strong>
            </p>
          </div>

          <label v-else class="cost-field">
            <span class="cost-field-label">Monto</span>
            <input
              v-model.number="costForm.amount"
              type="number"
              min="0"
              step="0.01"
              class="cost-input"
              placeholder="0.00"
            />
          </label>
        </template>

        <label v-else class="cost-field">
          <span class="cost-field-label">Monto</span>
          <input
            v-model.number="costForm.amount"
            type="number"
            min="0"
            step="0.01"
            class="cost-input"
            placeholder="0.00"
          />
        </label>

        <div class="cost-photos">
          <span class="cost-field-label">Fotos de factura</span>
          <div v-if="!editingCostId" class="cost-photos-hint">
            Las fotos se subirán al guardar el rubro.
          </div>
          <div class="cost-thumbs cost-thumbs--form">
            <div
              v-for="(url, idx) in costFormInvoiceUrls"
              :key="`saved-${idx}`"
              class="cost-thumb cost-thumb--removable"
            >
              <img :src="url" alt="Factura" />
              <button
                type="button"
                class="cost-thumb-remove"
                title="Quitar foto"
                @click="openRemoveFacturaConfirm(url)"
              >
                ×
              </button>
            </div>
            <div
              v-for="(pending, idx) in pendingFacturaPreviews"
              :key="`pending-${idx}`"
              class="cost-thumb cost-thumb--removable"
            >
              <img :src="pending.previewUrl" alt="Pendiente" />
              <button
                type="button"
                class="cost-thumb-remove"
                title="Quitar"
                @click="removePendingFactura(idx)"
              >
                ×
              </button>
            </div>
          </div>
          <label class="cost-file-btn">
            <input
              type="file"
              accept="image/*"
              multiple
              :disabled="uploadingFacturas || savingCost"
              @change="onFacturaFilesSelected"
            />
            {{ uploadingFacturas ? "Subiendo…" : "+ Agregar fotos" }}
          </label>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="savingCost || uploadingFacturas"
          @click="closeCostForm"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="savingCost || uploadingFacturas || !canSaveCost"
          @click="saveCostItem"
        >
          {{ savingCost ? "Guardando…" : "Guardar" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showDeleteCostModal"
      title="¿Eliminar rubro?"
      variant="danger"
    >
      <p v-if="costToDelete">
        Se eliminará <strong>{{ costToDelete.description }}</strong
        >. Esta acción no se puede deshacer.
      </p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="showDeleteCostModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="deletingCost"
          @click="confirmDeleteCost"
        >
          {{ deletingCost ? "Eliminando…" : "Eliminar" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showRemoveFacturaModal"
      title="¿Quitar foto?"
      variant="danger"
    >
      <p>Se eliminará esta foto de factura del rubro.</p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="showRemoveFacturaModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="removingFactura"
          @click="confirmRemoveFactura"
        >
          {{ removingFactura ? "Quitando…" : "Quitar" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showRemovePhotoModal"
      title="¿Eliminar foto?"
      variant="danger"
    >
      <p>Se eliminará esta foto del proyecto. Esta acción no se puede deshacer.</p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          @click="showRemovePhotoModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="removingPhoto"
          @click="confirmRemovePhoto"
        >
          {{ removingPhoto ? "Eliminando…" : "Eliminar" }}
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showReverseListModal"
      :title="reverseModalTitle"
    >
      <p v-if="reverseListLoading" class="orphan-modal-hint">
        Cargando retiros…
      </p>
      <p v-else-if="reverseListError" class="orphan-modal-error">
        {{ reverseListError }}
      </p>
      <template v-else>
        <p v-if="reverseProductName" class="orphan-modal-hint">
          {{ reverseProductName }}
          <span v-if="reverseProductType" class="dim">
            · {{ reverseProductType === "unit" ? "Unidad" : "Rollo" }}
          </span>
        </p>
        <p
          v-if="!reverseRollRows.length && !reverseUnitRows.length"
          class="orphan-modal-hint"
        >
          No hay retiros activos para este código.
        </p>
        <ul v-else class="reverse-list">
          <li
            v-for="row in reverseRollRows"
            :key="`roll-${row.id}`"
            class="reverse-row"
          >
            <div class="reverse-row-main">
              <span class="reverse-row-kind">Rollo</span>
              <span class="reverse-row-qty">
                {{ formatArea(row.withdrawnArea) }} m²
              </span>
              <span
                v-if="userStore.isAdmin && row.totalCost != null"
                class="reverse-row-cost"
              >
                {{ formatCurrency(row.totalCost) }}
              </span>
            </div>
            <button
              type="button"
              class="btn-secondary btn-sm"
              :disabled="reversing"
              @click="askReverseOne('roll', row.id)"
            >
              Revertir
            </button>
          </li>
          <li
            v-for="row in reverseUnitRows"
            :key="`unit-${row.id}`"
            class="reverse-row"
          >
            <div class="reverse-row-main">
              <span class="reverse-row-kind">Unidad</span>
              <span class="reverse-row-qty">
                {{ formatQty(row.quantity) }} u.
              </span>
              <span
                v-if="userStore.isAdmin && row.totalCost != null"
                class="reverse-row-cost"
              >
                {{ formatCurrency(row.totalCost) }}
              </span>
            </div>
            <button
              type="button"
              class="btn-secondary btn-sm"
              :disabled="reversing"
              @click="askReverseOne('unit', row.id)"
            >
              Revertir
            </button>
          </li>
        </ul>
      </template>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="reversing"
          @click="showReverseListModal = false"
        >
          Cerrar
        </button>
        <button
          v-if="reverseRollRows.length + reverseUnitRows.length > 1"
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="reversing || reverseListLoading"
          @click="askReverseAll"
        >
          Revertir todos
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showReverseConfirmModal"
      :title="reverseConfirmTitle"
      variant="danger"
    >
      <p>{{ reverseConfirmMessage }}</p>
      <template #footer>
        <button
          type="button"
          class="modal-btn modal-btn-cancel"
          :disabled="reversing"
          @click="showReverseConfirmModal = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="modal-btn modal-btn-primary"
          :disabled="reversing"
          @click="confirmReverse"
        >
          {{ reversing ? "Revirtiendo…" : "Revertir" }}
        </button>
      </template>
    </AppModal>

    <ProjectPhotoViewer
      v-if="showPhotoViewer"
      :photos="projectPhotos"
      :initial-index="photoViewerIndex"
      @close="showPhotoViewer = false"
    />

    <DesignViewer3D
      v-model="showDesignViewer"
      :design-id="viewerDesignId"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import AppModal from "../components/AppModal.vue";
import DesignViewer3D from "../components/designs/DesignViewer3D.vue";
import ProjectPhotoViewer from "../components/ProjectPhotoViewer.vue";
import {
  useCostItems,
  type CostItem,
  type CostItemCategory,
  type CreateCostItemPayload,
  type LaborFormula,
} from "../composables/useCostItems";
import { useDesigns, type Design } from "../composables/useDesigns";
import {
  useLiquidacion,
  type LiquidacionSummary,
} from "../composables/useLiquidacion";
import {
  useProjectPhotos,
  type ProjectPhoto,
} from "../composables/useProjectPhotos";
import {
  useProjects,
  type ActiveInventoryWithdrawalsResult,
  type Project,
  type ProjectElement,
  type ProjectInventoryWithdrawal,
  type ProjectStatus,
} from "../composables/useProjects";
import { useRolls } from "../composables/useRolls";
import { useUnitStock } from "../composables/useUnitStock";
import { formatCurrency } from "../utils/format";
import { useToastStore } from "../stores/toast";
import { useUserStore } from "../stores/index";

type DetailTabId =
  | "resumen"
  | "disenos"
  | "fotos"
  | "inventario"
  | "rubros"
  | "liquidacion";
type ReverseKind = "roll" | "unit";

const route = useRoute();
const router = useRouter();
const toastStore = useToastStore();
const userStore = useUserStore();
const {
  getById,
  update,
  linkDesign,
  unlinkDesign,
  listActiveInventoryWithdrawals,
  listInventoryWithdrawals,
} = useProjects();
const { reverseWithdrawal } = useRolls();
const { reverseOutMovement } = useUnitStock();
const { list: listDesigns } = useDesigns();
const { getSummary, exportExcel } = useLiquidacion();
const {
  list: listCostItems,
  create: createCostItem,
  update: updateCostItem,
  remove: removeCostItem,
  addFactura,
  removeFactura,
} = useCostItems();
const {
  list: listProjectPhotos,
  add: addProjectPhoto,
  remove: removeProjectPhoto,
  getImageBlobUrl,
} = useProjectPhotos();

const activeTab = ref<DetailTabId>("resumen");
const ALL_DETAIL_TABS: { id: DetailTabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "disenos", label: "Diseños" },
  { id: "fotos", label: "Fotos" },
  { id: "inventario", label: "Inventario" },
  { id: "rubros", label: "Rubros de costos" },
  { id: "liquidacion", label: "Liquidación" },
];

/** Field roles see Resumen + Diseños + Fotos (no inventory/cost/liquidacion tabs). */
const detailTabs = computed(() => {
  if (userStore.isFieldRole) {
    return ALL_DETAIL_TABS.filter(
      (tab) =>
        tab.id === "resumen" || tab.id === "disenos" || tab.id === "fotos",
    );
  }
  return ALL_DETAIL_TABS;
});

const liquidacion = ref<LiquidacionSummary | null>(null);
const liquidacionLoading = ref(false);
const liquidacionError = ref("");
const exportingExcel = ref(false);

const inventoryWithdrawals = ref<ProjectInventoryWithdrawal[]>([]);
const inventoryWithdrawalsLoading = ref(false);
const inventoryWithdrawalsError = ref("");
const inventoryLoadedForId = ref<string | null>(null);

const project = ref<Project | null>(null);
const loading = ref(true);
const error = ref("");

const orphanedInventoryCodes = computed(
  () => project.value?.orphanedInventoryCodes ?? [],
);

const reverseLoadingCode = ref<string | null>(null);
const showReverseListModal = ref(false);
const reverseListLoading = ref(false);
const reverseListError = ref("");
const reverseActiveCode = ref("");
const reverseProductName = ref<string | null>(null);
const reverseProductType = ref<"roll" | "unit" | null>(null);
const reverseRollRows = ref<ActiveInventoryWithdrawalsResult["rollWithdrawals"]>(
  [],
);
const reverseUnitRows = ref<ActiveInventoryWithdrawalsResult["unitMovements"]>(
  [],
);
const reversing = ref(false);
const showReverseConfirmModal = ref(false);
const reverseConfirmMode = ref<"one" | "all">("one");
const reversePendingKind = ref<ReverseKind | null>(null);
const reversePendingId = ref<string | null>(null);

const reverseModalTitle = computed(() =>
  reverseActiveCode.value
    ? `Retiros de ${reverseActiveCode.value}`
    : "Retiros de inventario",
);

const reverseConfirmTitle = computed(() =>
  reverseConfirmMode.value === "all"
    ? "¿Revertir todos los retiros?"
    : "¿Revertir este retiro?",
);

const reverseConfirmMessage = computed(() => {
  if (reverseConfirmMode.value === "all") {
    const n = reverseRollRows.value.length + reverseUnitRows.value.length;
    return `Se revertirán ${n} retiro(s) del código ${reverseActiveCode.value}. El material volverá al inventario y se ajustará el rubro de materiales. Esta acción no se puede deshacer.`;
  }
  return `El material volverá al inventario y se ajustará el rubro de materiales si aplica. Esta acción no se puede deshacer.`;
});

function formatQty(value: number | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CL", {
    maximumFractionDigits: 2,
  });
}

function formatDateTime(raw: unknown): string {
  if (!raw) return "—";
  let d: Date | null = null;
  if (typeof raw === "string") {
    d = new Date(raw);
  } else if (typeof raw === "object" && raw !== null) {
    const sec =
      (raw as { seconds?: number; _seconds?: number }).seconds ??
      (raw as { seconds?: number; _seconds?: number })._seconds;
    if (typeof sec === "number") d = new Date(sec * 1000);
  }
  if (!d || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

async function refreshReverseList() {
  if (!projectId.value || !reverseActiveCode.value) return;
  reverseListLoading.value = true;
  reverseListError.value = "";
  try {
    const data = await listActiveInventoryWithdrawals(
      projectId.value,
      reverseActiveCode.value,
    );
    reverseProductName.value = data.productName;
    reverseProductType.value = data.productType;
    reverseRollRows.value = data.rollWithdrawals;
    reverseUnitRows.value = data.unitMovements;
  } catch (e: unknown) {
    reverseListError.value =
      e instanceof Error ? e.message : "No se pudieron cargar los retiros.";
    reverseRollRows.value = [];
    reverseUnitRows.value = [];
  } finally {
    reverseListLoading.value = false;
  }
}

async function openReverseForCode(code: string) {
  if (!userStore.isAdmin || !projectId.value) return;
  reverseActiveCode.value = code;
  reverseLoadingCode.value = code;
  showReverseListModal.value = true;
  reverseProductName.value = null;
  reverseProductType.value = null;
  reverseRollRows.value = [];
  reverseUnitRows.value = [];
  try {
    await refreshReverseList();
  } finally {
    reverseLoadingCode.value = null;
  }
}

function askReverseOne(kind: ReverseKind, id: string) {
  reverseConfirmMode.value = "one";
  reversePendingKind.value = kind;
  reversePendingId.value = id;
  showReverseConfirmModal.value = true;
}

function askReverseAll() {
  reverseConfirmMode.value = "all";
  reversePendingKind.value = null;
  reversePendingId.value = null;
  showReverseConfirmModal.value = true;
}

async function confirmReverse() {
  if (!userStore.isAdmin || reversing.value) return;
  reversing.value = true;
  try {
    if (reverseConfirmMode.value === "all") {
      const rolls = [...reverseRollRows.value];
      const units = [...reverseUnitRows.value];
      for (const row of rolls) {
        await reverseWithdrawal(row.id);
      }
      for (const row of units) {
        await reverseOutMovement(row.id);
      }
      toastStore.show("Retiros revertidos.", "success");
    } else if (reversePendingKind.value && reversePendingId.value) {
      if (reversePendingKind.value === "roll") {
        await reverseWithdrawal(reversePendingId.value);
      } else {
        await reverseOutMovement(reversePendingId.value);
      }
      toastStore.show("Retiro revertido.", "success");
    }
    showReverseConfirmModal.value = false;
    await loadProject();
    inventoryLoadedForId.value = null;
    await refreshReverseList();
    if (
      !reverseRollRows.value.length &&
      !reverseUnitRows.value.length &&
      !(project.value?.orphanedInventoryCodes ?? []).includes(
        reverseActiveCode.value,
      )
    ) {
      showReverseListModal.value = false;
    }
    if (!userStore.isFieldRole) {
      await loadCostItems();
      if (activeTab.value === "liquidacion") {
        await loadLiquidacion();
      }
      if (activeTab.value === "inventario") {
        await loadInventoryWithdrawals();
      }
    }
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "No se pudo revertir el retiro.",
      "error",
    );
  } finally {
    reversing.value = false;
  }
}

const editingName = ref(false);
const nameDraft = ref("");
const nameInputRef = ref<HTMLInputElement | null>(null);
const savingName = ref(false);

const statusDropdownOpen = ref(false);
const statusBadgeWrapRef = ref<HTMLElement | null>(null);

const notesDraft = ref("");
const savingNotes = ref(false);
const notesDirty = ref(false);

const showUnlinkModal = ref(false);
const elementToUnlink = ref<ProjectElement | null>(null);
const unlinking = ref(false);
const openDesignMenuId = ref<string | null>(null);
const designMenuTriggerEl = ref<HTMLElement | null>(null);
const designMenuStyle = ref<Record<string, string>>({});
const showDesignViewer = ref(false);
const viewerDesignId = ref<string | null>(null);

const showLinkModal = ref(false);
const designsLoading = ref(false);
const allDesigns = ref<Design[]>([]);
const selectedDesignId = ref<string | null>(null);
const linking = ref(false);

const costItems = ref<CostItem[]>([]);
const costItemsLoading = ref(false);
const costCategoryFilter = ref<"all" | CostItemCategory>("all");

const showCostFormModal = ref(false);
const editingCostId = ref<string | null>(null);
const savingCost = ref(false);
const useLaborFormula = ref(false);
const costFormInvoiceUrls = ref<string[]>([]);
const uploadingFacturas = ref(false);

type PendingFactura = {
  base64: string;
  mimeType: string;
  previewUrl: string;
};
const pendingFacturas = ref<PendingFactura[]>([]);
const pendingFacturaPreviews = computed(() => pendingFacturas.value);

const showDeleteCostModal = ref(false);
const costToDelete = ref<CostItem | null>(null);
const deletingCost = ref(false);

const showRemoveFacturaModal = ref(false);
const facturaUrlToRemove = ref<string | null>(null);
const removingFactura = ref(false);

const projectPhotos = ref<ProjectPhoto[]>([]);
const photosLoading = ref(false);
const photosLoadedForId = ref<string | null>(null);
const uploadingPhotos = ref(false);
const photoUploadCurrent = ref(0);
const photoUploadTotal = ref(0);
const showRemovePhotoModal = ref(false);
const photoToRemove = ref<ProjectPhoto | null>(null);
const removingPhoto = ref(false);
const showPhotoViewer = ref(false);
const photoViewerIndex = ref(0);
/** Blob URLs privadas por photoId (revocar al limpiar). */
const photoBlobUrls = ref<Record<string, string>>({});
const photoBlobLoading = new Set<string>();

const emptyLaborFormula = (): LaborFormula => ({
  daysWorked: 0,
  dailyRate: 0,
  metersInstalled: 0,
  ratePerMeter: 0,
});

const costForm = reactive({
  category: "materials" as CostItemCategory,
  description: "",
  estimatedAmount: undefined as number | undefined,
  amount: 0,
  laborFormula: emptyLaborFormula(),
});

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planificado: "Planificado",
  instalando: "Instalando",
  liquidado: "Liquidado",
  cerrado: "Cerrado",
};

const DESIGN_TYPE_LABELS: Record<string, string> = {
  piscina_redonda: "Piscina redonda",
  piscina_rectangular: "Piscina rectangular",
  tanque_cilindrico: "Tanque cilíndrico",
  tanque_rectangular: "Tanque rectangular",
  relavera: "Relavera",
};

const CATEGORY_LABELS: Record<CostItemCategory, string> = {
  materials: "Materiales",
  labor: "Mano de obra",
  food: "Alimentación",
  transport: "Transporte",
  subcontracted: "Trabajo de terceros",
  other: "Otros",
};

const categoryOptions: { value: CostItemCategory; label: string }[] = [
  { value: "materials", label: "Materiales" },
  { value: "labor", label: "Mano de obra" },
  { value: "food", label: "Alimentación" },
  { value: "transport", label: "Transporte" },
  { value: "subcontracted", label: "Trabajo de terceros" },
  { value: "other", label: "Otros" },
];

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "planificado", label: "Planificado" },
  { value: "instalando", label: "Instalando" },
  { value: "liquidado", label: "Liquidado" },
  { value: "cerrado", label: "Cerrado" },
];

const projectId = computed(() => String(route.params.id ?? ""));

const availableDesigns = computed(() => {
  const linked = new Set(
    (project.value?.elements ?? []).map((el) => el.designId),
  );
  return allDesigns.value.filter((d) => !linked.has(d.id));
});

const openDesignMenuElement = computed(() => {
  if (!openDesignMenuId.value || !project.value) return null;
  return (
    project.value.elements.find(
      (el) => el.designId === openDesignMenuId.value,
    ) ?? null
  );
});

const filteredCostItems = computed(() => {
  if (costCategoryFilter.value === "all") return costItems.value;
  return costItems.value.filter((i) => i.category === costCategoryFilter.value);
});

const costItemsTotal = computed(() =>
  costItems.value.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
);

const m2MissingHint = computed(() => {
  const hasDesigns = (project.value?.elements?.length ?? 0) > 0;
  const hasM2Real = liquidacion.value?.actualM2 != null;
  if (!hasDesigns && !hasM2Real) {
    return "Vincula un diseño y carga m² real en un rubro de materiales para ver esta comparación.";
  }
  if (!hasDesigns) {
    return "Vincula al menos un diseño al proyecto para obtener el m² geométrico.";
  }
  return "Carga m² real en al menos un rubro de materiales para comparar contra el m² geométrico.";
});

const desperdicioClass = computed(() => {
  const pct = liquidacion.value?.actualWastePercentage;
  if (pct == null) return "";
  if (pct <= 10) return "liq-waste--ok";
  if (pct <= 20) return "liq-waste--warn";
  return "liq-waste--bad";
});

const laborPreviewMonto = computed(() => {
  const f = costForm.laborFormula;
  return round2(
    (Number(f.daysWorked) || 0) * (Number(f.dailyRate) || 0) +
      (Number(f.metersInstalled) || 0) * (Number(f.ratePerMeter) || 0),
  );
});

const canSaveCost = computed(() => costForm.description.trim().length > 0);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function statusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function designTypeLabel(type: string): string {
  return DESIGN_TYPE_LABELS[type] ?? type;
}

function categoryLabel(category: CostItemCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

function formatArea(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function diffClass(item: CostItem): string {
  if (typeof item.estimatedAmount !== "number") return "";
  const delta = item.amount - item.estimatedAmount;
  if (delta > 0.009) return "cost-diff--over";
  if (delta < -0.009) return "cost-diff--under";
  return "cost-diff--even";
}

function diffLabel(item: CostItem): string {
  if (typeof item.estimatedAmount !== "number") return "";
  const delta = round2(item.amount - item.estimatedAmount);
  if (Math.abs(delta) < 0.01) return "igual al estimado";
  if (delta > 0) return `+${formatCurrency(delta)} sobre estimado`;
  return `${formatCurrency(delta)} bajo estimado`;
}

function upsertCostItem(item: CostItem) {
  const idx = costItems.value.findIndex((c) => c.id === item.id);
  if (idx === -1) costItems.value = [...costItems.value, item];
  else {
    const next = [...costItems.value];
    next[idx] = item;
    costItems.value = next;
  }
}

async function loadCostItems() {
  if (!projectId.value || userStore.isFieldRole) return;
  costItemsLoading.value = true;
  try {
    costItems.value = await listCostItems(projectId.value);
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al cargar rubros de costo.",
      "error",
    );
  } finally {
    costItemsLoading.value = false;
  }
}

async function loadLiquidacion() {
  if (!projectId.value || userStore.isFieldRole) return;
  liquidacionLoading.value = true;
  liquidacionError.value = "";
  try {
    liquidacion.value = await getSummary(projectId.value);
  } catch (e: unknown) {
    liquidacion.value = null;
    liquidacionError.value =
      e instanceof Error ? e.message : "No se pudo cargar la liquidación.";
  } finally {
    liquidacionLoading.value = false;
  }
}

async function loadInventoryWithdrawals() {
  if (!projectId.value) return;
  inventoryWithdrawalsLoading.value = true;
  inventoryWithdrawalsError.value = "";
  try {
    inventoryWithdrawals.value = await listInventoryWithdrawals(
      projectId.value,
    );
    inventoryLoadedForId.value = projectId.value;
  } catch (e: unknown) {
    inventoryWithdrawals.value = [];
    inventoryWithdrawalsError.value =
      e instanceof Error
        ? e.message
        : "No se pudieron cargar los retiros de inventario.";
    inventoryLoadedForId.value = null;
  } finally {
    inventoryWithdrawalsLoading.value = false;
  }
}

function goToProductInventory(row: ProjectInventoryWithdrawal) {
  if (!row.productId) return;
  router.push({
    path: `/inventario/producto/${row.productId}`,
    query: row.productName ? { name: row.productName } : undefined,
  });
}

function downloadBase64Excel(filename: string, base64: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadLiquidacionExcel() {
  if (!projectId.value || exportingExcel.value || userStore.isFieldRole) return;
  exportingExcel.value = true;
  try {
    const { filename, base64 } = await exportExcel(projectId.value);
    downloadBase64Excel(filename, base64);
    toastStore.show("Excel descargado.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al exportar el Excel.",
      "error",
    );
  } finally {
    exportingExcel.value = false;
  }
}

async function loadProject() {
  if (!projectId.value) return;
  loading.value = true;
  error.value = "";
  try {
    const data = await getById(projectId.value);
    project.value = data;
    notesDraft.value = data.notes ?? "";
    notesDirty.value = false;
    if (!userStore.isFieldRole) {
      await loadCostItems();
    } else {
      costItems.value = [];
      await loadInventoryWithdrawals();
    }
  } catch (e: unknown) {
    error.value =
      e instanceof Error ? e.message : "No se pudo cargar el proyecto.";
    project.value = null;
  } finally {
    loading.value = false;
  }
}

function resetCostForm() {
  costForm.category = "materials";
  costForm.description = "";
  costForm.estimatedAmount = undefined;
  costForm.amount = 0;
  costForm.laborFormula = emptyLaborFormula();
  useLaborFormula.value = false;
  editingCostId.value = null;
  costFormInvoiceUrls.value = [];
  clearPendingFacturas();
}

function clearPendingFacturas() {
  for (const p of pendingFacturas.value) {
    URL.revokeObjectURL(p.previewUrl);
  }
  pendingFacturas.value = [];
}

function openCostForm(item?: CostItem) {
  resetCostForm();
  if (item) {
    editingCostId.value = item.id;
    costForm.category = item.category;
    costForm.description = item.description;
    costForm.estimatedAmount =
      typeof item.estimatedAmount === "number" ? item.estimatedAmount : undefined;
    costForm.amount = item.amount ?? 0;
    if (item.category === "labor" && item.laborFormula) {
      useLaborFormula.value = true;
      costForm.laborFormula = { ...item.laborFormula };
    }
    costFormInvoiceUrls.value = [...(item.invoiceUrls ?? [])];
  }
  showCostFormModal.value = true;
}

function closeCostForm() {
  showCostFormModal.value = false;
  resetCostForm();
}

function buildCostPayload(): CreateCostItemPayload {
  const payload: CreateCostItemPayload = {
    category: costForm.category,
    description: costForm.description.trim(),
  };
  if (
    costForm.estimatedAmount !== undefined &&
    costForm.estimatedAmount !== null &&
    String(costForm.estimatedAmount) !== ""
  ) {
    payload.estimatedAmount = Number(costForm.estimatedAmount) || 0;
  }
  if (costForm.category === "labor" && useLaborFormula.value) {
    payload.laborFormula = {
      daysWorked: Number(costForm.laborFormula.daysWorked) || 0,
      dailyRate: Number(costForm.laborFormula.dailyRate) || 0,
      metersInstalled: Number(costForm.laborFormula.metersInstalled) || 0,
      ratePerMeter: Number(costForm.laborFormula.ratePerMeter) || 0,
    };
  } else {
    payload.amount = Number(costForm.amount) || 0;
  }
  return payload;
}

function fileToBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const match = result.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match?.[1];
      const base64 = match?.[2];
      if (mimeType && base64) {
        resolve({ mimeType, base64 });
      } else {
        reject(new Error("No se pudo leer la imagen"));
      }
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

async function onFacturaFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (!files.length) return;

  if (editingCostId.value) {
    uploadingFacturas.value = true;
    try {
      let currentId = editingCostId.value;
      for (const file of files) {
        const { base64, mimeType } = await fileToBase64(file);
        const updated = await addFactura(currentId, base64, mimeType);
        upsertCostItem(updated);
        costFormInvoiceUrls.value = [...(updated.invoiceUrls ?? [])];
        currentId = updated.id;
      }
      toastStore.show("Foto(s) subida(s).", "success");
    } catch (e: unknown) {
      toastStore.show(
        e instanceof Error ? e.message : "Error al subir la foto.",
        "error",
      );
    } finally {
      uploadingFacturas.value = false;
    }
    return;
  }

  for (const file of files) {
    try {
      const { base64, mimeType } = await fileToBase64(file);
      pendingFacturas.value.push({
        base64,
        mimeType,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (e: unknown) {
      toastStore.show(
        e instanceof Error ? e.message : "Error al leer la imagen.",
        "error",
      );
    }
  }
}

function removePendingFactura(index: number) {
  const [removed] = pendingFacturas.value.splice(index, 1);
  if (removed) URL.revokeObjectURL(removed.previewUrl);
}

function openRemoveFacturaConfirm(url: string) {
  facturaUrlToRemove.value = url;
  showRemoveFacturaModal.value = true;
}

async function confirmRemoveFactura() {
  if (!editingCostId.value || !facturaUrlToRemove.value) return;
  removingFactura.value = true;
  try {
    const updated = await removeFactura(
      editingCostId.value,
      facturaUrlToRemove.value,
    );
    upsertCostItem(updated);
    costFormInvoiceUrls.value = [...(updated.invoiceUrls ?? [])];
    showRemoveFacturaModal.value = false;
    facturaUrlToRemove.value = null;
    toastStore.show("Foto eliminada.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al quitar la foto.",
      "error",
    );
  } finally {
    removingFactura.value = false;
  }
}

async function saveCostItem() {
  if (!project.value || !canSaveCost.value) return;
  savingCost.value = true;
  try {
    const payload = buildCostPayload();
    let saved: CostItem;
    if (editingCostId.value) {
      saved = await updateCostItem(editingCostId.value, payload);
      upsertCostItem(saved);
      toastStore.show("Rubro actualizado.", "success");
    } else {
      saved = await createCostItem(project.value.id, payload);
      upsertCostItem(saved);
      if (pendingFacturas.value.length) {
        uploadingFacturas.value = true;
        try {
          let current = saved;
          for (const pending of pendingFacturas.value) {
            current = await addFactura(
              current.id,
              pending.base64,
              pending.mimeType,
            );
          }
          upsertCostItem(current);
        } finally {
          uploadingFacturas.value = false;
        }
      }
      toastStore.show("Rubro creado.", "success");
    }
    closeCostForm();
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al guardar el rubro.",
      "error",
    );
  } finally {
    savingCost.value = false;
  }
}

function openDeleteCostConfirm(item: CostItem) {
  costToDelete.value = item;
  showDeleteCostModal.value = true;
}

async function confirmDeleteCost() {
  if (!costToDelete.value) return;
  deletingCost.value = true;
  try {
    await removeCostItem(costToDelete.value.id);
    costItems.value = costItems.value.filter(
      (c) => c.id !== costToDelete.value!.id,
    );
    showDeleteCostModal.value = false;
    costToDelete.value = null;
    toastStore.show("Rubro eliminado.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al eliminar el rubro.",
      "error",
    );
  } finally {
    deletingCost.value = false;
  }
}

function startEditName() {
  if (!project.value || userStore.isFieldRole) return;
  nameDraft.value = project.value.name;
  editingName.value = true;
  nextTick(() => nameInputRef.value?.focus());
}

function cancelEditName() {
  editingName.value = false;
  nameDraft.value = project.value?.name ?? "";
}

async function saveName() {
  if (!project.value || userStore.isFieldRole) return;
  const name = nameDraft.value.trim();
  if (!name) {
    toastStore.show("El nombre no puede estar vacío.", "error");
    return;
  }
  if (name === project.value.name) {
    editingName.value = false;
    return;
  }
  savingName.value = true;
  try {
    project.value = await update(project.value.id, { name });
    editingName.value = false;
    toastStore.show("Nombre actualizado.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al actualizar el nombre.",
      "error",
    );
  } finally {
    savingName.value = false;
  }
}

async function setStatus(status: ProjectStatus) {
  if (userStore.isFieldRole) return;
  statusDropdownOpen.value = false;
  if (!project.value || project.value.status === status) return;
  try {
    project.value = await update(project.value.id, { status });
    toastStore.show("Estado actualizado.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al actualizar el estado.",
      "error",
    );
  }
}

watch(notesDraft, () => {
  if (!project.value) return;
  notesDirty.value = notesDraft.value !== (project.value.notes ?? "");
});

async function saveNotes() {
  if (!project.value || !notesDirty.value) return;
  savingNotes.value = true;
  try {
    project.value = await update(project.value.id, {
      notes: notesDraft.value,
    });
    notesDirty.value = false;
    toastStore.show("Notas guardadas.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al guardar las notas.",
      "error",
    );
  } finally {
    savingNotes.value = false;
  }
}

function saveNotesOnBlur() {
  if (notesDirty.value) void saveNotes();
}

function openUnlinkConfirm(el: ProjectElement) {
  elementToUnlink.value = el;
  showUnlinkModal.value = true;
}

function closeDesignMenu() {
  openDesignMenuId.value = null;
  designMenuTriggerEl.value = null;
  designMenuStyle.value = {};
}

function positionDesignMenu(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  designMenuStyle.value = {
    position: "fixed",
    top: `${Math.round(rect.bottom + 4)}px`,
    right: `${Math.round(window.innerWidth - rect.right)}px`,
    zIndex: "1100",
  };
}

function toggleDesignMenu(el: ProjectElement, event: MouseEvent) {
  if (openDesignMenuId.value === el.designId) {
    closeDesignMenu();
    return;
  }
  const trigger = event.currentTarget as HTMLElement;
  designMenuTriggerEl.value = trigger;
  positionDesignMenu(trigger);
  openDesignMenuId.value = el.designId;
}

function openDesignViewer(el: ProjectElement) {
  closeDesignMenu();
  viewerDesignId.value = el.designId;
  showDesignViewer.value = true;
}

function openUnlinkFromMenu(el: ProjectElement) {
  closeDesignMenu();
  openUnlinkConfirm(el);
}

function onDesignMenuClickOutside(event: MouseEvent) {
  if (!openDesignMenuId.value) return;
  const target = event.target as Element | null;
  if (
    target?.closest(".element-menu-wrap") ||
    target?.closest(".element-menu-dropdown")
  ) {
    return;
  }
  closeDesignMenu();
}

function onDesignMenuReposition() {
  if (!openDesignMenuId.value || !designMenuTriggerEl.value) return;
  positionDesignMenu(designMenuTriggerEl.value);
}

watch(openDesignMenuId, (open) => {
  if (open) {
    setTimeout(() => {
      document.addEventListener("click", onDesignMenuClickOutside);
      window.addEventListener("scroll", onDesignMenuReposition, true);
      window.addEventListener("resize", onDesignMenuReposition);
    }, 0);
  } else {
    document.removeEventListener("click", onDesignMenuClickOutside);
    window.removeEventListener("scroll", onDesignMenuReposition, true);
    window.removeEventListener("resize", onDesignMenuReposition);
  }
});

async function confirmUnlink() {
  if (!project.value || !elementToUnlink.value) return;
  unlinking.value = true;
  try {
    project.value = await unlinkDesign(
      project.value.id,
      elementToUnlink.value.designId,
    );
    showUnlinkModal.value = false;
    elementToUnlink.value = null;
    toastStore.show("Diseño desvinculado.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al desvincular.",
      "error",
    );
  } finally {
    unlinking.value = false;
  }
}

async function openLinkModal() {
  selectedDesignId.value = null;
  showLinkModal.value = true;
  designsLoading.value = true;
  try {
    allDesigns.value = await listDesigns();
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al cargar diseños.",
      "error",
    );
    showLinkModal.value = false;
  } finally {
    designsLoading.value = false;
  }
}

async function confirmLink() {
  if (!project.value || !selectedDesignId.value) return;
  linking.value = true;
  try {
    project.value = await linkDesign(project.value.id, selectedDesignId.value);
    showLinkModal.value = false;
    selectedDesignId.value = null;
    toastStore.show("Diseño vinculado.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al vincular el diseño.",
      "error",
    );
  } finally {
    linking.value = false;
  }
}

function onStatusClickOutside(event: MouseEvent) {
  if (
    statusDropdownOpen.value &&
    statusBadgeWrapRef.value &&
    !statusBadgeWrapRef.value.contains(event.target as Node)
  ) {
    statusDropdownOpen.value = false;
  }
}

async function loadProjectPhotos(force = false) {
  if (!projectId.value) return;
  if (!force && photosLoadedForId.value === projectId.value) return;

  photosLoading.value = true;
  try {
    projectPhotos.value = await listProjectPhotos(projectId.value);
    photosLoadedForId.value = projectId.value;
    void syncPhotoBlobs();
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al cargar las fotos.",
      "error",
    );
  } finally {
    photosLoading.value = false;
  }
}

function revokePhotoBlob(id: string) {
  const url = photoBlobUrls.value[id];
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
  if (photoBlobUrls.value[id]) {
    const next = { ...photoBlobUrls.value };
    delete next[id];
    photoBlobUrls.value = next;
  }
  photoBlobLoading.delete(id);
}

function revokeAllPhotoBlobs() {
  for (const id of Object.keys(photoBlobUrls.value)) {
    revokePhotoBlob(id);
  }
  photoBlobUrls.value = {};
  photoBlobLoading.clear();
}

async function ensurePhotoBlob(photoId: string) {
  if (photoBlobUrls.value[photoId] || photoBlobLoading.has(photoId)) return;
  photoBlobLoading.add(photoId);
  try {
    const blobUrl = await getImageBlobUrl(photoId);
    photoBlobUrls.value = { ...photoBlobUrls.value, [photoId]: blobUrl };
  } catch {
    // Silencioso en miniatura; el visor muestra su propio error
  } finally {
    photoBlobLoading.delete(photoId);
  }
}

async function syncPhotoBlobs() {
  const ids = new Set(projectPhotos.value.map((p) => p.id));
  for (const id of Object.keys(photoBlobUrls.value)) {
    if (!ids.has(id)) revokePhotoBlob(id);
  }
  // Carga en lotes pequeños (pocas decenas de fotos por obra)
  const pending = projectPhotos.value
    .map((p) => p.id)
    .filter((id) => !photoBlobUrls.value[id]);
  const concurrency = 4;
  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(batch.map((id) => ensurePhotoBlob(id)));
  }
}

async function onProjectPhotosSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (!files.length || !projectId.value || uploadingPhotos.value) return;

  uploadingPhotos.value = true;
  photoUploadTotal.value = files.length;
  photoUploadCurrent.value = 0;
  try {
    for (const file of files) {
      photoUploadCurrent.value += 1;
      const { base64, mimeType } = await fileToBase64(file);
      const photo = await addProjectPhoto(projectId.value, base64, mimeType);
      projectPhotos.value = [photo, ...projectPhotos.value];
      void ensurePhotoBlob(photo.id);
    }
    toastStore.show(
      files.length === 1 ? "Foto subida." : "Fotos subidas.",
      "success",
    );
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al subir las fotos.",
      "error",
    );
  } finally {
    uploadingPhotos.value = false;
    photoUploadCurrent.value = 0;
    photoUploadTotal.value = 0;
  }
}

function openPhotoViewer(index: number) {
  photoViewerIndex.value = index;
  showPhotoViewer.value = true;
}

function openRemovePhotoConfirm(photo: ProjectPhoto) {
  photoToRemove.value = photo;
  showRemovePhotoModal.value = true;
}

async function confirmRemovePhoto() {
  if (!photoToRemove.value) return;
  removingPhoto.value = true;
  try {
    const id = photoToRemove.value.id;
    await removeProjectPhoto(id);
    projectPhotos.value = projectPhotos.value.filter((p) => p.id !== id);
    revokePhotoBlob(id);
    showRemovePhotoModal.value = false;
    photoToRemove.value = null;
    if (showPhotoViewer.value && projectPhotos.value.length === 0) {
      showPhotoViewer.value = false;
    }
    toastStore.show("Foto eliminada.", "success");
  } catch (e: unknown) {
    toastStore.show(
      e instanceof Error ? e.message : "Error al eliminar la foto.",
      "error",
    );
  } finally {
    removingPhoto.value = false;
  }
}

watch(statusDropdownOpen, (open) => {
  if (open) {
    setTimeout(() => {
      document.addEventListener("click", onStatusClickOutside);
    }, 0);
  } else {
    document.removeEventListener("click", onStatusClickOutside);
  }
});

watch(activeTab, (tab) => {
  if (tab === "fotos") {
    void loadProjectPhotos();
  }
  if (userStore.isFieldRole) {
    if (
      tab === "resumen" &&
      inventoryLoadedForId.value !== projectId.value
    ) {
      void loadInventoryWithdrawals();
    }
    return;
  }
  if (tab === "liquidacion") {
    void loadLiquidacion();
  }
  if (tab === "inventario") {
    if (inventoryLoadedForId.value !== projectId.value) {
      void loadInventoryWithdrawals();
    }
  }
});

watch(
  () => userStore.isFieldRole,
  (isField) => {
    if (
      isField &&
      (activeTab.value === "rubros" ||
        activeTab.value === "liquidacion" ||
        activeTab.value === "inventario")
    ) {
      activeTab.value = "resumen";
    }
  },
  { immediate: true },
);

watch(
  () => route.params.id,
  () => {
    activeTab.value = "resumen";
    liquidacion.value = null;
    inventoryWithdrawals.value = [];
    inventoryLoadedForId.value = null;
    projectPhotos.value = [];
    photosLoadedForId.value = null;
    showPhotoViewer.value = false;
    revokeAllPhotoBlobs();
    void loadProject();
  },
);

onMounted(() => {
  void loadProject();
});

onUnmounted(() => {
  document.removeEventListener("click", onStatusClickOutside);
  document.removeEventListener("click", onDesignMenuClickOutside);
  window.removeEventListener("scroll", onDesignMenuReposition, true);
  window.removeEventListener("resize", onDesignMenuReposition);
  clearPendingFacturas();
  revokeAllPhotoBlobs();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 100%;
}

.page-back {
  margin-bottom: -0.25rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0;
  border: none;
  background: none;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.back-link:hover {
  color: #0f9f70;
}

.state-box {
  padding: 3rem 1.5rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
  color: #64748b;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.detail-header-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.name-display-row,
.name-edit-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.page-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #053f51;
}

.name-input {
  min-width: 220px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 1.1rem;
  font-weight: 600;
  color: #053f51;
}

.name-input:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.25);
}

.quote-link {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: #0c7a57;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.quote-link:hover {
  text-decoration: underline;
}

.orphan-banner {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.15rem;
  border-radius: 12px;
  border: 1px solid #fbbf24;
  background: #fffbeb;
}

.orphan-banner-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #92400e;
}

.orphan-banner-text {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: #78350f;
  line-height: 1.4;
}

.orphan-code-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.orphan-code-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(251, 191, 36, 0.45);
}

.orphan-code-badge {
  font-size: 0.8rem;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #053f51;
  background: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.orphan-modal-hint {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #64748b;
}

.orphan-modal-error {
  margin: 0;
  font-size: 0.9rem;
  color: #b91c1c;
}

.reverse-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: min(50vh, 360px);
  overflow-y: auto;
}

.reverse-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.reverse-row-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.65rem;
  min-width: 0;
}

.reverse-row-kind {
  font-size: 0.72rem;
  font-weight: 700;
  color: #053f51;
  background: rgba(5, 63, 81, 0.08);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.reverse-row-qty {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.reverse-row-cost {
  font-size: 0.8rem;
  color: #64748b;
}

.dim {
  color: #94a3b8;
}

.detail-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.2rem 0;
}

.detail-tab {
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.detail-tab:hover {
  border-color: #94a3b8;
  color: #0f172a;
}

.detail-tab.detail-tab--active,
.detail-tab.detail-tab--active:hover,
.detail-tab.detail-tab--active:focus,
.detail-tab.detail-tab--active:focus-visible {
  background: #053f51;
  border-color: #053f51;
  color: #fff;
}

.liq-toolbar {
  display: flex;
  justify-content: flex-end;
}

.liq-hero {
  border-width: 1px;
}

.liq-hero--positive {
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.08), #ffffff 55%);
  border-color: rgba(34, 197, 94, 0.28);
}

.liq-hero--negative {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.08), #ffffff 55%);
  border-color: rgba(239, 68, 68, 0.28);
}

.liq-hero-grid,
.liq-m2-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.liq-hero .liq-hero-grid {
  padding: 1.25rem;
}

.liq-m2-grid {
  padding: 0;
}

.liq-metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.liq-metric-label {
  font-size: 0.75rem;
  font-weight: 650;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.liq-metric-value {
  font-size: 1.45rem;
  font-weight: 750;
  color: #053f51;
}

.liq-metric-value--sm {
  font-size: 1.2rem;
}

.liq-metric-sub {
  font-size: 0.95rem;
  font-weight: 650;
  color: #475569;
}

.liq-metric--emphasis .liq-metric-value {
  font-size: 1.7rem;
}

.liq-hero--positive .liq-metric--emphasis .liq-metric-value,
.liq-hero--positive .liq-metric--emphasis .liq-metric-sub {
  color: #15803d;
}

.liq-hero--negative .liq-metric--emphasis .liq-metric-value,
.liq-hero--negative .liq-metric--emphasis .liq-metric-sub {
  color: #b91c1c;
}

.liq-category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.liq-category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.liq-category-amount {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.liq-hint {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.45;
}

.liq-waste--ok {
  color: #15803d !important;
}

.liq-waste--warn {
  color: #b45309 !important;
}

.liq-waste--bad {
  color: #b91c1c !important;
}

.card {
  padding: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  color: #0f172a;
}

.card-body {
  padding: 1.15rem 1.25rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.summary-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.empty-inline p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.element-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.element-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.element-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.element-item:focus-visible {
  outline: none;
  border-color: rgba(15, 159, 112, 0.55);
  box-shadow: 0 0 0 2px rgba(15, 159, 112, 0.2);
}

.element-menu-wrap {
  position: relative;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.element-item:hover .element-menu-wrap,
.element-item.menu-open .element-menu-wrap {
  opacity: 1;
}

.element-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.element-menu-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

.element-menu-dots {
  font-size: 1.25rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.05em;
}

.element-menu-dropdown {
  position: fixed;
  min-width: 10rem;
  padding: 0.35rem 0;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
  z-index: 1100;
}

.element-menu-option {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  font-size: 0.9rem;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.element-menu-option:hover {
  background: #f8fafc;
}

.element-menu-option--danger {
  color: #b91c1c;
}

.element-menu-option--danger:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.element-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.element-meta {
  margin: 0.2rem 0 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.notes-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
}

.notes-textarea:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.25);
}

.btn-secondary {
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(15, 159, 112, 0.35);
  background: #ffffff;
  color: #0c7a57;
  font-size: 0.9rem;
  font-weight: 650;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(15, 159, 112, 0.08);
}

.btn-secondary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-ghost {
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-ghost:hover:not(:disabled) {
  background: #f1f5f9;
  color: #334155;
}

.btn-danger-ghost {
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #b91c1c;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger-ghost:hover {
  background: #fef2f2;
}

.btn-sm {
  font-size: 0.85rem;
  padding: 0.4rem 0.75rem;
}

.status-badge-wrap {
  position: relative;
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

.status-badge--readonly {
  cursor: default;
  pointer-events: none;
}

.status-badge--readonly:hover {
  transform: none;
  box-shadow: none;
}

.status-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge--planificado {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.3);
}
.status-badge--planificado .status-badge-dot {
  background: #1d4ed8;
}

.status-badge--instalando {
  background: rgba(234, 179, 8, 0.15);
  color: #b45309;
  border-color: rgba(234, 179, 8, 0.35);
}
.status-badge--instalando .status-badge-dot {
  background: #b45309;
}

.status-badge--liquidado {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.35);
}
.status-badge--liquidado .status-badge-dot {
  background: #15803d;
}

.status-badge--cerrado {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border-color: rgba(100, 116, 139, 0.3);
}
.status-badge--cerrado .status-badge-dot {
  background: #475569;
}

.status-badge-chevron {
  font-size: 0.55rem;
  opacity: 0.8;
}

.status-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 150px;
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
}

.status-dropdown-option:hover {
  background: #f1f5f9;
}

.status-option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dropdown-option--planificado .status-option-dot {
  background: #1d4ed8;
}
.status-dropdown-option--instalando .status-option-dot {
  background: #b45309;
}
.status-dropdown-option--liquidado .status-option-dot {
  background: #15803d;
}
.status-dropdown-option--cerrado .status-option-dot {
  background: #475569;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.12s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
}

.design-picker-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 320px;
  overflow-y: auto;
}

.design-picker-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
}

.design-picker-item:hover {
  border-color: #cbd5e1;
}

.design-picker-item--selected {
  border-color: rgba(15, 159, 112, 0.55);
  background: rgba(15, 159, 112, 0.08);
}

.design-picker-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.design-picker-meta {
  font-size: 0.8rem;
  color: #64748b;
}

.modal-btn {
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.modal-btn-cancel {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.modal-btn-primary {
  background: #0f9f70;
  color: #ffffff;
}

.modal-btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.cost-header-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.cost-filter-select {
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.85rem;
  background: #fff;
  color: #334155;
}

.cost-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.inventory-item--reversed {
  opacity: 0.72;
}

.inventory-item--reversed .cost-item-desc,
.inventory-item--reversed .inventory-item-meta {
  text-decoration: line-through;
}

.inventory-item--link {
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.inventory-item--link:hover,
.inventory-item--link:focus-visible {
  border-color: #0f9f70;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  outline: none;
}

.inventory-item-meta {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.45rem;
  font-size: 0.8rem;
  color: #64748b;
}

.inventory-barcode {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
}

.history-reversed-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.12rem 0.4rem;
  border-radius: 6px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fbbf24;
  text-decoration: none !important;
}

.cost-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.cost-item-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cost-item-top {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.cost-item-desc {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.cost-item-amounts {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.cost-monto {
  font-size: 1rem;
  font-weight: 700;
  color: #053f51;
}

.cost-diff {
  font-size: 0.8rem;
  font-weight: 500;
}

.cost-diff--over {
  color: #b91c1c;
}

.cost-diff--under {
  color: #15803d;
}

.cost-diff--even {
  color: #64748b;
}

.cost-item-actions {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.15rem;
  flex-shrink: 0;
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
  color: #334155;
  background: #f1f5f9;
  outline: none;
}

.icon-button-delete:hover,
.icon-button-delete:focus-visible {
  color: #b91c1c;
  background: #fef2f2;
  outline: none;
}

.cost-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #e2e8f0;
}

.cost-total-label {
  font-size: 0.9rem;
  font-weight: 650;
  color: #64748b;
}

.cost-total-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #053f51;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 650;
  border: 1px solid transparent;
}

.category-badge--materials {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.28);
}

.category-badge--labor {
  background: rgba(168, 85, 247, 0.12);
  color: #7e22ce;
  border-color: rgba(168, 85, 247, 0.28);
}

.category-badge--food {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.28);
}

.category-badge--transport {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
  border-color: rgba(14, 165, 233, 0.28);
}

.category-badge--subcontracted {
  background: rgba(136, 19, 55, 0.12);
  color: #9f1239;
  border-color: rgba(136, 19, 55, 0.28);
}

.category-badge--other {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border-color: rgba(100, 116, 139, 0.28);
}

.cost-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.cost-thumb {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #fff;
  display: block;
}

.cost-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cost-thumb--removable {
  display: inline-block;
}

.cost-thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.cost-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.cost-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cost-field-label {
  font-size: 0.8rem;
  font-weight: 650;
  color: #64748b;
}

.cost-field-optional {
  font-weight: 500;
  color: #94a3b8;
}

.cost-input {
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.95rem;
  font-family: inherit;
}

.cost-input:focus {
  outline: none;
  border-color: #0f9f70;
  box-shadow: 0 0 0 1px rgba(15, 159, 112, 0.25);
}

.cost-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 550;
  color: #334155;
  cursor: pointer;
}

.labor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.labor-preview {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  background: rgba(15, 159, 112, 0.08);
  color: #0c7a57;
  font-size: 0.9rem;
}

.cost-photos {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cost-photos-hint {
  font-size: 0.8rem;
  color: #94a3b8;
}

.cost-thumbs--form {
  min-height: 0;
}

.cost-file-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  border: 1px dashed rgba(15, 159, 112, 0.45);
  background: rgba(15, 159, 112, 0.05);
  color: #0c7a57;
  font-size: 0.85rem;
  font-weight: 650;
  cursor: pointer;
}

.cost-file-btn input {
  display: none;
}

.cost-file-btn:has(input:disabled) {
  opacity: 0.65;
  cursor: not-allowed;
}

.photo-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.photo-upload-progress {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f9f70;
}

.photo-add-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.photo-add-btn:has(input:disabled) {
  opacity: 0.65;
  cursor: not-allowed;
}

.photo-file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.photo-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.photo-thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  overflow: hidden;
  background: #e2e8f0;
  border: 1px solid #e2e8f0;
}

.photo-thumb-open {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.photo-thumb-open img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #94a3b8;
  font-size: 1.25rem;
  background: #f1f5f9;
}

.photo-thumb-remove {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.photo-thumb:hover .photo-thumb-remove,
.photo-thumb:focus-within .photo-thumb-remove {
  opacity: 1;
}

@media (hover: none) {
  .photo-thumb-remove {
    opacity: 1;
  }
}

@media (max-width: 860px) {
  .card-header {
    padding: 1rem;
  }

  .card-body {
    padding: 1rem;
  }

  .liq-hero .liq-hero-grid {
    padding: 1rem;
  }
}

@media (max-width: 640px) {
  .labor-grid {
    grid-template-columns: 1fr;
  }

  .cost-item {
    flex-direction: column;
  }

}
</style>
