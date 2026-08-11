import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { fmtBRL, fmtNum } from "../lib/format";
import type { TeamOverview } from "../lib/premiacao-types";

function KpiCard({
  label,
  value,
  compareValue,
  icon,
}: {
  label: string;
  value: string;
  compareValue?: { current: number; previous: number };
  icon?: string;
}) {
  let diffLabel: string | null = null;
  let positive = true;
  if (compareValue) {
    const { current, previous } = compareValue;
    if (previous > 0) {
      const diff = ((current - previous) / previous) * 100;
      positive = diff >= 0;
      diffLabel = `${positive ? "+" : ""}${diff.toFixed(1)}% vs período anterior`;
    } else if (current > 0) {
      diffLabel = "novo no período";
    }
  }
  return (
    <div className="card p-4">
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className="text-xl font-extrabold">{value}</div>
      {diffLabel && (
        <div className={`text-xs mt-1 font-semibold ${positive ? "text-good" : "text-accent-3"}`}>{diffLabel}</div>
      )}
    </div>
  );
}

function FrenteCell({ lancado, ativado, isValor }: { lancado: number; ativado: number; isValor?: boolean }) {
  const fmt = isValor ? fmtBRL : (n: number) => `${fmtNum(n)} pts`;
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-semibold text-ink">{fmt(ativado)}</span>
      <span className="text-[.65rem] text-ink-dim">de {fmt(lancado)} lançado</span>
    </div>
  );
}

export function TeamDashboard({
  overview,
  detailBasePath,
  hidePremiacao,
}: {
  overview: TeamOverview;
  detailBasePath: string;
  /** No perfil de Supervisor, o valor de premiação em R$ é indiferente — só interessa pontos/quantidades. */
  hidePremiacao?: boolean;
}) {
  const { totals, totalsAnterior, monthly, members } = overview;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Vendas lançadas"
          value={fmtNum(totals.vendasLancadas)}
          compareValue={{ current: totals.vendasLancadas, previous: totalsAnterior.vendasLancadas }}
        />
        <KpiCard
          label="Vendas ativadas"
          value={fmtNum(totals.vendasAtivadas)}
          compareValue={{ current: totals.vendasAtivadas, previous: totalsAnterior.vendasAtivadas }}
        />
        <KpiCard
          label="Pontos ativos"
          icon="⚡"
          value={fmtNum(Math.round(totals.pontosAtivos))}
          compareValue={{ current: totals.pontosAtivos, previous: totalsAnterior.pontosAtivos }}
        />
        <KpiCard
          label="% da equipe ativada"
          icon="✅"
          value={`${totals.taxaAtivacaoColaboradores.toFixed(1)}%`}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Produtos · RENOV MV" icon="📱" value={fmtNum(totals.qtdProdutosMv)} />
        <KpiCard label="Produtos · RENOV FB" icon="🔄" value={fmtNum(totals.qtdProdutosFbava)} />
        <KpiCard label="Produtos · ALTAS" icon="🚀" value={fmtNum(totals.qtdProdutosAltas)} />
        <KpiCard label="Produtos · Aparelhos" icon="💰" value={fmtNum(totals.qtdProdutosAparelhos)} />
      </div>

      {!hidePremiacao && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Premiação estimada da equipe"
            value={fmtBRL(totals.premiacaoEstimada)}
            compareValue={{ current: totals.premiacaoEstimada, previous: totalsAnterior.premiacaoEstimada }}
          />
        </div>
      )}

      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3">Evolução mensal (últimos 6 meses)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="month" stroke="var(--ink-dim)" fontSize={12} />
              <YAxis stroke="var(--ink-dim)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)" }} />
              <Legend />
              <Line type="monotone" dataKey="lancadas" name="Lançadas" stroke="#8b3dff" strokeWidth={2} />
              <Line type="monotone" dataKey="ativadas" name="Ativadas" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3">Colaboradores</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-dim text-xs uppercase">
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Faixa (ativado)</th>
                <th className="py-2 pr-3">📱 RENOV MV</th>
                <th className="py-2 pr-3">🔄 RENOV FB</th>
                <th className="py-2 pr-3">🚀 ALTAS</th>
                <th className="py-2 pr-3">💰 Aparelhos</th>
                {!hidePremiacao && <th className="py-2 pr-3">Premiação ativada</th>}
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-white/5 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-ink-dim">{m.email}</div>
                  </td>
                  <td className="py-2 pr-3">Faixa {m.faixaAtivada}</td>
                  <td className="py-2 pr-3">
                    <FrenteCell lancado={m.frentes.mv.lancado} ativado={m.frentes.mv.ativado} />
                  </td>
                  <td className="py-2 pr-3">
                    <FrenteCell lancado={m.frentes.fbava.lancado} ativado={m.frentes.fbava.ativado} />
                  </td>
                  <td className="py-2 pr-3">
                    <FrenteCell lancado={m.frentes.altas.lancado} ativado={m.frentes.altas.ativado} />
                  </td>
                  <td className="py-2 pr-3">
                    <FrenteCell lancado={m.frentes.aparelhos.lancado} ativado={m.frentes.aparelhos.ativado} isValor />
                  </td>
                  {!hidePremiacao && (
                    <td className="py-2 pr-3 font-bold text-good">{fmtBRL(m.premiacaoAtivada)}</td>
                  )}
                  <td className="py-2 text-right">
                    <Link to={`${detailBasePath}/${m.id}`} className="text-xs font-semibold text-accent-2">
                      Ver detalhes →
                    </Link>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={hidePremiacao ? 7 : 8} className="py-4 text-center text-ink-dim">
                    Nenhum colaborador nesta equipe ainda.
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
