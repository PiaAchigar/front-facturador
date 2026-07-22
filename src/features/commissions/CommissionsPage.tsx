import { useState } from "react";
import { useCommissions, useProviders } from "../../api/billing";
import { Button, Card, ErrorNote, Spinner } from "../../components/ui";
import { formatDateTime, money, todayLocal } from "../../lib/format";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  per_hour: "Por hora",
  percentage: "Porcentaje",
  fixed_per_service: "Monto fijo",
};

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CommissionsPage() {
  const today = todayLocal();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [providerId, setProviderId] = useState("");
  const providers = useProviders();
  const report = useCommissions(from, to, providerId || undefined);

  const presets = [
    { label: "Hoy", apply: () => (setFrom(today), setTo(today)) },
    { label: "Última quincena", apply: () => (setFrom(shiftDays(today, -14)), setTo(today)) },
    { label: "Último mes", apply: () => (setFrom(shiftDays(today, -30)), setTo(today)) },
  ];

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h2 className="text-3xl font-semibold">Comisiones</h2>
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimir para firma
        </Button>
      </div>

      <Card className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-ink-soft">Profesional</span>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {providers.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          {presets.map((preset) => (
            <Button key={preset.label} variant="ghost" onClick={preset.apply}>
              {preset.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">PiuBella — Liquidación de comisiones</h1>
        <p className="text-sm">
          Período: {from} al {to}
        </p>
      </div>

      {report.isLoading && <Spinner />}
      {report.error && <ErrorNote message={(report.error as Error).message} />}

      {report.data && (
        <>
          <Card className="p-0 print:border-0 print:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high text-left text-xs text-ink-soft">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Profesional</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Servicio</th>
                  <th className="p-3 text-right">Precio</th>
                  <th className="p-3">Modalidad</th>
                  <th className="p-3 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {report.data.rows.map((row) => (
                  <tr key={row.appointmentId} className="border-b border-surface-high last:border-0">
                    <td className="p-3">{formatDateTime(row.date)}</td>
                    <td className="p-3">{row.providerName}</td>
                    <td className="p-3">{row.customerName}</td>
                    <td className="p-3">{row.serviceName}</td>
                    <td className="p-3 text-right">{money(row.servicePrice)}</td>
                    <td className="p-3">
                      {PAYMENT_TYPE_LABELS[row.paymentType ?? ""] ?? "—"}
                      {row.paymentType === "percentage" ? ` ${row.rate}%` : ""}
                    </td>
                    <td className="p-3 text-right font-medium">{money(row.earning)}</td>
                  </tr>
                ))}
                {report.data.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-ink-soft">
                      Sin turnos completados con comisión en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {report.data.settlement.length > 0 && (
            <Card className="p-0">
              <h4 className="p-3 pb-0 font-medium">Rendición por profesional</h4>
              <p className="px-3 pt-1 text-xs text-ink-soft">
                Comisiones ganadas menos lo que cada profesional ya cobró directo (transferencias
                que no entraron a PiuBella). Saldo positivo: PiuBella le paga. Saldo negativo:
                cobró de más y debe la diferencia.
              </p>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-high text-left text-xs text-ink-soft">
                    <th className="p-3">Profesional</th>
                    <th className="p-3 text-right">Comisiones</th>
                    <th className="p-3 text-right">Cobrado directo</th>
                    <th className="p-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.settlement.map((s) => (
                    <tr key={s.providerId} className="border-b border-surface-high last:border-0">
                      <td className="p-3">{s.name}</td>
                      <td className="p-3 text-right">{money(s.commissions)}</td>
                      <td className="p-3 text-right">{money(s.receivedDirect)}</td>
                      <td
                        className={`p-3 text-right font-semibold ${
                          s.balance < 0 ? "text-red-700" : ""
                        }`}
                      >
                        {money(s.balance)}
                        <span className="block text-[10px] font-normal text-ink-soft">
                          {s.balance >= 0 ? "a pagar" : "a favor de PiuBella"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mx-3 mt-8 mb-3 hidden border-t border-ink pt-2 text-sm print:block">
                Firma de conformidad: ______________________________
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
