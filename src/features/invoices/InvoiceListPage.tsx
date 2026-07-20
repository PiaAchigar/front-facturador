import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useEmitBatch, useInvoices } from "../../api/billing";
import { Badge, Button, Card, ErrorNote, Input, Spinner } from "../../components/ui";
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

const EMPTY_FILTERS = { status: "", invoiceType: "", from: "", to: "", search: "" };

export function InvoiceListPage() {
  const [status, setStatus] = useState<string>("");
  const [invoiceType, setInvoiceType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const invoices = useInvoices({
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const emitBatch = useEmitBatch();

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // El status y el rango de fechas ya se filtran en el backend; el tipo de
  // comprobante y la búsqueda libre (cliente, DNI o número) se resuelven acá
  // porque no requieren un viaje extra al servidor.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (invoices.data ?? []).filter((inv) => {
      if (invoiceType && inv.invoiceType !== invoiceType) return false;
      if (!term) return true;
      const haystack = [
        inv.customerName,
        inv.customerDni,
        invoiceNumberFmt(2, inv.invoiceNumber),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [invoices.data, invoiceType, search]);

  const drafts = filtered.filter((i) => i.status === "draft");
  const invoiceTypes = useMemo(
    () =>
      [...new Set((invoices.data ?? []).map((i) => i.invoiceType).filter(Boolean))].sort() as string[],
    [invoices.data],
  );
  const filtersActive =
    status !== EMPTY_FILTERS.status ||
    invoiceType !== EMPTY_FILTERS.invoiceType ||
    from !== EMPTY_FILTERS.from ||
    to !== EMPTY_FILTERS.to ||
    search !== EMPTY_FILTERS.search;

  const clearFilters = () => {
    setStatus(EMPTY_FILTERS.status);
    setInvoiceType(EMPTY_FILTERS.invoiceType);
    setFrom(EMPTY_FILTERS.from);
    setTo(EMPTY_FILTERS.to);
    setSearch(EMPTY_FILTERS.search);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold">Facturas</h2>
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

      <Card className="flex flex-wrap items-end gap-3">
        <div className="min-w-50 flex-1">
          <Input
            label="Buscar"
            placeholder="Cliente, DNI o número…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Estado</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="emitted">Emitidas</option>
            <option value="paid">Pagadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Tipo</span>
          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value)}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los tipos</option>
            {invoiceTypes.map((t) => (
              <option key={t} value={t}>
                Factura {t}
              </option>
            ))}
          </select>
        </label>
        <Input
          type="date"
          label="Desde"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="min-w-38"
        />
        <Input
          type="date"
          label="Hasta"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="min-w-38"
        />
        {filtersActive && (
          <Button variant="ghost" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        )}
      </Card>

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
            {filtered.map((inv) => (
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
            {filtered.length === 0 && !invoices.isLoading && (
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
