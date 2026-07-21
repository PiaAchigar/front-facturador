export type Customer = {
  id: string;
  name: string | null;
  dni: string | null;
  phone: string | null;
  email: string | null;
};

export type Service = {
  id: string;
  name: string | null;
  unitPriceList: number | null;
  unitPriceCash: number | null;
  estimatedDurationMinutes: number | null;
};

export type Provider = {
  id: string;
  fullName: string | null;
};

export type AppointmentForCheckout = {
  id: string;
  status: string | null;
  servicePrice: number | null;
  customerId: string | null;
  customerName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  providerId: string | null;
  providerName: string | null;
  providerPaymentType: string | null;
  providerRate: number | null;
  /** Comisión de la proveedora sobre este turno (congelada si ya se completó, estimada si no). */
  providerEarning: number | null;
  providerEarningIsPreview: boolean;
};

export type InvoiceSummary = {
  id: string;
  invoiceNumber: number | null;
  invoiceType: string | null;
  subtotal: number | null;
  totalAmount: number | null;
  status: string | null;
  invoiceDate: string | null;
  emittedAt: string | null;
  customerId: string | null;
  customerName: string | null;
  customerDni: string | null;
};

export type InvoiceDetail = InvoiceSummary & {
  lineItems: {
    id: string;
    quantity: number | null;
    unitPrice: number | null;
    subtotal: number | null;
    totalAmount: number | null;
    serviceName: string | null;
    productName: string | null;
  }[];
  arcaLogs: {
    id: string;
    cae: string | null;
    caeExpiry: string | null;
    arcaResponseCode: string | null;
    status: string | null;
    createdAt: string | null;
  }[];
};

export type Payment = {
  id: string;
  amount: number | null;
  paymentMethod: string | null;
  status: string | null;
  paymentDate: string | null;
  isDeclared: boolean | null;
  invoiceNumber: number | null;
  customerName: string | null;
  receivedByProviderName: string | null;
  appointmentId: string | null;
  /** Si el cobro vino de un turno, cuánto de este monto es comisión de la proveedora. */
  appointmentProviderName: string | null;
  appointmentProviderEarning: number | null;
};

export type CashMovement = {
  id: string;
  paymentId: string | null;
  amount: number | null;
  source: string | null;
  description: string | null;
  isDeclared: boolean | null;
  registrationDate: string | null;
};

export type DailyReport = {
  date: string;
  payments: Payment[];
  cashMovements: CashMovement[];
  totalsByMethod: { cash: number; bank_transfer: number; mercadopago: number };
  declared: number;
  undeclared: number;
  paidToProviders: number;
  grandTotal: number;
};

export type CommissionsReport = {
  from: string;
  to: string;
  rows: {
    appointmentId: string;
    date: string | null;
    customerName: string | null;
    serviceName: string | null;
    servicePrice: number;
    providerId: string | null;
    providerName: string | null;
    paymentType: string | null;
    rate: number;
    earning: number;
  }[];
  totalsByProvider: { providerId: string; name: string; total: number }[];
};

export type EmitBatchResult = {
  results: {
    invoiceId: string;
    ok: boolean;
    cae?: string;
    invoiceNumber?: number;
    error?: string;
  }[];
};

export type CheckoutResult = {
  payment: Payment;
  invoice: InvoiceSummary | null;
  cashMovement: CashMovement | null;
};
