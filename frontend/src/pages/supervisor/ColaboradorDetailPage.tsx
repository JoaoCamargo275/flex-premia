import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { INDICATOR_LABELS } from "../../lib/types";
import { fmtBRL, fmtNum } from "../../lib/format";
import type { EvolutionSeries, PainelColaborador } from "../../lib/premiacao-types";
import { PeriodFilterForm } from "../../components/PeriodFilterForm";
import { FrenteEvolutionChart, COR_LANCADOS, COR_ATIVADOS } from "../../components/TeamDashboard";

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
  clienteCnpj: string;
  cancelado: boolean;
  createdAt: string;
  items: SaleItem[];
}
interface DetailResponse {
  colaborador: { id: string; name: string; email: string };
  painel: PainelColaborador;
  sales: Sale[];
  evolution: EvolutionSeries;
}

function maskCnpjDisplay(digits: string) {
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

// Cada frente tem sua própria régua de faixas, então somar os pontos das 3
// frentes de pontuação não faz sentido — mostramos lançado/ativado separado
// por frente (Aparelhos é por valor em R$, não pontos).
function FrenteCard({
  icon,
  label,
  lancado,
  ativado,
  isValor,
}: {
  icon: string;
  label: string;
  lancado: number;
  ativado: number;
  isValor?: boolean;
}) {
  const fmt = isValor ? fmtBRL : (n: number) => `${fmtNum(n)} pts`;
  return (
    <div className="card p-4">
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">
        {icon} {label}
      </div>
      <div className="text-xl font-extrabold text-good">{fmt(ativado)}</div>
      <div className="text-xs text-ink-dim mt-0.5">de {fmt(lancado)} lançado</div>
    </div>
  );
}

export default function SupervisorColaboradorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const qs = searchParams.toString();
    api
      .get<DetailResponse>(`/api/supervisor/colaboradores/${id}${qs ? `?${qs}` : ""}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar colaborador."));
  }, [id, searchParams]);

  const vendasFiltradas = useMemo(() => {
    if (!data) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return data.sales;
    return data.sales.filter(
      (s) => s.clienteNome.toLowerCase().includes(q) || s.clienteCnpj.includes(q.replace(/\D/g, "") || q)
    );
  }, [data, busca]);

  if (error) return <p className="text-sm text-accent-3">{error}</p>;
  if (!data) return null;

  const { painel } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/supervisor"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent-2 hover:text-accent mb-2"
        >
          ← Voltar para visão geral da equipe
        </Link>
        <h1 className="text-xl font-bold">{data.colaborador.name}</h1>
        <p className="text-sm text-ink-dim">{data.colaborador.email} · somente leitura</p>
      </div>

      <PeriodFilterForm />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FrenteCard icon="📱" label="RENOV. MV" lancado={painel.lancado.ptsMV} ativado={painel.ativado.ptsMV} />
        <FrenteCard icon="🔄" label="RENOV. FB/AVA" lancado={painel.lancado.ptsFBAVA} ativado={painel.ativado.ptsFBAVA} />
        <FrenteCard icon="🚀" label="ALTAS" lancado={painel.lancado.ptsAltas} ativado={painel.ativado.ptsAltas} />
        <FrenteCard
          icon="💰"
          label="Aparelhos"
          lancado={painel.lancado.valorAparelhos}
          ativado={painel.ativado.valorAparelhos}
          isValor
        />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-bold">
            Evolução no período {data.evolution.granularity === "day" ? "— dia a dia" : "— semana a semana"}
          </h2>
          <div className="flex items-center gap-4 text-xs text-ink-dim">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COR_LANCADOS }} />
              Lançados
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COR_ATIVADOS }} />
              Ativados
            </span>
          </div>
        </div>
        <p className="text-xs text-ink-dim mb-3">
          O eixo acompanha o período selecionado no filtro acima — dia a dia (períodos de até 31 dias) ou semana a
          semana (períodos mais longos).
        </p>
        {data.evolution.points.length === 0 ? (
          <p className="text-sm text-ink-dim">Sem dados no período selecionado.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <FrenteEvolutionChart
              title="RENOV MV"
              icon="📱"
              data={data.evolution.points.map((p) => ({ bucket: p.bucket, ...p.mv }))}
            />
            <FrenteEvolutionChart
              title="RENOV FB/AVA"
              icon="🔄"
              data={data.evolution.points.map((p) => ({ bucket: p.bucket, ...p.fbava }))}
            />
            <FrenteEvolutionChart
              title="ALTAS"
              icon="🚀"
              data={data.evolution.points.map((p) => ({ bucket: p.bucket, ...p.altas }))}
            />
            <FrenteEvolutionChart
              title="Aparelhos"
              icon="💰"
              data={data.evolution.points.map((p) => ({ bucket: p.bucket, ...p.aparelhos }))}
              isValor
            />
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-bold">Clientes e produtos vendidos</h2>
          {data.sales.length > 0 && (
            <input
              className="input py-1.5 text-sm max-w-xs"
              placeholder="Buscar por cliente ou CNPJ..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-dim text-xs uppercase">
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">CNPJ</th>
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Produtos</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {vendasFiltradas.map((sale) => {
                const itensAtivos = sale.items.filter((i) => i.ativo).length;
                const expanded = expandedId === sale.id;
                return (
                  <Fragment key={sale.id}>
                    <tr
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId(expanded ? null : sale.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setExpandedId(expanded ? null : sale.id);
                      }}
                      className="border-t border-white/5 align-top cursor-pointer hover:bg-white/[.03] transition"
                    >
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              background: sale.cancelado
                                ? "var(--accent-3)"
                                : itensAtivos > 0
                                ? "var(--good, #22c55e)"
                                : "var(--ink-dim)",
                            }}
                          />
                          <span className="font-semibold truncate">{sale.clienteNome}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-ink-dim whitespace-nowrap">{maskCnpjDisplay(sale.clienteCnpj)}</td>
                      <td className="py-2 pr-3 text-ink-dim whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 pr-3 text-ink-dim">
                        {sale.items.length} {sale.items.length === 1 ? "produto" : "produtos"}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className="text-[.65rem] font-bold px-2 py-1 rounded-full shrink-0 inline-block"
                          style={
                            sale.cancelado
                              ? { background: "rgba(255,77,109,.14)", color: "var(--accent-3)" }
                              : itensAtivos === sale.items.length
                              ? { background: "rgba(34,197,94,.14)", color: "var(--good, #22c55e)" }
                              : itensAtivos > 0
                              ? { background: "rgba(236,26,114,.14)", color: "var(--accent)" }
                              : { background: "rgba(255,255,255,.06)", color: "var(--ink-dim)" }
                          }
                        >
                          {sale.cancelado
                            ? "Cancelada"
                            : itensAtivos === sale.items.length
                            ? "Todos ativos"
                            : itensAtivos > 0
                            ? `${itensAtivos}/${sale.items.length} ativos`
                            : "Pendente"}
                        </span>
                      </td>
                      <td className="py-2 text-right text-ink-dim">{expanded ? "▲" : "▼"}</td>
                    </tr>

                    {expanded && (
                      <tr className="border-t border-white/5">
                        <td colSpan={6} className="pb-3 pt-1">
                          <ul className="text-xs text-ink-dim flex flex-col gap-1">
                            {sale.items.map((i) => (
                              <li
                                key={i.id}
                                className="flex items-center justify-between gap-2 rounded-lg bg-white/[.02] px-2.5 py-1.5"
                              >
                                <span>
                                  <span className="font-semibold text-ink">
                                    {INDICATOR_LABELS[i.indicator as keyof typeof INDICATOR_LABELS] ?? i.indicator}
                                  </span>{" "}
                                  — {i.label}
                                  {i.indicator === "APARELHOS"
                                    ? ` · ${fmtBRL(i.valorReais ?? 0)}`
                                    : ` x${fmtNum(i.quantity)} · ${i.pointsTotal} pts`}
                                </span>
                                <span className={i.ativo ? "text-good font-semibold shrink-0" : "shrink-0"}>
                                  {i.ativo ? "Ativo" : i.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {data.sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-ink-dim">
                    Nenhuma venda registrada.
                  </td>
                </tr>
              )}
              {data.sales.length > 0 && vendasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-ink-dim">
                    Nenhum cliente encontrado para essa busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
