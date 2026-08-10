import { Outlet } from "react-router-dom";
import { AppShell } from "../../components/AppShell";

export default function MasterLayout() {
  return (
    <AppShell
      roleLabel="Master"
      links={[
        { href: "/master", label: "Visão geral" },
        { href: "/master/usuarios", label: "Usuários e equipes" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
