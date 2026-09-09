import { Fragment, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDailyReport } from "../../api/billing";
import { Button, Card, ErrorNote, Spinner } from "../../components/ui";
import {
  PAYMENT_METHOD_LABELS,
  formatDateTime,
  money,
  todayLocal,
} from "../../lib/format";

export function DailyReportPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? todayLocal();
  const { data: report, isLoading, error } = useDailyReport(date);

  // Los cobros se agrupan por cliente: una cobranza mixta (parte facturada a
  // ARCA, parte no) genera dos pagos, y sueltos costaba ver que eran del mismo.
  const groups = useMemo(() => {
    type Row = NonNullable<typeof report>["payments"][number];
    const map = new Map<string, { name: string; payments: Row[] }>();
    for (const p of report?.payments ?? []) {
      const key = p.customerId ?? p.customerName ?? "sin-cliente";
      const entry = map.get(key) ?? { name: p.customerName ?? "Sin cliente", payments: [] };
      entry.payments.push(p);
      map.set(key, entry);
    }
    return [...map.values()];
  }, [report]);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link to="/caja" className="text-sm text-primary hover:underline">
            ← Volver a caja
          </Link>
          <h2 className="text-3xl font-semibold">Rendición de caja</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setParams({ date: e.target.value })}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          />
          <Button onClick={() => window.print()}>Imprimir</Button>
        </div>
      </div>

      {/* Encabezado visible solo al imprimir */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">PiuBella — Rendición de caja</h1>
        <p className="text-sm">Fecha: {date}</p>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorNote message={(error as Error).message} />}

      {report && (
        <>
          <Card className="p-0 print:border-0 print:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-left text-xs text-ink-soft">
                  <th className="p-3">Hora</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Método</th>
                  <th className="p-3">Declarado</th>
                  <th className="p-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.name}>
                    {/* Encabezado del cliente: agrupa sus cobros del día */}
                    <tr className="border-b border-surface-high bg-surface-high/60">
                      <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-ink">
                        {group.name}
                        {group.payments.length > 1 && (
                          <span className="ml-2 font-normal text-ink-soft">
                            {group.payments.length} cobros ·{" "}
                            {money(group.payments.reduce((s, p) => s + (p.amount ?? 0), 0))}
                          </span>
                        )}
                      </td>
                    </tr>
                    {group.payments.map((p) => (
                      <tr key={p.id} className="border-b border-surface-high last:border-0">
                        <td className="p-3">{formatDateTime(p.paymentDate)}</td>
                        <td className="p-3">
                          {/* Sin factura a ARCA no es un cobro declarado: es un recibo */}
                          <span className="font-medium">{p.isDeclared ? "Cobro" : "Recibo"}</span>
                          {p.items.length > 0 && (
                            <span className="text-ink-soft"> · {p.items.join(", ")}</span>
                          )}
                          {p.receivedByProviderName && (
                            <span className="text-xs text-amber-700">
                              {" "}
                              (transferido a {p.receivedByProviderName})
                            </span>
                          )}
                          {p.appointmentProviderEarning != null &&
                            p.appointmentProviderEarning > 0 && (
                              <span className="block text-xs text-ink-soft">
                                de esto, {money(p.appointmentProviderEarning)} son de{" "}
                                {p.appointmentProviderName ?? "la profesional"}
                              </span>
                            )}
                        </td>
                        <td className="p-3">
                          {PAYMENT_METHOD_LABELS[p.paymentMethod ?? ""] ?? "—"}
                        </td>
                        <td className="p-3">{p.isDeclared ? "Sí" : "No"}</td>
                        <td className="p-3 text-right font-medium">{money(p.amount)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {report.cashMovements
                  .filter((m) => !m.paymentId)
                  .map((m) => (
                    <tr key={m.id} className="border-b border-surface-high last:border-0">
                      <td className="p-3">{formatDateTime(m.registrationDate)}</td>
                      <td className="p-3">{m.description}</td>
                      <td className="p-3">Efectivo (manual)</td>
                      <td className="p-3">{m.isDeclared ? "Sí" : "No"}</td>
                      <td className="p-3 text-right font-medium">{money(m.amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <h4 className="mb-2 font-medium">Totales por método</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Efectivo</dt>
                  <dd className="font-medium">{money(report.totalsByMethod.cash)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Transferencia</dt>
                  <dd className="font-medium">{money(report.totalsByMethod.bank_transfer)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">MercadoPago</dt>
                  <dd className="font-medium">{money(report.totalsByMethod.mercadopago)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Débito</dt>
                  <dd className="font-medium">{money(report.totalsByMethod.debit_card)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Crédito</dt>
                  <dd className="font-medium">{money(report.totalsByMethod.credit_card)}</dd>
                </div>
              </dl>
            </Card>
            <Card>
              <h4 className="mb-2 font-medium">Resumen</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Declarado</dt>
                  <dd className="font-medium">{money(report.declared)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">No declarado</dt>
                  <dd className="font-medium">{money(report.undeclared)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Transferido a profesionales</dt>
                  <dd className="font-medium">{money(report.paidToProviders)}</dd>
                </div>
                <div className="flex justify-between border-t border-surface-high pt-1 text-base">
                  <dt className="font-medium">Total caja</dt>
                  <dd className="font-semibold">{money(report.grandTotal)}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
