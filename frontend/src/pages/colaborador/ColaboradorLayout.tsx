import { Outlet } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { MonthYearBadgePicker } from "../../components/MonthYearBadgePicker";
import { MonthFilterProvider } from "../../lib/month-filter-context";

export default function ColaboradorLayout() {
  return (
    <MonthFilterProvider>
      <AppShell
        roleLabel="Colaborador"
        headerExtra={<MonthYearBadgePicker />}
        links={[
          { href: "/colaborador", label: "Meu painel" },
          { href: "/colaborador/nova-venda", label: "Nova venda" },
          { href: "/colaborador/vendas", label: "Minhas vendas" },
        ]}
      >
        <Outlet />
      </AppShell>
    </MonthFilterProvider>
  );
}
