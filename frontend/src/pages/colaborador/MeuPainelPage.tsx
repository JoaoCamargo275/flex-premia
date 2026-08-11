import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PainelLancadoAtivado } from "../../components/PremiacaoPanel";
import { useMonthFilter } from "../../lib/month-filter-context";
import type { PainelColaborador, FaixaTables } from "../../lib/premiacao-types";

export default function MeuPainelPage() {
  const { from, to, label, isMesAtual } = useMonthFilter();
  const [painel, setPainel] = useState<PainelColaborador | null>(null);
  const [faixas, setFaixas] = useState<FaixaTables | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPainel(null);
    Promise.all([
      api.get<PainelColaborador>(`/api/sales/painel?from=${from}&to=${to}`),
      api.get<FaixaTables>("/api/catalog/faixas"),
    ])
      .then(([p, f]) => {
        setPainel(p);
        setFaixas(f);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar painel."));
  }, [from, to]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Meu painel</h1>
        <p className="text-sm text-ink-dim">
          Pontuação e premiação estimada de <b>{label}</b>
          {isMesAtual && " (mês atual)"} — use o calendariozinho ao lado de "Colaborador", lá em cima, para ver
          outros meses.
        </p>
      </div>
      {error && <p className="text-sm text-accent-3">{error}</p>}
      {painel && faixas && <PainelLancadoAtivado painel={painel} faixas={faixas} />}
    </div>
  );
}
