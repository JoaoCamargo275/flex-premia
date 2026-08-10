import { useState } from "react";
import { api } from "../../lib/api";

export function CreateTeamForm({
  supervisors,
  onCreated,
}: {
  supervisors: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.post("/api/master/equipes", { name, supervisorId: supervisorId || null });
      setName("");
      setSupervisorId("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar equipe.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex flex-col gap-3">
      <h2 className="text-sm font-bold">Nova equipe</h2>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">Nome da equipe</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">Supervisor (opcional)</label>
        <select className="input" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
          <option value="">Sem supervisor por enquanto</option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <button disabled={pending} className="btn-grad disabled:opacity-60 self-start">
        {pending ? "Criando..." : "Criar equipe"}
      </button>
      {error && <p className="text-xs text-accent-3">{error}</p>}
    </form>
  );
}
