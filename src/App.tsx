import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { CashRegisterPage } from "./features/cash/CashRegisterPage";
import { DailyReportPage } from "./features/cash/DailyReportPage";
import { CheckoutPage } from "./features/checkout/CheckoutPage";
import { CommissionsPage } from "./features/commissions/CommissionsPage";
import { InvoiceDetailPage } from "./features/invoices/InvoiceDetailPage";
import { InvoiceListPage } from "./features/invoices/InvoiceListPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<CheckoutPage />} />
          <Route path="/facturas" element={<InvoiceListPage />} />
          <Route path="/facturas/:id" element={<InvoiceDetailPage />} />
          <Route path="/caja" element={<CashRegisterPage />} />
          <Route path="/caja/rendicion" element={<DailyReportPage />} />
          <Route path="/comisiones" element={<CommissionsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
