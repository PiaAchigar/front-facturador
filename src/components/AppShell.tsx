import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "Cobranza", end: true },
  { to: "/facturas", label: "Facturas", end: false },
  { to: "/caja", label: "Caja", end: false },
  { to: "/comisiones", label: "Comisiones", end: false },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-surface-high bg-surface-low p-4 print:hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold leading-none text-primary">PiuBella</h1>
          <p className="text-[10px] tracking-[0.25em] text-ink-soft uppercase">facturador</p>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-ink-soft hover:bg-surface-high"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 print:p-0">{children}</main>
    </div>
  );
}
