import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  CashMovement,
  CheckoutResult,
  CommissionsReport,
  Customer,
  DailyReport,
  EmitBatchResult,
  InvoiceDetail,
  InvoiceSummary,
  Provider,
  Service,
} from "./types";

export function useCustomerSearch(q: string) {
  return useQuery({
    queryKey: ["customers", q],
    queryFn: () => api<Customer[]>(`/api/billing/customers?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: (data: { name: string; dni: string; phone?: string; email?: string }) =>
      api<Customer>("/api/billing/customers", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useCustomerInvoices(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-invoices", customerId],
    queryFn: () => api<InvoiceSummary[]>(`/api/billing/customers/${customerId}/invoices`),
    enabled: Boolean(customerId),
  });
}

export function useServices(q: string) {
  return useQuery({
    queryKey: ["services", q],
    queryFn: () => api<Service[]>(`/api/agenda/services?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => api<Provider[]>("/api/agenda/providers"),
    staleTime: 5 * 60 * 1000,
  });
}

export type CheckoutInput = {
  customerId: string;
  appointmentId?: string;
  items: {
    serviceId?: string;
    productId?: string;
    quantity: number;
    unitPrice?: number;
    priceMode?: "list" | "cash";
  }[];
  payment: {
    method: "cash" | "bank_transfer" | "mercadopago";
    amount: number;
    wantsInvoice: boolean;
    paidToProviderId?: string;
  };
  notes?: string;
};

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckoutInput) =>
      api<CheckoutResult>("/api/billing/checkout", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
    },
  });
}

export function useInvoices(filters: { status?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => api<InvoiceSummary[]>(`/api/billing/invoices${qs ? `?${qs}` : ""}`),
  });
}

export function useInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api<InvoiceDetail>(`/api/billing/invoices/${id}`),
    enabled: Boolean(id),
  });
}

export function useEmitInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<InvoiceSummary>(`/api/billing/invoices/${id}/emit`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
    },
  });
}

export function useEmitBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceIds?: string[]) =>
      api<EmitBatchResult>("/api/billing/invoices/emit-batch", {
        method: "POST",
        body: JSON.stringify({ invoiceIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api<InvoiceSummary>(`/api/billing/invoices/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice"] });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
    },
  });
}

export function useCashMovements(date: string) {
  return useQuery({
    queryKey: ["cash", date],
    queryFn: () => api<CashMovement[]>(`/api/billing/cash-register?date=${date}`),
  });
}

export function useAddCashMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      amount: number;
      source: "deposit" | "refund" | "other";
      description: string;
      isDeclared: boolean;
    }) => api<CashMovement>("/api/billing/cash-register", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report"] });
    },
  });
}

export function useDailyReport(date: string) {
  return useQuery({
    queryKey: ["daily-report", date],
    queryFn: () => api<DailyReport>(`/api/billing/cash-register/daily-report?date=${date}`),
  });
}

export function useCommissions(from: string, to: string, providerId?: string) {
  const params = new URLSearchParams({ from, to });
  if (providerId) params.set("providerId", providerId);
  return useQuery({
    queryKey: ["commissions", from, to, providerId],
    queryFn: () => api<CommissionsReport>(`/api/billing/commissions?${params}`),
  });
}
