import { useEffect, useState } from "react";
import { useCreateCustomer, useCustomerSearch } from "../api/billing";
import type { Customer } from "../api/types";
import { Button, Card, ErrorNote, Input, Spinner } from "./ui";

function useDebounced(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function CustomerSearch({
  selected,
  onSelect,
}: {
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", dni: "", phone: "" });
  const debounced = useDebounced(query);
  const search = useCustomerSearch(debounced);
  const create = useCreateCustomer();

  if (selected) {
    return (
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-medium">{selected.name}</p>
          <p className="text-xs text-ink-soft">
            DNI {selected.dni ?? "—"} · {selected.phone ?? "sin teléfono"}
          </p>
        </div>
        <Button variant="ghost" onClick={() => onSelect(null)}>
          Cambiar
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        label="Cliente (nombre, DNI o teléfono)"
        placeholder="Buscar…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {search.isFetching && <Spinner />}
      {search.data?.map((customer) => (
        <Card key={customer.id} className="transition-shadow hover:shadow-md">
          <button className="w-full text-left" onClick={() => onSelect(customer)}>
            <p className="font-medium">{customer.name}</p>
            <p className="text-xs text-ink-soft">DNI {customer.dni ?? "—"}</p>
          </button>
        </Card>
      ))}
      {!showNew ? (
        <Button variant="secondary" onClick={() => setShowNew(true)}>
          + Cliente nuevo
        </Button>
      ) : (
        <Card className="space-y-3">
          <Input
            label="Nombre y apellido *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="DNI *"
            inputMode="numeric"
            value={form.dni}
            onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, "") })}
          />
          <Input
            label="Celular"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          {create.error && <ErrorNote message={(create.error as Error).message} />}
          <div className="flex gap-2">
            <Button
              onClick={() =>
                create.mutate(
                  { name: form.name, dni: form.dni, phone: form.phone || undefined },
                  { onSuccess: onSelect },
                )
              }
              disabled={create.isPending || form.name.length < 2 || !/^\d{7,8}$/.test(form.dni)}
            >
              Crear y usar
            </Button>
            <Button variant="ghost" onClick={() => setShowNew(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
