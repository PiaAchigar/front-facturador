import { useState } from "react";
import { useDayStatus } from "../../api/billing";
import { Badge, Card, ErrorNote, Spinner } from "../../components/ui";
import { formatDateTime, money, todayLocal } from "../../lib/format";

const STATUS_LABELS: Record<string, { label: string; tone: "primary" | "success" | "warning" }> = {
  reserved: { label: "Reserva", tone: "warning" },
  scheduled: { label: "Agendado", tone: "primary" },
  completed: { label: "Completado", tone: "success" },
  no_show: { label: "Ausente", tone: "warning" },
};

/**
 * Estado de cuenta de los clientes del día: cuánto señó cada uno (a favor),
 * cuánto pagó en total y cuánto le falta. Para recepción, de un vistazo.
 */
export function DayStatusPage() {
  const [date, setDate] = useState(todayLocal());
  const report = useDayStatus(date);

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold">Cuentas del día</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
        />
      </div>

      {report.isLoading && <Spinner />}
      {report.error && <ErrorNote message={(report.error as Error).message} />}

      {report.data && (
        <>
          <Card className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-left text-xs text-ink-soft">
                  <th className="p-3">Hora</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Servicio</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Precio</th>
                  <th className="p-3 text-right">Seña a favor</th>
                  <th className="p-3 text-right">Pagado</th>
                  <th className="p-3 text-right">Falta cobrar</th>
                </tr>
              </thead>
              <tbody>
                {report.data.rows.map((row) => {
                  const status = STATUS_LABELS[row.status ?? ""];
                  return (
                    <tr key={row.appointmentId} className="border-b border-surface-high last:border-0">
                      <td className="p-3">{formatDateTime(row.appointmentStart)}</td>
                      <td className="p-3">
                        {row.customerName ?? "—"}
                        <span className="block text-xs text-ink-soft">{row.providerName}</span>
                      </td>
                      <td className="p-3">{row.serviceName}</td>
                      <td className="p-3">
                        {status ? <Badge tone={status.tone}>{status.label}</Badge> : row.status}
                      </td>
                      <td className="p-3 text-right">{money(row.servicePrice)}</td>
                      <td className="p-3 text-right">
                        {row.depositPaid > 0 ? (
                          <span className="font-medium text-green-700">{money(row.depositPaid)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-right">{money(row.totalPaid)}</td>
                      <td className="p-3 text-right font-semibold">
                        {row.balanceDue > 0 ? money(row.balanceDue) : "✓"}
                      </td>
                    </tr>
                  );
                })}
                {report.data.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-ink-soft">
                      Sin turnos este día.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card>
            <dl className="flex flex-wrap justify-between gap-4 text-sm">
              <div>
                <dt className="text-ink-soft">Señado (a favor de clientes)</dt>
                <dd className="text-lg font-semibold text-green-700">
                  {money(report.data.totals.deposits)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Pagado total</dt>
                <dd className="text-lg font-semibold">{money(report.data.totals.paid)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Falta cobrar</dt>
                <dd className="text-lg font-semibold">{money(report.data.totals.due)}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}
    </div>
  );
}
