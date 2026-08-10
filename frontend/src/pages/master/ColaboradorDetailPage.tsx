import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { PainelLancadoAtivado } from "../../components/PremiacaoPanel";
import { INDICATOR_LABELS, SALE_STATUS_LABELS } from "../../lib/types";
import { fmtBRL } from "../../lib/format";
import type { PainelColaborador } from "../../lib/premiacao-types";

interface SaleItem {
  id: string;
  indicator: string;
  label: string;
  pointsTotal: number;
  valorReais: number | null;
}
interface Sale {
  id: string;
  clienteNome: string;
  status: string;
  ativo: boolean;
  createdAt: string;
  items: SaleItem[];
}
interface DetailResponse {
  colaborador: { id: string; name: string; email: string; teamName: string | null };
  painel: PainelColaborador;
  sales: Sale[];
}

export default function MasterColaboradorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<DetailResponse>(`/api/master/colaboradores/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar colaborador."));
  }, [id]);

  if (error) return <p className="text-sm text-accent-3">{error}</p>;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{data.colaborador.name}</h1>
        <p className="text-sm text-ink-dim">
          {data.colaborador.email} · {data.colaborador.teamName ?? "sem equipe"} · somente leitura
        </p>
      </div>

      <PainelLancadoAtivado painel={data.painel} />

      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3">Histórico de vendas</h2>
        <div className="flex flex-col gap-3">
          {data.sales.map((sale) => {
            const pontos = sale.items.reduce((acc, i) => acc + i.pointsTotal, 0);
            const valorAparelhos = sale.items.reduce((acc, i) => acc + (i.valorReais ?? 0), 0);
            return (
              <div key={sale.id} className="border-b border-white/5 pb-3 last:border-0">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">
                    {sale.clienteNome} {sale.ativo && <span className="text-good text-xs font-bold">✓ Ativo</span>}
                  </span>
                  <span className="text-ink-dim text-xs">{SALE_STATUS_LABELS[sale.status as keyof typeof SALE_STATUS_LABELS]}</span>
                </div>
                <div className="text-xs text-ink-dim">
                  {new Date(sale.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                  {sale.items.map((i) => `${INDICATOR_LABELS[i.indicator as keyof typeof INDICATOR_LABELS]} ${i.label}`).join(", ")}
                </div>
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
