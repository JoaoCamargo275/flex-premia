import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { fmtBRL, fmtNum } from "../lib/format";
import type { ResultadoPremiacao, PainelColaborador, FaixaTables, FaixaRow, AparelhoBonusRow } from "../lib/premiacao-types";

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

/** Réplica de alemDoTeto() do simulador: true se os pontos já passaram da última faixa da tabela. */
function alemDoTeto(rows: FaixaRow[], pts: number): boolean {
  const max = rows[rows.length - 1];
  return !!max && pts > max.pts;
}

function bonusAparelhoAtual(rows: AparelhoBonusRow[], valor: number): AparelhoBonusRow {
  let atual = rows[0];
  for (const f of rows) {
    if (f.faixa !== 0 && valor >= f.valor) atual = f;
  }
  return atual ?? { faixa: 0, valor: 0, mult: 0 };
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

  // RENOV. MV, ALTAS e Aparelhos são determinantes: a faixa que efetivamente
  // conta (e é paga) é sempre a mesma — a menor entre as três. Por isso os
  // três anéis abaixo mostram painel.ativado.faixaDeterminante, e não a
  // faixa que cada frente atingiria isoladamente. FB/AVA é bônus à parte e
  // continua mostrando sua própria faixa.
  const faixaDet = painel.ativado.faixaDeterminante;

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
            centerTop={`Faixa ${faixaDet}`}
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
            centerTop={`Faixa ${faixaDet}`}
            centerSub={`${fmtNum(painel.ativado.ptsAltas)} / ${fmtNum(painel.lancado.ptsAltas)} pts`}
          />
        </div>
        <div className="card p-4 flex flex-col gap-2 items-center">
          <span className="text-xs font-bold">Aparelhos</span>
          <Donut
            ativado={painel.ativado.valorAparelhos}
            lancado={painel.lancado.valorAparelhos}
            color={COLORS.aparelhos}
            centerTop={`Faixa ${faixaDet}`}
            centerSub={fmtBRL(painel.ativado.valorAparelhos)}
          />
        </div>
      </div>
      <p className="text-xs text-ink-dim mt-2">
        RENOV. MV, ALTAS e Aparelhos são determinantes: a faixa paga é sempre a <b>menor</b> entre as três (por isso os três anéis
        mostram a mesma faixa). RENOV. FB/AVA é bônus à parte e mantém sua própria faixa.
      </p>
      {faixas.faixasFbava.length > 0 && fFbavaLancado.faixa !== fFbavaAtivado.faixa && (
        <p className="text-xs text-ink-dim mt-1">
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
  ptsAtual,
  color,
}: {
  title: string;
  rows: FaixaRow[];
  /** Faixa a destacar como "atual" (para MV/ALTAS, isso é a faixa DETERMINANTE, não a própria) */
  faixaAtual: number;
  /** Pontuação real do indicador (usada só para marcar quais faixas já foram numericamente alcançadas) */
  ptsAtual: number;
  color: string;
}) {
  const semTeto = faixaAtual === 6 && alemDoTeto(rows, ptsAtual);
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${color}` }}>
      <h4 className="text-sm font-bold mb-3">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[460px]">
          <thead>
            <tr className="text-left text-ink-dim uppercase">
              <th className="py-1 pr-2">Faixa</th>
              <th className="py-1 pr-2">% da meta</th>
              <th className="py-1 pr-2">Pontuação</th>
              <th className="py-1 pr-2">Premiação (R$)</th>
              <th className="py-1 pr-2">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const current = r.faixa === faixaAtual;
              const reached = !current && r.faixa !== 0 && ptsAtual >= r.pts;
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
                  <td className="py-1.5 pr-2">{r.pctFinal == null ? "%" : `${(r.pctFinal * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {semTeto && (
        <div
          className="text-xs font-bold mt-3 rounded-lg px-3 py-2"
          style={{ background: "linear-gradient(135deg, #ec1a72, #8b3dff)", color: "#fff" }}
        >
          🚀 Sem teto: com {fmtNum(ptsAtual)} pts você já passou da Faixa 6 — o percentual fica travado em{" "}
          {((rows[rows.length - 1]?.pctFinal ?? 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% e a premiação
          continua subindo proporcionalmente aos pontos.
        </div>
      )}
    </div>
  );
}

function AparelhoFaixaTable({ faixas, faixaAtual, valorAtual }: { faixas: FaixaTables; faixaAtual: number; valorAtual: number }) {
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${COLORS.aparelhos}` }}>
      <h4 className="text-sm font-bold mb-3">Aparelhos — faixa do indicador (determinante, R$ 6 mil a R$ 20 mil)</h4>
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
              const reached = !current && r.faixa !== 0 && valorAtual >= r.valor;
              return (
                <tr
                  key={r.faixa}
                  className="border-t border-white/5"
                  style={current ? { color: COLORS.aparelhos, fontWeight: 800, background: "rgba(255,255,255,.04)" } : reached ? { color: "var(--ink)" } : { color: "var(--ink-dim)" }}
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
      <p className="text-xs text-ink-dim mt-2">
        Vendendo abaixo de R$ 6.000,00 (Faixa 0), este indicador zera — e isso zera a parte determinante da premiação (RENOV. MV
        e ALTAS também), mesmo que eles estejam em faixas altas.
      </p>
    </div>
  );
}

function AparelhoBonusTable({
  bonusRows,
  valorAtual,
  bonusValorAtual,
}: {
  bonusRows: AparelhoBonusRow[];
  valorAtual: number;
  bonusValorAtual: number;
}) {
  const rows = bonusRows.filter((r) => r.faixa !== 0);
  const atual = bonusAparelhoAtual(bonusRows, valorAtual);
  const advance = valorAtual >= 50000;
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${COLORS.aparelhos}` }}>
      <h4 className="text-sm font-bold mb-3">Aparelhos — bônus em R$ sempre pago (R$ 10 mil a R$ 50 mil)</h4>
      <div className="rounded-lg px-3 py-2 mb-3 flex justify-between items-center flex-wrap gap-2" style={{ background: "rgba(139,61,255,.1)", border: "1px solid rgba(139,61,255,.35)" }}>
        <div>
          <div className="text-[.65rem] uppercase tracking-wide text-ink-dim">Bônus em R$</div>
          <div className="text-base font-extrabold" style={{ color: COLORS.aparelhos }}>{fmtBRL(bonusValorAtual)}</div>
        </div>
        <div className="text-right">
          <div className="text-[.65rem] uppercase tracking-wide text-ink-dim">Percentual aplicado</div>
          <div className="text-base font-extrabold" style={{ color: COLORS.aparelhos }}>{(atual.mult * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[320px]">
          <thead>
            <tr className="text-left text-ink-dim uppercase">
              <th className="py-1 pr-2">Nível</th>
              <th className="py-1 pr-2">Valor vendido a partir de</th>
              <th className="py-1 pr-2">% de bônus aplicado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const hit = valorAtual >= r.valor;
              return (
                <tr
                  key={r.faixa}
                  className="border-t border-white/5"
                  style={hit ? { color: COLORS.aparelhos, fontWeight: 700 } : { color: "var(--ink-dim)" }}
                >
                  <td className="py-1.5 pr-2">Nível {r.faixa}</td>
                  <td className="py-1.5 pr-2">{fmtBRL(r.valor)}</td>
                  <td className="py-1.5 pr-2">{(r.mult * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        className="text-xs font-semibold mt-3 rounded-lg px-3 py-2"
        style={
          advance
            ? { background: "rgba(236,26,114,.14)", border: "1px solid rgba(236,26,114,.4)", color: COLORS.mv }
            : { background: "rgba(255,255,255,.03)", border: "1px dashed var(--line)", color: "var(--ink-dim)" }
        }
      >
        {advance
          ? "🎉 Atingiu R$ 50.000,00 em aparelhos — avança 1 faixa adicional na classificação final!"
          : `Ainda não atingiu R$ 50.000,00 em aparelhos — não há avanço extra de faixa (faltam ${fmtBRL(Math.max(0, 50000 - valorAtual))})`}
      </div>
      <p className="text-xs text-ink-dim mt-2">
        Este bônus soma direto na premiação final, em qualquer hipótese, mesmo que a faixa do indicador (tabela acima) esteja em
        Faixa 0.
      </p>
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

function FrenteBreakdown({ resultado }: { resultado: ResultadoPremiacao }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[.7rem] text-ink-dim mt-3">
      <span><b className="text-ink">{fmtNum(resultado.ptsMV)}</b> RENOV. MV</span>
      <span>·</span>
      <span><b className="text-ink">{fmtNum(resultado.ptsFBAVA)}</b> RENOV. FB/AVA</span>
      <span>·</span>
      <span><b className="text-ink">{fmtNum(resultado.ptsAltas)}</b> ALTAS</span>
      <span>·</span>
      <span><b className="text-ink">{fmtBRL(resultado.valorAparelhos)}</b> Aparelhos vendidos</span>
    </div>
  );
}

export function PainelLancadoAtivado({ painel, faixas }: { painel: PainelColaborador; faixas: FaixaTables }) {
  const ptsLancadoTotal = painel.lancado.ptsMV + painel.lancado.ptsFBAVA + painel.lancado.ptsAltas;
  const ptsAtivadoTotal = painel.ativado.ptsMV + painel.ativado.ptsFBAVA + painel.ativado.ptsAltas;
  const fFbavaAtivado = faixaAlcancada(faixas.faixasFbava, painel.ativado.ptsFBAVA);

  return (
    <div className="flex flex-col gap-8">
      {/* Pontos: informação principal, já dividida entre as 4 frentes */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Pontos lançados (todas as vendas)</div>
          <div className="text-4xl font-extrabold">{fmtNum(ptsLancadoTotal)} <span className="text-lg font-bold text-ink-dim">pts</span></div>
          <div className="text-xs text-ink-dim mt-2">Premiação lançada estimada: {fmtBRL(painel.lancado.premiacaoFinal)}</div>
          <FrenteBreakdown resultado={painel.lancado} />
        </div>
        <div className="card p-5" style={{ border: "1px solid rgba(34,197,94,.4)" }}>
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Pontos ativados (conta oficialmente)</div>
          <div className="text-4xl font-extrabold text-good">{fmtNum(ptsAtivadoTotal)} <span className="text-lg font-bold text-ink-dim">pts</span></div>
          <div className="text-xs text-ink-dim mt-2">Premiação ativada estimada: {fmtBRL(painel.ativado.premiacaoFinal)}</div>
          <FrenteBreakdown resultado={painel.ativado} />
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
        <p className="text-xs text-ink-dim mb-3">
          RENOV. MV e ALTAS mostram a <b>faixa determinante</b> (a menor entre RENOV. MV, ALTAS e Aparelhos), que é a que
          efetivamente é paga — mesmo que a pontuação isolada desse indicador já alcance uma faixa maior (nesse caso, a faixa
          maior aparece marcada como "já alcançada" na tabela, mas não é a que conta para o valor final).
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <MiniFaixaTable
            title="RENOV. MV"
            rows={faixas.faixasMV}
            faixaAtual={painel.ativado.faixaDeterminante}
            ptsAtual={painel.ativado.ptsMV}
            color={COLORS.mv}
          />
          <MiniFaixaTable
            title="RENOV. FB/AVA (bônus independente, não é determinante)"
            rows={faixas.faixasFbava}
            faixaAtual={fFbavaAtivado.faixa}
            ptsAtual={painel.ativado.ptsFBAVA}
            color={COLORS.fbava}
          />
          <MiniFaixaTable
            title="ALTAS"
            rows={faixas.faixasAltas}
            faixaAtual={painel.ativado.faixaDeterminante}
            ptsAtual={painel.ativado.ptsAltas}
            color={COLORS.altas}
          />
          <AparelhoFaixaTable
            faixas={faixas}
            faixaAtual={painel.ativado.faixaDeterminante}
            valorAtual={painel.ativado.valorAparelhos}
          />
          <div className="md:col-span-2">
            <AparelhoBonusTable
              bonusRows={faixas.aparelhoBonus}
              valorAtual={painel.ativado.valorAparelhos}
              bonusValorAtual={painel.ativado.bonusAparelhosRS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
