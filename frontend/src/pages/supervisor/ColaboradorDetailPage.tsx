import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { INDICATOR_LABELS } from "../../lib/types";
import { fmtBRL, fmtNum } from "../../lib/format";
import type { PainelColaborador } from "../../lib/premiacao-types";

interface SaleItem {
  id: string;
  indicator: string;
  label: string;
  quantity: number;
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

function PontosCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">{label}</div>
      <div className="text-xl font-extrabold" style={color ? { color } : undefined}>
        {fmtNum(value)} pts
      </div>
    </div>
  );
}

export default function SupervisorColaboradorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<DetailResponse>(`/api/supervisor/colaboradores/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar colaborador."));
  }, [id]);

  if (error) return <p className="text-sm text-accent-3">{error}</p>;
  if (!data) return null;

  const { painel } = data;
  const pontosLancados = painel.lancado.ptsMV + painel.lancado.ptsFBAVA + painel.lancado.ptsAltas;
  const pontosAtivados = painel.ativado.ptsMV + painel.ativado.ptsFBAVA + painel.ativado.ptsAltas;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{data.colaborador.name}</h1>
        <p className="text-sm text-ink-dim">{data.colaborador.email} · somente leitura</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PontosCard label="Pontos lançados" value={pontosLancados} />
        <PontosCard label="Pontos ativados" value={pontosAtivados} color="var(--good, #22c55e)" />
        <div className="card p-4">
          <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">💰 Aparelhos lançado</div>
          <div className="text-xl font-extrabold">{fmtBRL(painel.lancado.valorAparelhos)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">💰 Aparelhos ativado</div>
          <div className="text-xl font-extrabold text-good">{fmtBRL(painel.ativado.valorAparelhos)}</div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3">Clientes e produtos vendidos</h2>
        <div className="flex flex-col gap-3">
          {data.sales.map((sale) => {
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
                  <span className="text-xs text-ink-dim">{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
                <ul className="text-xs text-ink-dim flex flex-col gap-0.5 mt-1.5">
                  {sale.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2">
                      <span>
                        <span className="font-semibold text-ink">
                          {INDICATOR_LABELS[i.indicator as keyof typeof INDICATOR_LABELS] ?? i.indicator}
                        </span>{" "}
                        — {i.label}
                        {i.indicator === "APARELHOS" ? ` · ${fmtBRL(i.valorReais ?? 0)}` : ` x${fmtNum(i.quantity)} · ${i.pointsTotal} pts`}
                      </span>
                      <span className={i.ativo ? "text-good font-semibold shrink-0" : "shrink-0"}>
                        {i.ativo ? "Ativo" : i.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {data.sales.length === 0 && <p className="text-sm text-ink-dim">Nenhuma venda registrada.</p>}
        </div>
      </div>
    </div>
  );
}
