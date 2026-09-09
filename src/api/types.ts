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

export type Issuer = {
  id: string;
  name: string | null;
  cuit: string | null;
  environment: string | null;
  pointOfSale: number | null;
  invoiceType: string | null;
  isActive: boolean | null;
  isDefault: boolean | null;
  notes: string | null;
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
  /** Seña ya pagada (y facturada) al reservar: queda a favor del cliente. */
  depositPaid: number;
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
  /** Facturador con el que se emite (null en facturas previas al multi-facturador). */
  issuerId: string | null;
  issuerName: string | null;
  issuerCuit: string | null;
};

export type InvoiceDetail = InvoiceSummary & {
  lineItems: {
    id: string;
    /** Concepto propio de la línea (ej: "Seña de servicio: X"); si es null se cae al nombre del servicio. */
    description: string | null;
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
  customerId: string | null;
  /** Servicios/productos cobrados en este pago (incluye los NO facturados). */
  items: string[];
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
  totalsByMethod: {
    cash: number;
    bank_transfer: number;
    mercadopago: number;
    // Exigidos por la regla 5.10: un pack se paga con tarjeta más seguido que
    // en efectivo. Sin estas dos claves el cobro no sumaba a ningún total.
    debit_card: number;
    credit_card: number;
  };
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
  /** Rendición: comisiones − cobrado directo por la profesional = saldo. */
  settlement: {
    providerId: string;
    name: string;
    commissions: number;
    receivedDirect: number;
    balance: number;
  }[];
};

export type DayStatusReport = {
  date: string;
  rows: {
    appointmentId: string;
    appointmentStart: string | null;
    status: string | null;
    customerId: string | null;
    customerName: string | null;
    customerPhone: string | null;
    serviceName: string | null;
    providerName: string | null;
    servicePrice: number;
    depositPaid: number;
    totalPaid: number;
    balanceDue: number;
  }[];
  totals: { deposits: number; paid: number; due: number };
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
