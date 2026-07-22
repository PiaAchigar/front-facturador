import { useEffect, useMemo, useRef, useState } from "react";
import { useAppointment, useCheckout, useCustomer, useProviders, useServices } from "../../api/billing";
import type { Customer, Service } from "../../api/types";
import { CustomerSearch } from "../../components/CustomerSearch";
import { Button, Card, ErrorNote, Input, Spinner } from "../../components/ui";
import { money } from "../../lib/format";

type Item = {
  service: Service;
  quantity: number;
  unitPrice: number;
  /** false ⇒ este ítem no va a la factura ARCA (queda como cobro no declarado). */
  billable: boolean;
};

function useDebounced(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Turno que la agenda pidió cobrar, si se llegó por handoff desde el dashboard. */
function handoffFromUrl(): { appointmentId: string; customerId: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const appointmentId = params.get("appointmentId");
  const customerId = params.get("customerId");
  return appointmentId && customerId ? { appointmentId, customerId } : null;
}

export function CheckoutPage() {
  const [handoff] = useState(handoffFromUrl);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [appointmentId, setAppointmentId] = useState<string | null>(handoff?.appointmentId ?? null);
  const [serviceQuery, setServiceQuery] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer" | "mercadopago">("cash");
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [paidToProvider, setPaidToProvider] = useState<string>("");
  const [success, setSuccess] = useState<string | null>(null);

  const debouncedQuery = useDebounced(serviceQuery);
  const services = useServices(debouncedQuery);
  const providers = useProviders();
  const checkout = useCheckout();
  const handoffCustomer = useCustomer(handoff?.customerId ?? null);
  const handoffAppointment = useAppointment(handoff?.appointmentId ?? null);

  // Precarga cliente + ítem del turno una sola vez, cuando llegan los datos
  // (viene de "Cobrar" en la agenda). Si el turno no tiene precio o ya se usó
  // el prefill, no hace nada.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !handoff) return;
    if (!handoffCustomer.data || !handoffAppointment.data) return;
    prefilled.current = true;
    setCustomer(handoffCustomer.data);
    const appt = handoffAppointment.data;
    if (appt.serviceId) {
      // La seña ya se cobró y facturó al reservar: acá se cobra solo el resto.
      const remaining = Math.max(0, (appt.servicePrice ?? 0) - (appt.depositPaid ?? 0));
      setItems((prev) => [
        ...prev,
        {
          service: {
            id: appt.serviceId,
            name: appt.serviceName,
            unitPriceList: null,
            unitPriceCash: null,
            estimatedDurationMinutes: null,
          },
          quantity: 1,
          unitPrice: remaining,
          billable: true,
        },
      ]);
    }
    setWantsInvoice(true);
  }, [handoff, handoffCustomer.data, handoffAppointment.data]);

  // Desglose de la comisión de la proveedora en el turno vinculado (si hay).
  const linkedProviderEarning = handoffAppointment.data?.providerEarning ?? null;
  const linkedProviderName = handoffAppointment.data?.providerName ?? null;
  const linkedEarningIsPreview = handoffAppointment.data?.providerEarningIsPreview ?? false;
  const linkedDeposit = handoffAppointment.data?.depositPaid ?? 0;

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
      { service: svc, quantity: 1, unitPrice: svc.unitPriceCash ?? 0, billable: true },
    ]);
    setServiceQuery("");
  };

  const submit = () => {
    if (!customer) return;
    setSuccess(null);
    checkout.mutate(
      {
        customerId: customer.id,
        appointmentId: appointmentId ?? undefined,
        items: items.map((i) => ({
          serviceId: i.service.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          billable: i.billable,
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
          setAppointmentId(null);
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
      {handoff && !prefilled.current && (handoffCustomer.isLoading || handoffAppointment.isLoading) && (
        <Spinner />
      )}
      {handoff && (handoffCustomer.error || handoffAppointment.error) && (
        <ErrorNote message="No se pudo cargar el turno a cobrar. Buscá el cliente manualmente." />
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
            {wantsInvoice && (
              <label
                className="flex items-center gap-1 text-xs text-ink-soft"
                title="Si está tildado, este ítem entra en la factura ARCA; si no, queda como cobro no declarado"
              >
                <input
                  type="checkbox"
                  checked={item.billable}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, billable: e.target.checked } : it,
                      ),
                    )
                  }
                  className="h-4 w-4 accent-primary"
                />
                ARCA
              </label>
            )}
            <Button variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
              ✕
            </Button>
          </div>
        ))}

        {linkedDeposit > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            Seña a favor: <strong>{money(linkedDeposit)}</strong> (ya cobrada y facturada al
            reservar). El ítem viene precargado con el resto a cobrar.
          </div>
        )}
        {linkedProviderEarning != null && linkedProviderEarning > 0 && (
          <div className="rounded-lg bg-surface-high px-3 py-2 text-xs text-ink-soft">
            De este cobro, <strong className="text-ink">{money(linkedProviderEarning)}</strong> son
            la comisión de {linkedProviderName ?? "la profesional"}
            {linkedEarningIsPreview ? " (estimada, se congela al cobrar)" : ""}. Es solo
            informativo: la factura sale por el precio completo.
          </div>
        )}

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
