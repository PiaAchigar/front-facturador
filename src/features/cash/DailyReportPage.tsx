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
                {report.payments.map((p) => (
                  <tr key={p.id} className="border-b border-surface-high last:border-0">
                    <td className="p-3">{formatDateTime(p.paymentDate)}</td>
                    <td className="p-3">
                      {p.customerName ?? "Cobro"}
                      {p.receivedByProviderName && (
                        <span className="text-xs text-amber-700">
                          {" "}
                          (transferido a {p.receivedByProviderName})
                        </span>
                      )}
                    </td>
                    <td className="p-3">{PAYMENT_METHOD_LABELS[p.paymentMethod ?? ""] ?? "—"}</td>
                    <td className="p-3">{p.isDeclared ? "Sí" : "No"}</td>
                    <td className="p-3 text-right font-medium">{money(p.amount)}</td>
                  </tr>
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
