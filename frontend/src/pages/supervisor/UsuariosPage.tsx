import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { CreateColaboradorForm } from "./CreateColaboradorForm";

interface ColaboradoresResponse {
  team: { id: string; name: string } | null;
  colaboradores: { id: string; name: string; email: string; passwordResetRequested: boolean }[];
}

function ResetarSenhaButton({ colaboradorId, onDone }: { colaboradorId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [novaSenha, setNovaSenha] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resetar() {
    if (!confirm("Gerar uma nova senha temporária para este colaborador? A senha atual dele deixará de funcionar.")) return;
    setPending(true);
    setError(null);
    try {
      const resp = await api.post<{ ok: boolean; novaSenha: string }>(`/api/supervisor/colaboradores/${colaboradorId}/resetar-senha`, {});
      setNovaSenha(resp.novaSenha);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao resetar senha.");
    } finally {
      setPending(false);
    }
  }

  if (novaSenha) {
    return (
      <div className="text-xs flex items-center gap-2">
        <span className="text-ink-dim">Nova senha:</span>
        <code className="px-1.5 py-0.5 rounded bg-white/[.06] font-bold text-good">{novaSenha}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(novaSenha).catch(() => {});
          }}
          className="text-accent-2 font-semibold hover:underline"
        >
          Copiar
        </button>
      </div>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button type="button" disabled={pending} onClick={resetar} className="text-xs font-bold text-accent-2 hover:underline">
        {pending ? "Gerando..." : "Resetar senha"}
      </button>
      {error && <span className="text-xs text-accent-3">{error}</span>}
    </span>
  );
}

export default function SupervisorUsuariosPage() {
  const [data, setData] = useState<ColaboradoresResponse | null>(null);

  const load = useCallback(() => {
    api.get<ColaboradoresResponse>("/api/supervisor/colaboradores").then(setData);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Colaboradores da equipe</h1>
        <p className="text-sm text-ink-dim">Crie logins de colaborador para a sua equipe.</p>
      </div>

      <CreateColaboradorForm onCreated={load} />

      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3">Colaboradores atuais</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {data?.colaboradores.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.name}</span>
                  {m.passwordResetRequested && (
                    <span
                      className="text-[.62rem] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(236,26,114,.14)", color: "var(--accent)" }}
                      title="Pediu redefinição de senha na tela de login"
                    >
                      Esqueceu a senha
                    </span>
                  )}
                </div>
                <span className="text-ink-dim text-xs">{m.email}</span>
              </div>
              <ResetarSenhaButton colaboradorId={m.id} onDone={load} />
            </li>
          ))}
          {data && data.colaboradores.length === 0 && (
            <li className="text-ink-dim">Nenhum colaborador cadastrado ainda.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
