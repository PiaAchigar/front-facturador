import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DayStatusPage } from "./features/accounts/DayStatusPage";
import { CashRegisterPage } from "./features/cash/CashRegisterPage";
import { DailyReportPage } from "./features/cash/DailyReportPage";
import { CheckoutPage } from "./features/checkout/CheckoutPage";
import { CommissionsPage } from "./features/commissions/CommissionsPage";
import { InvoiceDetailPage } from "./features/invoices/InvoiceDetailPage";
import { InvoiceListPage } from "./features/invoices/InvoiceListPage";
import { isEmbedded, useEmbedToken } from "./lib/embed";

/**
 * En modo embebido espera el token del host antes de montar las rutas
 * (así ninguna query dispara sin auth). En standalone renderiza directo.
 */
function EmbedGate({ children }: { children: ReactNode }) {
  const ready = useEmbedToken();
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-ink-soft">
        Cargando facturación…
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const shell = (
    <AppShell>
      <Routes>
        <Route path="/" element={<CheckoutPage />} />
        <Route path="/facturas" element={<InvoiceListPage />} />
        <Route path="/facturas/:id" element={<InvoiceDetailPage />} />
        <Route path="/caja" element={<CashRegisterPage />} />
        <Route path="/caja/rendicion" element={<DailyReportPage />} />
        <Route path="/comisiones" element={<CommissionsPage />} />
        <Route path="/cuentas" element={<DayStatusPage />} />
      </Routes>
    </AppShell>
  );

  return <BrowserRouter>{isEmbedded ? <EmbedGate>{shell}</EmbedGate> : shell}</BrowserRouter>;
}
