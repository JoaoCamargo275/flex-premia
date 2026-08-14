import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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

// KPI por frente, no mesmo formato "ativado / de X lançado" já usado na
// tabela de colaboradores — mas somando pontos (não quantidade de produtos)
// da equipe inteira no período. Aparelhos continua em R$, já que esse
// indicador não gera pontos (só valor vendido).
function PontosFrenteCard({
  label,
  icon,
  lancado,
  ativado,
  isValor,
}: {
  label: string;
  icon?: string;
  lancado: number;
  ativado: number;
  isValor?: boolean;
}) {
  const fmt = isValor ? fmtBRL : (n: number) => `${fmtNum(n)} pts`;
  return (
    <div className="card p-4">
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className="text-xl font-extrabold">{fmt(ativado)}</div>
      <div className="text-xs mt-1 text-ink-dim">de {fmt(lancado)} lançado</div>
    </div>
  );
}

// Cor consistente para os dois estados em todos os mini-gráficos por frente —
// a identidade (Lançados/Ativados) é sempre a mesma cor, então a legenda
// aparece só uma vez pra seção inteira.
export const COR_LANCADOS = "#8b3dff";
export const COR_ATIVADOS = "#22c55e";

export function FrenteEvolutionChart({
  title,
  icon,
  data,
  isValor,
}: {
  title: string;
  icon: string;
  data: { bucket: string; lancado: number; ativado: number }[];
  isValor?: boolean;
}) {
  const fmtValue = isValor ? fmtBRL : (n: number) => `${fmtNum(n)} pts`;
  return (
    <div className="rounded-xl bg-white/[.02] p-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-dim mb-2">
        {icon} {title}
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="bucket" stroke="var(--ink-dim)" fontSize={11} interval="preserveStartEnd" />
            <YAxis
              stroke="var(--ink-dim)"
              fontSize={11}
              allowDecimals={false}
              width={isValor ? 56 : 34}
              tickFormatter={(v: number) => (isValor ? fmtBRL(v) : String(v))}
            />
            <Tooltip
              contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)" }}
              formatter={(value) => fmtValue(typeof value === "number" ? value : Number(value) || 0)}
            />
            <Line type="monotone" dataKey="lancado" name="Lançados" stroke={COR_LANCADOS} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ativado" name="Ativados" stroke={COR_ATIVADOS} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TeamDashboard({
  overview,
  detailBasePath,
  hidePremiacao,
  hidePremiacaoEstimada,
}: {
  overview: TeamOverview;
  detailBasePath: string;
  /** No perfil de Supervisor, o valor de premiação em R$ é indiferente — esconde tile e coluna na tabela. */
  hidePremiacao?: boolean;
  /** Esconde só o tile "Premiação estimada da equipe" (mantém a coluna "Premiação ativada" na tabela) — usado no Master. */
  hidePremiacaoEstimada?: boolean;
}) {
  const { totals, totalsAnterior, evolution, members } = overview;

  const frenteTotais = members.reduce(
    (acc, m) => {
      acc.mv.lancado += m.frentes.mv.lancado;
      acc.mv.ativado += m.frentes.mv.ativado;
      acc.fbava.lancado += m.frentes.fbava.lancado;
      acc.fbava.ativado += m.frentes.fbava.ativado;
      acc.altas.lancado += m.frentes.altas.lancado;
      acc.altas.ativado += m.frentes.altas.ativado;
      acc.aparelhos.lancado += m.frentes.aparelhos.lancado;
      acc.aparelhos.ativado += m.frentes.aparelhos.ativado;
      return acc;
    },
    {
      mv: { lancado: 0, ativado: 0 },
      fbava: { lancado: 0, ativado: 0 },
      altas: { lancado: 0, ativado: 0 },
      aparelhos: { lancado: 0, ativado: 0 },
    }
  );

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
        <PontosFrenteCard label="Pontos · RENOV MV" icon="📱" lancado={frenteTotais.mv.lancado} ativado={frenteTotais.mv.ativado} />
        <PontosFrenteCard
          label="Pontos · RENOV FB/AVA"
          icon="🔄"
          lancado={frenteTotais.fbava.lancado}
          ativado={frenteTotais.fbava.ativado}
        />
        <PontosFrenteCard label="Pontos · ALTAS" icon="🚀" lancado={frenteTotais.altas.lancado} ativado={frenteTotais.altas.ativado} />
        <PontosFrenteCard
          label="Aparelhos"
          icon="💰"
          lancado={frenteTotais.aparelhos.lancado}
          ativado={frenteTotais.aparelhos.ativado}
          isValor
        />
      </div>

      {!hidePremiacao && !hidePremiacaoEstimada && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Premiação estimada da equipe"
            value={fmtBRL(totals.premiacaoEstimada)}
            compareValue={{ current: totals.premiacaoEstimada, previous: totalsAnterior.premiacaoEstimada }}
          />
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-bold">
            Evolução no período {evolution.granularity === "day" ? "— dia a dia" : "— semana a semana"}
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
          O eixo acompanha o período selecionado no filtro acima — use-o pra ver por dia (períodos de até 31 dias)
          ou por semana (períodos mais longos).
        </p>
        {evolution.points.length === 0 ? (
          <p className="text-sm text-ink-dim">Sem dados no período selecionado.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <FrenteEvolutionChart
              title="RENOV MV"
              icon="📱"
              data={evolution.points.map((p) => ({ bucket: p.bucket, ...p.mv }))}
            />
            <FrenteEvolutionChart
              title="RENOV FB/AVA"
              icon="🔄"
              data={evolution.points.map((p) => ({ bucket: p.bucket, ...p.fbava }))}
            />
            <FrenteEvolutionChart
              title="ALTAS"
              icon="🚀"
              data={evolution.points.map((p) => ({ bucket: p.bucket, ...p.altas }))}
            />
            <FrenteEvolutionChart
              title="Aparelhos"
              icon="💰"
              data={evolution.points.map((p) => ({ bucket: p.bucket, ...p.aparelhos }))}
              isValor
            />
          </div>
        )}
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
