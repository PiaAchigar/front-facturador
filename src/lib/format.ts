export function money(n: number | null | undefined): string {
  return `$${(n ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Número de comprobante estilo ARCA: 0002-00009929 */
export function invoiceNumberFmt(pos: number, n: number | null): string {
  if (n == null) return "—";
  return `${String(pos).padStart(4, "0")}-${String(n).padStart(8, "0")}`;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  mercadopago: "MercadoPago",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  emitted: "Emitida",
  paid: "Pagada",
  cancelled: "ANULADA",
};
