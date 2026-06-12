import { useState } from "react";
import { Link } from "react-router-dom";
import { useEmitBatch, useInvoices } from "../../api/billing";
import { Badge, Button, Card, ErrorNote, Spinner } from "../../components/ui";
import {
  INVOICE_STATUS_LABELS,
  formatDateTime,
  invoiceNumberFmt,
  money,
} from "../../lib/format";

const STATUS_TONES: Record<string, "neutral" | "success" | "warning" | "danger" | "primary"> = {
  draft: "warning",
  emitted: "success",
  paid: "primary",
  cancelled: "danger",
};

export function InvoiceListPage() {
  const [status, setStatus] = useState<string>("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const invoices = useInvoices({ status: status || undefined });
  const emitBatch = useEmitBatch();

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const drafts = invoices.data?.filter((i) => i.status === "draft") ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold">Facturas</h2>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="emitted">Emitidas</option>
            <option value="cancelled">Anuladas</option>
          </select>
          {drafts.length > 0 && (
            <Button
              onClick={() =>
                emitBatch.mutate(checked.size > 0 ? [...checked] : undefined, {
                  onSuccess: () => setChecked(new Set()),
                })
              }
              disabled={emitBatch.isPending}
            >
              {emitBatch.isPending
                ? "Emitiendo…"
                : checked.size > 0
                  ? `Emitir seleccionadas (${checked.size})`
                  : `Emitir todos los borradores (${drafts.length})`}
            </Button>
          )}
        </div>
      </div>

      {emitBatch.data && (
        <Card className="space-y-1 text-sm">
          <h4 className="font-medium">Resultado de la emisión</h4>
          {emitBatch.data.results.map((r) => (
            <p key={r.invoiceId} className={r.ok ? "text-green-700" : "text-red-700"}>
              {r.ok
                ? `✓ Factura ${invoiceNumberFmt(2, r.invoiceNumber ?? null)} — CAE ${r.cae}`
                : `✗ ${r.error}`}
            </p>
          ))}
        </Card>
      )}

      {invoices.isLoading && <Spinner />}
      {invoices.error && <ErrorNote message={(invoices.error as Error).message} />}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high text-left text-xs text-ink-soft">
              <th className="p-3" />
              <th className="p-3">Número</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Fecha</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {invoices.data?.map((inv) => (
              <tr
                key={inv.id}
                className={`border-b border-surface-high last:border-0 ${
                  inv.status === "cancelled" ? "opacity-60" : ""
                }`}
              >
                <td className="p-3">
                  {inv.status === "draft" && (
                    <input
                      type="checkbox"
                      checked={checked.has(inv.id)}
                      onChange={() => toggle(inv.id)}
                      className="h-4 w-4 accent-primary"
                    />
                  )}
                </td>
                <td className="p-3">
                  <Link to={`/facturas/${inv.id}`} className="font-medium text-primary hover:underline">
                    {inv.invoiceType ?? "C"} {invoiceNumberFmt(2, inv.invoiceNumber)}
                  </Link>
                </td>
                <td className="p-3">{inv.customerName ?? "—"}</td>
                <td className="p-3">{formatDateTime(inv.invoiceDate)}</td>
                <td className="p-3 text-right font-medium">{money(inv.totalAmount)}</td>
                <td className="p-3">
                  <Badge tone={STATUS_TONES[inv.status ?? ""] ?? "neutral"}>
                    {INVOICE_STATUS_LABELS[inv.status ?? ""] ?? inv.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {invoices.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink-soft">
                  No hay facturas con este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
