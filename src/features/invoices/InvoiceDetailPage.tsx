import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCancelInvoice, useEmitInvoice, useInvoiceDetail } from "../../api/billing";
import { Badge, Button, Card, ErrorNote, Modal, Spinner } from "../../components/ui";
import {
  INVOICE_STATUS_LABELS,
  formatDateTime,
  invoiceNumberFmt,
  money,
} from "../../lib/format";

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading, error } = useInvoiceDetail(id ?? null);
  const emit = useEmitInvoice();
  const cancel = useCancelInvoice();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote message={(error as Error).message} />;
  if (!invoice) return null;

  const lastCae = invoice.arcaLogs.filter((l) => l.status === "success").pop();

  return (
    <div className="max-w-3xl space-y-5">
      <Link to="/facturas" className="text-sm text-primary hover:underline">
        ← Volver a facturas
      </Link>

      {invoice.status === "cancelled" && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-lg font-bold tracking-widest text-red-700">
          ANULADO
        </div>
      )}

      <Card className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-semibold">
              Factura {invoice.invoiceType ?? "C"} {invoiceNumberFmt(2, invoice.invoiceNumber)}
            </h2>
            <p className="text-sm text-ink-soft">
              {invoice.customerName ?? "Consumidor final"}
              {invoice.customerDni ? ` · DNI ${invoice.customerDni}` : ""}
            </p>
          </div>
          <Badge tone={invoice.status === "cancelled" ? "danger" : invoice.status === "draft" ? "warning" : "success"}>
            {INVOICE_STATUS_LABELS[invoice.status ?? ""] ?? invoice.status}
          </Badge>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high text-left text-xs text-ink-soft">
              <th className="py-2">Concepto</th>
              <th className="py-2 text-right">Cant.</th>
              <th className="py-2 text-right">Precio unit.</th>
              <th className="py-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li) => (
              <tr key={li.id} className="border-b border-surface-high last:border-0">
                <td className="py-2">{li.serviceName ?? li.productName ?? "—"}</td>
                <td className="py-2 text-right">{li.quantity}</td>
                <td className="py-2 text-right">{money(li.unitPrice)}</td>
                <td className="py-2 text-right">{money(li.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end text-lg font-semibold">
          Total {money(invoice.totalAmount)}
        </div>

        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-surface-high p-4 text-sm">
          <dt className="text-ink-soft">Fecha</dt>
          <dd>{formatDateTime(invoice.invoiceDate)}</dd>
          <dt className="text-ink-soft">Emitida (ARCA)</dt>
          <dd>{formatDateTime(invoice.emittedAt)}</dd>
          <dt className="text-ink-soft">CAE</dt>
          <dd className="font-mono">{lastCae?.cae ?? "—"}</dd>
          <dt className="text-ink-soft">Vto. CAE</dt>
          <dd>{formatDateTime(lastCae?.caeExpiry ?? null)}</dd>
        </dl>

        {(emit.error || cancel.error) && (
          <ErrorNote message={((emit.error ?? cancel.error) as Error).message} />
        )}

        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button onClick={() => emit.mutate(invoice.id)} disabled={emit.isPending}>
              {emit.isPending ? "Pidiendo CAE…" : "Emitir (pedir CAE)"}
            </Button>
          )}
          {invoice.status !== "cancelled" && (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Anular comprobante
            </Button>
          )}
        </div>
      </Card>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Anular comprobante">
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            {invoice.status === "draft"
              ? "El borrador se marcará como anulado."
              : "Se emitirá una nota de crédito en ARCA y el comprobante quedará visible como ANULADO."}
          </p>
          <input
            placeholder="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-surface-highest px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              disabled={cancel.isPending}
              onClick={() =>
                cancel.mutate(
                  { id: invoice.id, reason: reason || undefined },
                  { onSuccess: () => setConfirmCancel(false) },
                )
              }
            >
              {cancel.isPending ? "Anulando…" : "Confirmar anulación"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Volver
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
