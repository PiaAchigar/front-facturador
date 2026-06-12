import { useEffect, useMemo, useState } from "react";
import { useCheckout, useProviders, useServices } from "../../api/billing";
import type { Customer, Service } from "../../api/types";
import { CustomerSearch } from "../../components/CustomerSearch";
import { Button, Card, ErrorNote, Input, Spinner } from "../../components/ui";
import { money } from "../../lib/format";

type Item = {
  service: Service;
  quantity: number;
  unitPrice: number;
};

function useDebounced(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function CheckoutPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer" | "mercadopago">("cash");
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [paidToProvider, setPaidToProvider] = useState<string>("");
  const [success, setSuccess] = useState<string | null>(null);

  const debouncedQuery = useDebounced(serviceQuery);
  const services = useServices(debouncedQuery);
  const providers = useProviders();
  const checkout = useCheckout();

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items],
  );

  // Regla del negocio: transferencia ⇒ lleva factura por default
  const onMethodChange = (m: typeof method) => {
    setMethod(m);
    if (m === "bank_transfer" && !paidToProvider) setWantsInvoice(true);
  };

  // Transferido a la profesional ⇒ no se factura a PiuBella
  const onPaidToProviderChange = (providerId: string) => {
    setPaidToProvider(providerId);
    if (providerId) setWantsInvoice(false);
  };

  const addService = (svc: Service) => {
    setItems((prev) => [
      ...prev,
      { service: svc, quantity: 1, unitPrice: svc.unitPriceList ?? 0 },
    ]);
    setServiceQuery("");
  };

  const submit = () => {
    if (!customer) return;
    setSuccess(null);
    checkout.mutate(
      {
        customerId: customer.id,
        items: items.map((i) => ({
          serviceId: i.service.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        payment: {
          method,
          amount: total,
          wantsInvoice,
          paidToProviderId: paidToProvider || undefined,
        },
      },
      {
        onSuccess: (result) => {
          setSuccess(
            result.invoice
              ? "Cobro registrado. La factura quedó en borrador, lista para emitir."
              : "Cobro registrado sin factura.",
          );
          setItems([]);
          setCustomer(null);
          setWantsInvoice(false);
          setPaidToProvider("");
        },
      },
    );
  };

  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="text-3xl font-semibold">Cobranza</h2>
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <CustomerSearch selected={customer} onSelect={setCustomer} />

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Ítems</h3>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="flex-1 text-sm">{item.service.name}</span>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((it, i) =>
                    i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value)) } : it,
                  ),
                )
              }
              className="w-16 rounded-lg border border-surface-highest px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              value={item.unitPrice}
              onChange={(e) =>
                setItems((prev) =>
                  prev.map((it, i) =>
                    i === idx ? { ...it, unitPrice: Number(e.target.value) } : it,
                  ),
                )
              }
              className="w-28 rounded-lg border border-surface-highest px-2 py-1 text-sm"
            />
            <span className="w-24 text-right text-sm font-medium">
              {money(item.unitPrice * item.quantity)}
            </span>
            <Button variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
              ✕
            </Button>
          </div>
        ))}

        <Input
          label="Agregar servicio"
          placeholder="Buscar servicio…"
          value={serviceQuery}
          onChange={(e) => setServiceQuery(e.target.value)}
        />
        {services.isFetching && <Spinner />}
        {services.data?.slice(0, 6).map((svc) => (
          <button
            key={svc.id}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-high"
            onClick={() => addService(svc)}
          >
            {svc.name}{" "}
            <span className="text-ink-soft">
              — {money(svc.unitPriceList)} / efectivo {money(svc.unitPriceCash)}
            </span>
          </button>
        ))}

        <div className="flex justify-between border-t border-surface-high pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold">Pago</h3>
        <div className="flex gap-2">
          {(
            [
              ["cash", "Efectivo"],
              ["bank_transfer", "Transferencia"],
              ["mercadopago", "MercadoPago"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onMethodChange(value)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                method === value
                  ? "border-primary bg-primary text-white"
                  : "border-surface-highest hover:border-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={wantsInvoice}
            disabled={Boolean(paidToProvider)}
            onChange={(e) => setWantsInvoice(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span>
            <strong>Lleva factura</strong> — se conecta con ARCA (podés emitirla ahora o en
            lote más tarde)
          </span>
        </label>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(paidToProvider)}
              onChange={(e) => onPaidToProviderChange(e.target.checked ? "pending" : "")}
              className="h-4 w-4 accent-primary"
            />
            <span>
              <strong>Transferido a la profesional</strong> — el dinero no entró a PiuBella, no
              se factura a nuestro nombre
            </span>
          </label>
          {paidToProvider && (
            <select
              value={paidToProvider}
              onChange={(e) => setPaidToProvider(e.target.value)}
              className="ml-6 rounded-lg border border-surface-highest bg-white px-3 py-1.5 text-sm"
            >
              <option value="pending">Elegir profesional…</option>
              {providers.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          )}
        </div>

        {method === "cash" && !wantsInvoice && !paidToProvider && (
          <p className="rounded-lg bg-surface-high px-3 py-2 text-xs text-ink-soft">
            Efectivo sin tilde de factura: queda registrado en caja como no declarado.
          </p>
        )}

        {checkout.error && <ErrorNote message={(checkout.error as Error).message} />}

        <Button
          onClick={submit}
          disabled={
            checkout.isPending ||
            !customer ||
            items.length === 0 ||
            total <= 0 ||
            paidToProvider === "pending"
          }
        >
          {checkout.isPending ? "Registrando…" : `Cobrar ${money(total)}`}
        </Button>
      </Card>
    </div>
  );
}
