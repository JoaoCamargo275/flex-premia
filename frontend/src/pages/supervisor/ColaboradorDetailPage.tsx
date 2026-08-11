import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { PainelLancadoAtivado } from "../../components/PremiacaoPanel";
import { INDICATOR_LABELS } from "../../lib/types";
import { fmtBRL } from "../../lib/format";
import type { PainelColaborador, FaixaTables } from "../../lib/premiacao-types";

interface SaleItem {
  id: string;
  indicator: string;
  label: string;
  pointsTotal: number;
  valorReais: number | null;
  status: string;
  ativo: boolean;
}
interface Sale {
  id: string;
  clienteNome: string;
  cancelado: boolean;
  createdAt: string;
  items: SaleItem[];
}
interface DetailResponse {
  colaborador: { id: string; name: string; email: string };
  painel: PainelColaborador;
  sales: Sale[];
}

export default function SupervisorColaboradorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [faixas, setFaixas] = useState<FaixaTables | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<DetailResponse>(`/api/supervisor/colaboradores/${id}`),
      api.get<FaixaTables>("/api/catalog/faixas"),
    ])
      .then(([d, f]) => {
        setData(d);
        setFaixas(f);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar colaborador."));
  }, [id]);

  if (error) return <p className="text-sm text-accent-3">{error}</p>;
  if (!data || !faixas) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{data.colaborador.name}</h1>
        <p className="text-sm text-ink-dim">{data.colaborador.email} · somente leitura</p>
      </div>

      <PainelLancadoAtivado painel={data.painel} faixas={faixas} />

      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3">Histórico de vendas</h2>
        <div className="flex flex-col gap-3">
          {data.sales.map((sale) => {
            const pontos = sale.items.reduce((acc, i) => acc + i.pointsTotal, 0);
            const valorAparelhos = sale.items.reduce((acc, i) => acc + (i.valorReais ?? 0), 0);
            const itensAtivos = sale.items.filter((i) => i.ativo).length;
            return (
              <div key={sale.id} className="border-b border-white/5 pb-3 last:border-0">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">
                    {sale.clienteNome}{" "}
                    {sale.cancelado ? (
                      <span className="text-accent-3 text-xs font-bold">Cancelada</span>
                    ) : (
                      itensAtivos > 0 && (
                        <span className="text-good text-xs font-bold">
                          ✓ {itensAtivos}/{sale.items.length} ativos
                        </span>
                      )
                    )}
                  </span>
                </div>
                <ul className="text-xs text-ink-dim flex flex-col gap-0.5 mt-1">
                  {sale.items.map((i) => (
                    <li key={i.id}>
                      {INDICATOR_LABELS[i.indicator as keyof typeof INDICATOR_LABELS]} {i.label} —{" "}
                      <span className={i.ativo ? "text-good font-semibold" : ""}>{i.ativo ? "Ativo" : i.status}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-ink-dim mt-1">{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</div>
                <div className="text-xs font-bold text-accent-2">
                  {pontos > 0 && `${pontos} pts`} {valorAparelhos > 0 && fmtBRL(valorAparelhos)}
                </div>
              </div>
            );
          })}
          {data.sales.length === 0 && <p className="text-sm text-ink-dim">Nenhuma venda registrada.</p>}
        </div>
      </div>
    </div>
  );
}
