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
  passwordResetRequested: boolean;
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
  const [novaSenhaPorUsuario, setNovaSenhaPorUsuario] = useState<Record<string, string>>({});

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    try {
      await fn();
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function resetarSenha(userId: string) {
    if (!confirm("Gerar uma nova senha temporária para este usuário? A senha atual dele deixará de funcionar.")) return;
    setPending(true);
    try {
      const resp = await api.post<{ ok: boolean; novaSenha: string }>(`/api/master/usuarios/${userId}/resetar-senha`, {});
      setNovaSenhaPorUsuario((prev) => ({ ...prev, [userId]: resp.novaSenha }));
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function excluirUsuario(u: UserRow) {
    if (
      !confirm(
        `Excluir "${u.name}" (${ROLE_LABELS[u.role]})? Isso apaga a conta permanentemente${
          u.role === "COLABORADOR" ? ", junto com todas as vendas registradas por ele" : ""
        }. Não tem como desfazer.`
      )
    )
      return;
    setPending(true);
    try {
      await api.delete(`/api/master/usuarios/${u.id}`);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir usuário.");
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
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{u.name}</span>
                    {u.passwordResetRequested && (
                      <span
                        className="text-[.62rem] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(236,26,114,.14)", color: "var(--accent)" }}
                        title="Pediu redefinição de senha na tela de login"
                      >
                        Esqueceu a senha
                      </span>
                    )}
                  </div>
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
                  {novaSenhaPorUsuario[u.id] ? (
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <span className="text-ink-dim">Nova senha:</span>
                      <code className="px-1.5 py-0.5 rounded bg-white/[.06] font-bold text-good">{novaSenhaPorUsuario[u.id]}</code>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(novaSenhaPorUsuario[u.id]).catch(() => {})}
                        className="text-accent-2 font-semibold hover:underline"
                      >
                        Copiar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        disabled={pending}
                        onClick={() => resetarSenha(u.id)}
                        className="text-xs font-bold text-accent-2 hover:underline"
                      >
                        Resetar senha
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => run(() => api.patch(`/api/master/usuarios/${u.id}`, { active: !u.active }))}
                        className="text-xs font-semibold text-accent-2"
                      >
                        {u.active ? "Desativar" : "Reativar"}
                      </button>
                      <button
                        disabled={pending}
                        onClick={() => excluirUsuario(u)}
                        className="text-xs font-bold text-accent-3 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
