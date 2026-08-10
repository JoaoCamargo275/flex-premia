import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { CreateColaboradorForm } from "./CreateColaboradorForm";

interface ColaboradoresResponse {
  team: { id: string; name: string } | null;
  colaboradores: { id: string; name: string; email: string }[];
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
            <li key={m.id} className="flex justify-between border-b border-white/5 pb-2 last:border-0">
              <span>{m.name}</span>
              <span className="text-ink-dim">{m.email}</span>
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
