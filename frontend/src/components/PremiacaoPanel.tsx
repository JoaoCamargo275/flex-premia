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

const ROW_H = 104; // altura de cada linha da corrida de barras, em px
const MEDALS = ["🥇", "🥈", "🥉", "🏅"];
const ICONS: Record<string, string> = { mv: "📱", fbava: "🔄", altas: "🚀", aparelhos: "💰" };
// As 6 faixas de MV, ALTAS, FB/AVA e Aparelhos (determinante) usam a mesma
// progressão relativa de meta (60/80/100/120/150/200%), então convertida
// para fração da Faixa 6 de cada frente, as posições das linhas de grade
// caem sempre nos mesmos pontos — por isso dá pra desenhar um único eixo X.
const FAIXA_GRID_FRACOES = [0.3, 0.4, 0.5, 0.6, 0.75, 1.0];

interface BarraFrente {
  id: string;
  label: string;
  color: string;
  lancado: number;
  ativado: number;
  scaleMax: number;
  unidade: "pts" | "reais";
  faixaLabel: string;
}

function BarraLinha({ row, top, rank }: { row: BarraFrente; top: number; rank: number }) {
  const fracAtivado = row.scaleMax > 0 ? row.ativado / row.scaleMax : 0;
  const fracLancado = row.scaleMax > 0 ? row.lancado / row.scaleMax : 0;
  const widthAtivado = Math.max(0, Math.min(100, fracAtivado * 100));
  const widthLancado = Math.max(0, Math.min(100, fracLancado * 100));
  const alemDoTeto = fracAtivado > 1;
  const valorTxt = (n: number) => (row.unidade === "reais" ? fmtBRL(n) : `${fmtNum(n)} pts`);

  return (
    <div
      className="absolute left-0 right-0"
      style={{ top, height: ROW_H, transition: "top .6s cubic-bezier(.4,0,.2,1)" }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-xs font-bold">
          <span className="text-sm leading-none">{MEDALS[rank] ?? "🏅"}</span>
          <span className="text-base leading-none">{ICONS[row.id]}</span>
          {row.label}
        </span>
        <span
          className="text-[.68rem] font-extrabold px-2.5 py-0.5 rounded-full text-white"
          style={{ background: "var(--grad)", boxShadow: "0 2px 10px rgba(236,26,114,.35)" }}
        >
          {row.faixaLabel}
        </span>
      </div>
      <div className="relative h-7 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.05)", boxShadow: "inset 0 1px 3px rgba(0,0,0,.4)" }}>
        {/* linhas de grade das 6 faixas */}
        {FAIXA_GRID_FRACOES.map((f, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px z-10"
            style={{ left: `${f * 100}%`, background: "rgba(255,255,255,.10)" }}
          />
        ))}
        {/* trilha "lançado" — mesma rampa rosa→roxo, bem mais clara (meter track) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${widthLancado}%`, background: "var(--grad)", opacity: 0.22, transition: "width .7s cubic-bezier(.4,0,.2,1)" }}
        />
        {/* preenchimento "ativado" — rampa cheia com brilho */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${widthAtivado}%`,
            background: "var(--grad)",
            transition: "width .7s cubic-bezier(.4,0,.2,1)",
            boxShadow: widthAtivado > 0 ? "0 0 14px rgba(236,26,114,.55)" : "none",
          }}
        >
          {/* brilho superior (gloss), reforça o efeito "criado por IA" sem tirar contraste do texto */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 rounded-t-full"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0))" }}
          />
        </div>
        {widthAtivado > 12 && (
          <span className="absolute inset-y-0 flex items-center text-[.65rem] font-extrabold text-white z-10" style={{ right: `${100 - widthAtivado}%`, transform: "translateX(6px)" }}>
            {valorTxt(row.ativado)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[.68rem] text-ink-dim">
          {valorTxt(row.ativado)} ativado{row.unidade === "pts" ? "s" : ""} de {valorTxt(row.lancado)} lançado{row.unidade === "pts" ? "s" : ""}
        </span>
        {alemDoTeto && (
          <span className="text-[.65rem] font-extrabold" style={{ background: "var(--grad)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            🚀 além da Faixa 6
          </span>
        )}
      </div>
    </div>
  );
}

function FrenteBarRace({ painel, faixas }: { painel: PainelColaborador; faixas: FaixaTables }) {
  const fFbavaAtivado = faixaAlcancada(faixas.faixasFbava, painel.ativado.ptsFBAVA);
  const fFbavaLancado = faixaAlcancada(faixas.faixasFbava, painel.lancado.ptsFBAVA);

  // RENOV. MV, ALTAS e Aparelhos são determinantes: a faixa que efetivamente
  // conta (e é paga) é sempre a mesma — a menor entre as três. FB/AVA é
  // bônus à parte e mantém sua própria faixa.
  const faixaDet = painel.ativado.faixaDeterminante;

  const mvMax = faixas.faixasMV[faixas.faixasMV.length - 1]?.pts ?? 1;
  const fbavaMax = faixas.faixasFbava[faixas.faixasFbava.length - 1]?.pts ?? 1;
  const altasMax = faixas.faixasAltas[faixas.faixasAltas.length - 1]?.pts ?? 1;
  const aparelhosMax = faixas.aparelhoFaixas[faixas.aparelhoFaixas.length - 1]?.valor ?? 1;

  const rows: BarraFrente[] = [
    {
      id: "mv",
      label: "RENOV. MV",
      color: COLORS.mv,
      lancado: painel.lancado.ptsMV,
      ativado: painel.ativado.ptsMV,
      scaleMax: mvMax,
      unidade: "pts",
      faixaLabel: `Faixa ${faixaDet}`,
    },
    {
      id: "fbava",
      label: "RENOV. FB/AVA",
      color: COLORS.fbava,
      lancado: painel.lancado.ptsFBAVA,
      ativado: painel.ativado.ptsFBAVA,
      scaleMax: fbavaMax,
      unidade: "pts",
      faixaLabel: `Faixa ${fFbavaAtivado.faixa}`,
    },
    {
      id: "altas",
      label: "ALTAS",
      color: COLORS.altas,
      lancado: painel.lancado.ptsAltas,
      ativado: painel.ativado.ptsAltas,
      scaleMax: altasMax,
      unidade: "pts",
      faixaLabel: `Faixa ${faixaDet}`,
    },
    {
      id: "aparelhos",
      label: "Aparelhos",
      color: COLORS.aparelhos,
      lancado: painel.lancado.valorAparelhos,
      ativado: painel.ativado.valorAparelhos,
      scaleMax: aparelhosMax,
      unidade: "reais",
      faixaLabel: `Faixa ${faixaDet}`,
    },
  ];

  // ranking pela fração já ativada da própria régua (comparação justa entre pontos e R$)
  const ranked = [...rows].sort((a, b) => {
    const fa = a.scaleMax > 0 ? a.ativado / a.scaleMax : 0;
    const fb = b.scaleMax > 0 ? b.ativado / b.scaleMax : 0;
    return fb - fa;
  });
  const topOf: Record<string, number> = {};
  const rankOf: Record<string, number> = {};
  ranked.forEach((r, i) => {
    topOf[r.id] = i * ROW_H;
    rankOf[r.id] = i;
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wide">
          Pontos por frente — ordenado pela mais avançada
        </h3>
        <div className="flex items-center gap-4 text-[.68rem] text-ink-dim">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--grad)" }} />
            Ativado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--grad)", opacity: 0.28 }} />
            Lançado
          </span>
        </div>
      </div>
      <div className="card p-5">
        <div className="relative" style={{ height: rows.length * ROW_H }}>
          {rows.map((row) => (
            <BarraLinha key={row.id} row={row} top={topOf[row.id]} rank={rankOf[row.id]} />
          ))}
        </div>
        <div className="relative mt-1 h-4">
          {FAIXA_GRID_FRACOES.map((f, i) => (
            <span
              key={i}
              className="absolute text-[.6rem] text-ink-dim -translate-x-1/2"
              style={{ left: `${f * 100}%` }}
            >
              Faixa {i + 1}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-dim mt-2">
        RENOV. MV, ALTAS e Aparelhos são determinantes: a faixa paga é sempre a <b>menor</b> entre as três (por isso mostram a
        mesma faixa). RENOV. FB/AVA é bônus à parte e mantém sua própria faixa.
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

      <FrenteBarRace painel={painel} faixas={faixas} />

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
