import { Outlet } from "react-router-dom";
import { AppShell } from "../../components/AppShell";

export default function SupervisorLayout() {
  return (
    <AppShell
      roleLabel="Supervisor"
      links={[
        { href: "/supervisor", label: "Visão geral da equipe" },
        { href: "/supervisor/usuarios", label: "Colaboradores" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
