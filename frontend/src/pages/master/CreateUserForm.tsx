import { useState } from "react";
import { api } from "../../lib/api";
import { ROLES, type Role } from "../../lib/types";

const ROLE_LABELS: Record<Role, string> = {
  MASTER: "Master",
  SUPERVISOR: "Supervisor",
  COLABORADOR: "Colaborador",
};

export function CreateUserForm({
  teams,
  onCreated,
}: {
  teams: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SUPERVISOR");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      await api.post("/api/master/usuarios", {
        name,
        email,
        password,
        role,
        teamId: role === "COLABORADOR" ? teamId || null : null,
      });
      setName("");
      setEmail("");
      setPassword("");
      setSuccess(true);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar usuário.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3">
      <h2 className="text-sm font-bold">Novo usuário</h2>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">Nome</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">E-mail</label>
        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">Senha temporária</label>
        <input
          type="text"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">Papel</label>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      {role === "COLABORADOR" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-ink-dim">Equipe</label>
          <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Sem equipe por enquanto</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <button disabled={pending} className="btn-grad disabled:opacity-60 self-start">
        {pending ? "Criando..." : "Criar usuário"}
      </button>
      {error && <p className="text-xs text-accent-3">{error}</p>}
      {success && <p className="text-xs text-good">Usuário criado com sucesso.</p>}
    </form>
  );
}
