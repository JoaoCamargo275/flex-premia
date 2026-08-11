import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { fmtBRL, fmtNum } from "../lib/format";
import type { ResultadoPremiacao, PainelColaborador, FaixaTables, FaixaRow } from "../lib/premiacao-types";

const COLORS = {
  mv: "#ec1a72",
  fbava: "#9c94b3",
  altas: "#8b3dff",
  aparelhos: "#c026d3",
};

function faixaAlcancada(rows: FaixaRow[], pts: number): FaixaRow {
  let atual = rows[0];
  for (const f of rows) {
    if (f.faixa !== 0 && pts >= f.pts) atual = f;
  }
  return atual ?? { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 60%", pctFinal: null };
}

function Donut({
  ativado,
  lancado,
  color,
  centerTop,
  centerSub,
}: {
  ativado: number;
  lancado: number;
  color: string;
  centerTop: string;
  centerSub: string;
}) {
  const restante = Math.max(0, lancado - ativado);
  const vazio = ativado <= 0 && restante <= 0;
  const data = vazio ? [{ name: "vazio", value: 1 }] : [{ name: "ativado", value: ativado }, { name: "restante", value: restante }];

  return (
    <div className="relative w-full max-w-[150px] mx-auto aspect-square">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={vazio ? "rgba(255,255,255,.08)" : color} />
            {!vazio && <Cell fill="rgba(255,255,255,.08)" />}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <div className="text-base font-extrabold leading-tight">{centerTop}</div>
        <div className="text-[.62rem] text-ink-dim leading-tight mt-0.5">{centerSub}</div>
      </div>
    </div>
  );
}

function IndicatorDonuts({ painel, faixas }: { painel: PainelColaborador; faixas: FaixaTables }) {
  const fFbavaAtivado = faixaAlcancada(faixas.faixasFbava, painel.ativado.ptsFBAVA);
  const fFbavaLancado = faixaAlcancada(faixas.faixasFbava, painel.lancado.ptsFBAVA);

  return (
    <div>
      <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wide mb-3">
        Pontos por frente (ativado em cor · lançado no total do anel)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex flex-col gap-2 items-center">
          <span className="text-xs font-bold">RENOV. MV</span>
          <Donut
            ativado={painel.ativado.ptsMV}
            lancado={painel.lancado.ptsMV}
            color={COLORS.mv}
            centerTop={`Faixa ${painel.ativado.faixaMV}`}
            centerSub={`${fmtNum(painel.ativado.ptsMV)} / ${fmtNum(painel.lancado.ptsMV)} pts`}
          />
        </div>
        <div className="card p-4 flex flex-col gap-2 items-center">
          <span className="text-xs font-bold">RENOV. FB/AVA</span>
          <Donut
            ativado={painel.ativado.ptsFBAVA}
            lancado={painel.lancado.ptsFBAVA}
            color={COLORS.fbava}
            centerTop={`Faixa ${fFbavaAtivado.faixa}`}
            centerSub={`${fmtNum(painel.ativado.ptsFBAVA)} / ${fmtNum(painel.lancado.ptsFBAVA)} pts`}
          />
        </div>
        <div className="card p-4 flex flex-col gap-2 items-center">
          <span className="text-xs font-bold">ALTAS</span>
          <Donut
            ativado={painel.ativado.ptsAltas}
            lancado={painel.lancado.ptsAltas}
            color={COLORS.altas}
            centerTop={`Faixa ${painel.ativado.faixaALTAS}`}
            centerSub={`${fmtNum(painel.ativado.ptsAltas)} / ${fmtNum(painel.lancado.ptsAltas)} pts`}
          />
        </div>
        <div className="card p-4 flex flex-col gap-2 items-center">
          <span className="text-xs font-bold">Aparelhos</span>
          <Donut
            ativado={painel.ativado.valorAparelhos}
            lancado={painel.lancado.valorAparelhos}
            color={COLORS.aparelhos}
            centerTop={`Faixa ${painel.ativado.faixaAparelhosIndicador}`}
            centerSub={fmtBRL(painel.ativado.valorAparelhos)}
          />
        </div>
      </div>
      {faixas.faixasFbava.length > 0 && fFbavaLancado.faixa !== fFbavaAtivado.faixa && (
        <p className="text-xs text-ink-dim mt-2">
          RENOV. FB/AVA lançado já alcançaria a Faixa {fFbavaLancado.faixa} — falta ativar essas vendas.
        </p>
      )}
    </div>
  );
}

function MiniFaixaTable({
  title,
  rows,
  faixaAtual,
  color,
}: {
  title: string;
  rows: FaixaRow[];
  faixaAtual: number;
  color: string;
}) {
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${color}` }}>
      <h4 className="text-sm font-bold mb-3">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[420px]">
          <thead>
            <tr className="text-left text-ink-dim uppercase">
              <th className="py-1 pr-2">Faixa</th>
              <th className="py-1 pr-2">% da meta</th>
              <th className="py-1 pr-2">Pontuação</th>
              <th className="py-1 pr-2">Premiação (R$)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const current = r.faixa === faixaAtual;
              const reached = r.faixa !== 0 && faixaAtual >= r.faixa;
              return (
                <tr
                  key={r.faixa}
                  className="border-t border-white/5"
                  style={current ? { color, fontWeight: 800, background: "rgba(255,255,255,.04)" } : reached ? { color: "var(--ink)" } : { color: "var(--ink-dim)" }}
                >
                  <td className="py-1.5 pr-2">Faixa {r.faixa}</td>
                  <td className="py-1.5 pr-2">{r.metaPct}</td>
                  <td className="py-1.5 pr-2">{r.faixa === 0 ? `< ${fmtNum(rows[1]?.pts ?? 0)}` : fmtNum(r.pts)}</td>
                  <td className="py-1.5 pr-2">{r.faixa === 0 ? "R$ -" : fmtBRL(r.valor)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AparelhoFaixaTable({ faixas, faixaAtual }: { faixas: FaixaTables; faixaAtual: number }) {
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${COLORS.aparelhos}` }}>
      <h4 className="text-sm font-bold mb-3">Aparelhos (faixa por valor vendido)</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="text-left text-ink-dim uppercase">
              <th className="py-1 pr-2">Faixa</th>
              <th className="py-1 pr-2">% da meta</th>
              <th className="py-1 pr-2">Valor vendido a partir de</th>
            </tr>
          </thead>
          <tbody>
            {faixas.aparelhoFaixas.map((r) => {
              const current = r.faixa === faixaAtual;
              return (
                <tr
                  key={r.faixa}
                  className="border-t border-white/5"
                  style={current ? { color: COLORS.aparelhos, fontWeight: 800, background: "rgba(255,255,255,.04)" } : { color: "var(--ink-dim)" }}
                >
                  <td className="py-1.5 pr-2">Faixa {r.faixa}</td>
                  <td className="py-1.5 pr-2">{r.metaPct}</td>
                  <td className="py-1.5 pr-2">{r.faixa === 0 ? "R$ -" : fmtBRL(r.valor)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultadoGrid({ resultado }: { resultado: ResultadoPremiacao }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat
        label="RENOV. MV"
        value={`Faixa ${resultado.faixaDeterminante}`}
        sub={`${fmtNum(resultado.ptsMV)} pts · ${fmtBRL(resultado.valorMV)}`}
      />
      <Stat
        label="ALTAS"
        value={`Faixa ${resultado.faixaDeterminante}`}
        sub={`${fmtNum(resultado.ptsAltas)} pts · ${fmtBRL(resultado.valorALTAS)}`}
      />
      <Stat label="Bônus RENOV. FB/AVA" value={fmtBRL(resultado.bonusFBAVA)} sub={`${fmtNum(resultado.ptsFBAVA)} pts`} />
      <Stat
        label="Bônus Aparelhos"
        value={fmtBRL(resultado.bonusAparelhosRS)}
        sub={fmtBRL(resultado.valorAparelhos) + " vendidos"}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
      {sub && <div className="text-xs text-ink-dim mt-0.5">{sub}</div>}
    </div>
  );
}

export function PainelLancadoAtivado({ painel, faixas }: { painel: PainelColaborador; faixas: FaixaTables }) {
  const ptsLancadoTotal = painel.lancado.ptsMV + painel.lancado.ptsFBAVA + painel.lancado.ptsAltas;
  const ptsAtivadoTotal = painel.ativado.ptsMV + painel.ativado.ptsFBAVA + painel.ativado.ptsAltas;
  const fFbavaAtivado = faixaAlcancada(faixas.faixasFbava, painel.ativado.ptsFBAVA);

  return (
    <div className="flex flex-col gap-8">
      {/* Pontos: informação principal */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Pontos lançados (todas as vendas)</div>
          <div className="text-4xl font-extrabold">{fmtNum(ptsLancadoTotal)} <span className="text-lg font-bold text-ink-dim">pts</span></div>
          <div className="text-xs text-ink-dim mt-2">Premiação lançada estimada: {fmtBRL(painel.lancado.premiacaoFinal)}</div>
        </div>
        <div className="card p-5" style={{ border: "1px solid rgba(34,197,94,.4)" }}>
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Pontos ativados (conta oficialmente)</div>
          <div className="text-4xl font-extrabold text-good">{fmtNum(ptsAtivadoTotal)} <span className="text-lg font-bold text-ink-dim">pts</span></div>
          <div className="text-xs text-ink-dim mt-2">Premiação ativada estimada: {fmtBRL(painel.ativado.premiacaoFinal)}</div>
        </div>
      </div>

      {painel.ativado.faltouInjustificada && (
        <div className="card p-4 border border-accent-3 text-accent-3 text-sm font-semibold">
          🚫 Falta injustificada registrada no período — a premiação ativada foi zerada (regra de assiduidade).
        </div>
      )}
      {!painel.ativado.faltouInjustificada && painel.ativado.isZero && (
        <div className="card p-4 border border-accent-3 text-accent-3 text-sm font-semibold">
          ⚠️ RENOV. MV, ALTAS ou a faixa de Aparelhos (ativados) está em Faixa 0 — a parte determinante da premiação ativada está zerada.
        </div>
      )}

      <IndicatorDonuts painel={painel} faixas={faixas} />

      <div>
        <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wide mb-2">Detalhamento — lançado (todas, exceto canceladas)</h3>
        <ResultadoGrid resultado={painel.lancado} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-good uppercase tracking-wide mb-2">Detalhamento — ativado (conta para faixa/premiação)</h3>
        <ResultadoGrid resultado={painel.ativado} />
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wide mb-3">
          Quanto falta para a próxima faixa — sua posição atual está destacada
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <MiniFaixaTable title="RENOV. MV" rows={faixas.faixasMV} faixaAtual={painel.ativado.faixaMV} color={COLORS.mv} />
          <MiniFaixaTable title="RENOV. FB/AVA" rows={faixas.faixasFbava} faixaAtual={fFbavaAtivado.faixa} color={COLORS.fbava} />
          <MiniFaixaTable title="ALTAS" rows={faixas.faixasAltas} faixaAtual={painel.ativado.faixaALTAS} color={COLORS.altas} />
          <AparelhoFaixaTable faixas={faixas} faixaAtual={painel.ativado.faixaAparelhosIndicador} />
        </div>
      </div>
    </div>
  );
}
