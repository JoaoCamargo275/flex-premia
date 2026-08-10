import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { CreateTeamForm } from "./CreateTeamForm";
import { CreateUserForm } from "./CreateUserForm";
import { UsersTable, type UserRow } from "./UsersTable";

interface Team {
  id: string;
  name: string;
  supervisorId: string | null;
  supervisorName: string | null;
}
interface UsuariosResponse {
  teams: Team[];
  users: UserRow[];
}

export default function MasterUsuariosPage() {
  const [data, setData] = useState<UsuariosResponse | null>(null);

  const load = useCallback(() => {
    api.get<UsuariosResponse>("/api/master/usuarios").then(setData);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return null;

  const supervisorsWithoutTeam = data.users.filter(
    (u) => u.role === "SUPERVISOR" && !data.teams.some((t) => t.supervisorId === u.id)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Usuários e equipes</h1>
        <p className="text-sm text-ink-dim">
          Crie equipes, vincule supervisores e crie/gerencie logins dos três perfis.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <CreateTeamForm supervisors={supervisorsWithoutTeam.map((s) => ({ id: s.id, name: s.name }))} onCreated={load} />
        <CreateUserForm teams={data.teams.map((t) => ({ id: t.id, name: t.name }))} onCreated={load} />
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3">Equipes</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {data.teams.map((t) => (
            <li key={t.id} className="flex justify-between border-b border-white/5 pb-2 last:border-0">
              <span>{t.name}</span>
              <span className="text-ink-dim">{t.supervisorName ?? "sem supervisor"}</span>
            </li>
          ))}
          {data.teams.length === 0 && <li className="text-ink-dim">Nenhuma equipe criada ainda.</li>}
        </ul>
      </div>

      <UsersTable users={data.users} teams={data.teams.map((t) => ({ id: t.id, name: t.name }))} onChanged={load} />
    </div>
  );
}
