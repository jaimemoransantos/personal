/**
 * Formato de moneda consistente en la app:
 * coma para miles, punto para decimales (ej. $1,234.56).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Normaliza string de input: comas por punto (para que el usuario pueda escribir "12,50").
 * No redondea; útil mientras se escribe.
 */
export function normalizeDecimalString(input: string): string {
  return String(input).trim().replace(/,/g, ".");
}

/**
 * Parsea un valor de input: reemplaza comas por punto y devuelve número con 2 decimales.
 * Para cantidad, precio unitario y descuento (siempre 2 decimales en BD).
 */
export function parseDecimal(
  input: string | number | null | undefined,
): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") {
    return Number.isNaN(input) ? 0 : Math.round(input * 100) / 100;
  }
  const normalized = normalizeDecimalString(input);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}
