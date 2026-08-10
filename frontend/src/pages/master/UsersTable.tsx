import { useState } from "react";
import { api } from "../../lib/api";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "MASTER" | "SUPERVISOR" | "COLABORADOR";
  active: boolean;
  teamId: string | null;
  teamName: string | null;
}

const ROLE_LABELS: Record<UserRow["role"], string> = {
  MASTER: "Master",
  SUPERVISOR: "Supervisor",
  COLABORADOR: "Colaborador",
};

export function UsersTable({
  users,
  teams,
  onChanged,
}: {
  users: UserRow[];
  teams: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    try {
      await fn();
      onChanged();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card p-4">
      <h2 className="text-sm font-bold mb-3">Todos os usuários</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-dim text-xs uppercase">
              <th className="py-2">Nome</th>
              <th className="py-2">Papel</th>
              <th className="py-2">Equipe</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="py-2">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-ink-dim">{u.email}</div>
                </td>
                <td className="py-2">{ROLE_LABELS[u.role]}</td>
                <td className="py-2">
                  {u.role === "COLABORADOR" ? (
                    <select
                      className="input py-1 text-xs"
                      defaultValue={u.teamId ?? ""}
                      disabled={pending}
                      onChange={(e) => run(() => api.patch(`/api/master/usuarios/${u.id}`, { teamId: e.target.value || null }))}
                    >
                      <option value="">Sem equipe</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-ink-dim text-xs">{u.teamName ?? "—"}</span>
                  )}
                </td>
                <td className="py-2">
                  <span className={u.active ? "text-good" : "text-accent-3"}>{u.active ? "Ativo" : "Desativado"}</span>
                </td>
                <td className="py-2 text-right">
                  <button
                    disabled={pending}
                    onClick={() => run(() => api.patch(`/api/master/usuarios/${u.id}`, { active: !u.active }))}
                    className="text-xs font-semibold text-accent-2"
                  >
                    {u.active ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
