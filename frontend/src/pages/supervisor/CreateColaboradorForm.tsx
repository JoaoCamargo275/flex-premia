import { useState } from "react";
import { api } from "../../lib/api";

export function CreateColaboradorForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      await api.post("/api/supervisor/colaboradores", { name, email, password });
      setName("");
      setEmail("");
      setPassword("");
      setSuccess(true);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar colaborador.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex flex-wrap items-end gap-3">
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
      <button disabled={pending} className="btn-grad disabled:opacity-60">
        {pending ? "Criando..." : "Criar colaborador"}
      </button>
      {error && <p className="text-xs text-accent-3 w-full">{error}</p>}
      {success && <p className="text-xs text-good w-full">Colaborador criado com sucesso.</p>}
    </form>
  );
}
