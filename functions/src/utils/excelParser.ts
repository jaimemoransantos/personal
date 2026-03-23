import * as XLSX from "xlsx";

/**
 * Parse an Excel file (first sheet) from buffer.
 * @param buffer - Excel file buffer
 * @param headerRowIndex - 0-based row index where column names are (default 0). E.g. 2 = third row is headers, data starts at fourth row.
 * Returns array of row objects with keys = header values (normalized to lowercase trim).
 */
export function parseExcelToRows(
  buffer: Buffer,
  headerRowIndex = 0
): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];
  if (data.length <= headerRowIndex + 1) return [];
  const headerRow = data[headerRowIndex].map((h) =>
    String(h ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
  );
  const rows: Record<string, string>[] = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < headerRow.length; j++) {
      const key = headerRow[j] || `col_${j}`;
      obj[key] = row?.[j] != null ? String(row[j]).trim() : "";
    }
    rows.push(obj);
  }
  return rows;
}

/** Strip accents for flexible header matching (e.g. "cédula" -> "cedula"). */
function stripAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Normalize header key: collapse spaces, lowercase, for matching. */
function normalizeHeaderKey(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Normalize column value: pick first matching key (case-insensitive, accents ignored, spaces collapsed). */
function getCol(row: Record<string, string>, ...keys: string[]): string {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const norm = normalizeHeaderKey(k);
    const noAccent = stripAccents(norm);
    lower[norm] = v;
    lower[noAccent] = v;
    if (norm) lower[norm.replace(/\s/g, "")] = v;
    if (noAccent) lower[noAccent.replace(/\s/g, "")] = v;
  }
  for (const key of keys) {
    const norm = normalizeHeaderKey(key);
    const noAccent = stripAccents(norm);
    const noSpaces = norm.replace(/\s/g, "");
    const noAccentNoSpaces = noAccent.replace(/\s/g, "");
    const v =
      lower[norm] ??
      lower[noAccent] ??
      lower[noSpaces] ??
      lower[noAccentNoSpaces];
    if (v !== undefined && v !== "") return String(v).trim();
  }
  return "";
}

/**
 * Normalize phone for Ecuador: remove dashes "-", then ensure leading "0".
 * e.g. "98-912-3456" or "989123456" -> "0989123456"
 */
function normalizePhone(phone: string): string {
  const digits = String(phone ?? "")
    .replace(/-/g, "")
    .replace(/\s/g, "")
    .trim();
  if (!digits) return "";
  return digits.startsWith("0") ? digits : `0${digits}`;
}

/** Customer row from Excel. Structure: Cédula o RUC, Razón Social, Teléfonos, Dirección, Email. */
export interface CustomerRow {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
}

/**
 * Map Excel row to customer. Expected columns (as in "Listado de Terceros"):
 * - Cédula o RUC -> document
 * - Razón Social -> name
 * - Teléfonos -> phone (dashes removed, leading 0 added)
 * - Dirección -> address
 * - Email -> email
 */
export function mapRowToCustomer(row: Record<string, string>): CustomerRow {
  const rawPhone = getCol(
    row,
    "telefonos",
    "teléfonos",
    "teléfono",
    "telefono",
    "phone",
    "tel",
    "fono",
    "celular"
  );
  return {
    name: getCol(
      row,
      "razon social",
      "razón social",
      "razonsocial",
      "nombre",
      "name",
      "cliente",
      "tercero",
      "denominacion",
      "denominación"
    ),
    document: getCol(
      row,
      "cedula o ruc",
      "cédula o ruc",
      "cedula o ruc",
      "cedulaoruc",
      "document",
      "documento",
      "ruc",
      "cedula",
      "cédula",
      "identificacion",
      "identificación",
      "ruc/cedula",
      "cedula/ruc"
    ),
    phone: normalizePhone(rawPhone),
    email: (() => {
      const raw = getCol(
        row,
        "email",
        "correo",
        "mail",
        "e-mail",
        "correo electronico",
        "correo electrónico"
      );
      if (!raw) return "";
      const first = raw.split(/[;,]/)[0];
      return first ? first.trim() : "";
    })(),
    address: getCol(
      row,
      "direccion",
      "dirección",
      "address",
      "dir",
      "domicilio"
    ),
  };
}

/** Expected product columns: code, name, subtitle, price */
export interface ProductRow {
  code: string;
  name: string;
  subtitle: string;
  price: number;
}

export function mapRowToProduct(row: Record<string, string>): ProductRow {
  const priceStr = getCol(row, "price", "precio", "precio unitario");
  const price = parseFloat(priceStr) || 0;
  return {
    code: getCol(row, "code", "codigo", "código").trim().toUpperCase(),
    name: getCol(row, "name", "nombre", "producto"),
    subtitle: getCol(row, "subtitle", "subtitulo", "subtítulo", "descripcion", "descripción"),
    price,
  };
}
