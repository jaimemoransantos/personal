# Firestore collections (multi-tenant / SaaS-ready)

Data is scoped by organization. Each user belongs to one organization (`users.organizationId`).

## Top-level collections

### `organizations`
One document per company/tenant.

| Field        | Type     | Description                    |
|-------------|----------|--------------------------------|
| name        | string   | Organization name              |
| slug        | string?  | URL-friendly identifier        |
| address     | string?  | Dirección                      |
| ruc         | string?  | RUC (tax ID)                   |
| contactPhone| string?  | Número de contacto             |
| email       | string?  | Correo electrónico             |
| createdAt   | timestamp|                                |
| updatedAt   | timestamp|                                |

- Default org id: `default` (see `constants/organization.ts`). Created on first need via `OrganizationService.getOrCreateDefault()`.
- Settings: use a separate collection later (e.g. `organizationSettings/{organizationId}`) if needed, so no `settings` field on the org document.

### `users`
One document per Firebase Auth user. Document ID = Auth `uid`.

| Field          | Type     | Description                    |
|----------------|----------|--------------------------------|
| email          | string   |                                |
| displayName    | string?  |                                |
| photoURL       | string?  |                                |
| **organizationId** | string | Required; tenant this user belongs to |
| createdAt      | timestamp|                                |
| updatedAt      | timestamp|                                |

## Top-level collections (org-scoped by field)

Customers, products, and quotes are **top-level collections**; each document has **organizationId** (and **createdBy** where relevant) so the app and a future admin panel can filter and query by org or user.

### `customers`
Customer (client) records. Query with `where("organizationId", "==", orgId)`. Import via Excel: POST `/api/customers/import-excel` with body `{ base64: "..." }`. Expected format: first two rows are text; **row 3** = column headers, data from row 4. Columns: **Cédula o RUC** → document, **Razón Social** → name, **Teléfonos** → phone (dashes removed, leading 0 added), **Dirección** → address, **Email** → email.

| Field          | Type     | Description |
|----------------|----------|-------------|
| **organizationId** | string | Required; tenant |
| name           | string   |              |
| document       | string   | RUC/Cédula   |
| phone          | string   |              |
| email          | string   |              |
| address        | string   |              |
| createdAt      | timestamp|              |
| updatedAt      | timestamp|              |
| createdBy      | string?  | Firebase Auth uid who created/imported |

### `products`
Product catalog. Query with `where("organizationId", "==", orgId)`. Import via Excel: POST `/api/products/import-excel` with body `{ base64: "..." }`. Excel columns: code/codigo, name/nombre, subtitle/descripcion, price/precio.

| Field          | Type     | Description |
|----------------|----------|-------------|
| **organizationId** | string | Required; tenant |
| code           | string   |              |
| name           | string   |              |
| subtitle       | string   |              |
| price          | number   |              |
| createdAt      | timestamp|              |
| updatedAt      | timestamp|              |
| createdBy      | string?  | Firebase Auth uid |

### `quotes`
Quote documents. Query with `where("organizationId", "==", orgId)`. Create via POST `/api/quotes` with client snapshot, items, discount, validity, deliveryPlace, deliveryTime, paymentMethod, disclaimer, notes.

| Field          | Type     | Description        |
|----------------|----------|--------------------|
| **organizationId** | string | Required; tenant   |
| quoteNumber    | string?  | Número secuencial legible, p.ej. 2026000079 (año + contador por organización) |
| customerId     | string?  | Id of customer doc when quote was created from an existing client (optional) |
| client         | map      | name (required), document, phone, email, address, directedTo, reference, project (all optional) |
| items          | array    | { id, code, name, subtitle, quantity, price } |
| discount       | number   |                    |
| status         | string?  | "pending" \| "accepted" \| "rejected" (default "pending") |
| searchTerms    | string?  | Lowercase client name + reference + project for search; set on create/update |
| validity       | string?  |                    |
| deliveryPlace  | string?  | "" \| "on_site" \| "warehouse" |
| deliveryTime   | string?  |                    |
| paymentMethod  | string?  |                    |
| disclaimer     | string?  |                    |
| notes          | string?  |                    |
| createdAt      | timestamp|                    |
| updatedAt      | timestamp|                    |
| createdBy      | string?  | Firebase Auth uid  |

### `quoteCounters`
Contadores por organización y año para generar números de cotización secuenciales de forma atómica.

| Field          | Type     | Description        |
|----------------|----------|--------------------|
| **organizationId** | string | Tenant al que pertenece el contador |
| year           | number   | Año (por ejemplo 2026) |
| current        | number   | Último número usado para ese año/org |
| updatedAt      | timestamp| Última actualización del contador |

### Future: organization settings
A separate collection keyed by org id (e.g. `organizationSettings/{organizationId}`) can hold per-org config; no `settings` field on the organization document.

## Usage

- **Sync profile**: `POST /api/users/sync-profile` creates/updates the user and ensures `organizationId` (default org if missing).
- **Profile**: `GET /api/users/profile` returns the user profile including `organizationId`.
- **Current org**: `GET /api/organization/current` (after `loadOrganization` middleware) returns the organization for the authenticated user.
- **Org-scoped routes**: Use `authenticate` then `loadOrganization`; use `req.organizationId` to query/write top-level `customers`, `products`, `quotes` with `where("organizationId", "==", req.organizationId)`. Admin panel can query without organizationId to see all data.

### Customers (all require `loadOrganization`)
- `GET /api/customers` – list
- `GET /api/customers/:id` – get one
- `POST /api/customers` – create
- `PUT /api/customers/:id` – update
- `DELETE /api/customers/:id` – delete
- `POST /api/customers/import-excel` – body `{ base64: "..." }` (Excel file)

### Products (all require `loadOrganization`)
- `GET /api/products` – list
- `GET /api/products/:id` – get one
- `POST /api/products` – create
- `PUT /api/products/:id` – update
- `DELETE /api/products/:id` – delete
- `POST /api/products/import-excel` – body `{ base64: "..." }` (Excel file)

### Quotes (all require `loadOrganization`)
- `GET /api/quotes` – list (ordered by updatedAt desc)
- `GET /api/quotes/:id` – get one
- `POST /api/quotes` – create (body: CreateQuoteData; includes organizationId in stored doc)
- `PUT /api/quotes/:id` – update
- `DELETE /api/quotes/:id` – delete
