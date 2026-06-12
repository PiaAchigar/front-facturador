import { useState } from "react";
import { Link } from "react-router-dom";
import { useAddCashMovement, useCashMovements } from "../../api/billing";
import { Badge, Button, Card, ErrorNote, Input, Spinner } from "../../components/ui";
import { formatDateTime, money, todayLocal } from "../../lib/format";

const SOURCE_LABELS: Record<string, string> = {
  customer_payment: "Cobro a cliente",
  deposit: "Depósito",
  refund: "Reembolso",
  other: "Otro",
};

export function CashRegisterPage() {
  const [date, setDate] = useState(todayLocal());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    source: "other" as "deposit" | "refund" | "other",
    description: "",
    isDeclared: false,
  });
  const movements = useCashMovements(date);
  const add = useAddCashMovement();

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold">Caja</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
          />
          <Link to={`/caja/rendicion?date=${date}`}>
            <Button variant="secondary">Rendición del día</Button>
          </Link>
        </div>
      </div>

      <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cerrar" : "+ Movimiento manual"}
      </Button>

      {showForm && (
        <Card className="space-y-3">
          <Input
            label="Monto (negativo para egresos)"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">Tipo</span>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as typeof form.source })}
              className="w-full rounded-xl border border-surface-highest bg-white px-3 py-2 text-sm"
            >
              <option value="deposit">Depósito</option>
              <option value="refund">Reembolso</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDeclared}
              onChange={(e) => setForm({ ...form, isDeclared: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Declarado
          </label>
          {add.error && <ErrorNote message={(add.error as Error).message} />}
          <Button
            disabled={add.isPending || !form.amount || !form.description}
            onClick={() =>
              add.mutate(
                {
                  amount: Number(form.amount),
                  source: form.source,
                  description: form.description,
                  isDeclared: form.isDeclared,
                },
                {
                  onSuccess: () => {
                    setShowForm(false);
                    setForm({ amount: "", source: "other", description: "", isDeclared: false });
                  },
                },
              )
            }
          >
            Registrar movimiento
          </Button>
        </Card>
      )}

      {movements.isLoading && <Spinner />}
      {movements.error && <ErrorNote message={(movements.error as Error).message} />}

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-high text-left text-xs text-ink-soft">
              <th className="p-3">Hora</th>
              <th className="p-3">Descripción</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Declarado</th>
              <th className="p-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {movements.data?.map((m) => (
              <tr key={m.id} className="border-b border-surface-high last:border-0">
                <td className="p-3">{formatDateTime(m.registrationDate)}</td>
                <td className="p-3">{m.description}</td>
                <td className="p-3">{SOURCE_LABELS[m.source ?? ""] ?? m.source}</td>
                <td className="p-3">
                  <Badge tone={m.isDeclared ? "success" : "warning"}>
                    {m.isDeclared ? "Sí" : "No"}
                  </Badge>
                </td>
                <td className="p-3 text-right font-medium">{money(m.amount)}</td>
              </tr>
            ))}
            {movements.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-ink-soft">
                  Sin movimientos de caja este día.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
