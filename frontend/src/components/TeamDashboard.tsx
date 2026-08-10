import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { fmtBRL, fmtNum } from "../lib/format";
import type { TeamOverview } from "../lib/premiacao-types";

function KpiCard({
  label,
  value,
  compareValue,
}: {
  label: string;
  value: string;
  compareValue?: { current: number; previous: number };
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
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
      {diffLabel && (
        <div className={`text-xs mt-1 font-semibold ${positive ? "text-good" : "text-accent-3"}`}>{diffLabel}</div>
      )}
    </div>
  );
}

export function TeamDashboard({
  overview,
  detailBasePath,
}: {
  overview: TeamOverview;
  detailBasePath: string;
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
        <KpiCard label="% de ativação" value={`${totals.taxaConversao.toFixed(1)}%`} />
        <KpiCard
          label="Premiação estimada da equipe"
          value={fmtBRL(totals.premiacaoEstimada)}
          compareValue={{ current: totals.premiacaoEstimada, previous: totalsAnterior.premiacaoEstimada }}
        />
      </div>

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
                <th className="py-2">Nome</th>
                <th className="py-2">Faixa (ativado)</th>
                <th className="py-2">Premiação lançada</th>
                <th className="py-2">Premiação ativada</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="py-2">
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-ink-dim">{m.email}</div>
                  </td>
                  <td className="py-2">Faixa {m.faixaAtivada}</td>
                  <td className="py-2">{fmtBRL(m.premiacaoLancada)}</td>
                  <td className="py-2 font-bold text-good">{fmtBRL(m.premiacaoAtivada)}</td>
                  <td className="py-2 text-right">
                    <Link to={`${detailBasePath}/${m.id}`} className="text-xs font-semibold text-accent-2">
                      Ver detalhes →
                    </Link>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-ink-dim">
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
