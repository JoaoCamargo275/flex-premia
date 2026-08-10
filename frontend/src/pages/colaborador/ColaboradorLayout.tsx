import { Outlet } from "react-router-dom";
import { AppShell } from "../../components/AppShell";

export default function ColaboradorLayout() {
  return (
    <AppShell
      roleLabel="Colaborador"
      links={[
        { href: "/colaborador", label: "Meu painel" },
        { href: "/colaborador/nova-venda", label: "Nova venda" },
        { href: "/colaborador/vendas", label: "Minhas vendas" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
