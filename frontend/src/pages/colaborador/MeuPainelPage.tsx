import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PainelLancadoAtivado } from "../../components/PremiacaoPanel";
import type { PainelColaborador } from "../../lib/premiacao-types";

export default function MeuPainelPage() {
  const [painel, setPainel] = useState<PainelColaborador | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PainelColaborador>("/api/sales/painel")
      .then(setPainel)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar painel."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Meu painel</h1>
        <p className="text-sm text-ink-dim">
          Pontuação e premiação estimada com base em todo o histórico de vendas.
        </p>
      </div>
      {error && <p className="text-sm text-accent-3">{error}</p>}
      {painel && <PainelLancadoAtivado painel={painel} />}
    </div>
  );
}
