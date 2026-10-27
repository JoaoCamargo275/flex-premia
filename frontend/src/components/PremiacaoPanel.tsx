import { fmtBRL, fmtNum } from "../lib/format";
import type { ResultadoPremiacao, PainelColaborador, FaixaTables, FaixaRow, AparelhoBonusRow, AparelhoFaixaRow } from "../lib/premiacao-types";
import { PERFIL_LABELS, type Perfil } from "../lib/types";

function PerfilNaoConfigurado({ perfil }: { perfil: string }) {
  const label = PERFIL_LABELS[perfil as Perfil] ?? perfil;
  return (
    <div className="card p-6 text-center">
      <div className="text-3xl mb-2">🛠️</div>
      <h3 className="text-base font-bold mb-1">Perfil "{label}" ainda não configurado</h3>
      <p className="text-sm text-ink-dim max-w-md mx-auto">
        As réguas de faixas e metas desse perfil ainda não foram cadastradas na plataforma. Assim que forem definidas, o
        painel de premiação passa a mostrar os números normalmente.
      </p>
    </div>
  );
}

const COLORS = {
  mv: "#ec1a72",
  fbava: "#9c94b3",
  altas: "#8b3dff",
  altas_pf: "#f59e0b",
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
const ICONS: Record<string, string> = { mv: "📱", altas: "🚀", altas_pf: "🧑", aparelhos: "💰" };
// RENOV. MV (já com FB/AVA somado) e ALTAS usam a mesma progressão de
// pontos por faixa (200/300/400/500/600/700/800/1000 — Faixas 1 a 8), então
// convertida para fração da Faixa 8, as posições das linhas de grade caem
// sempre nos mesmos pontos — por isso dá pra desenhar um único eixo X.
function gridFracoes(rows: FaixaRow[]): number[] {
  const max = rows[rows.length - 1]?.pts || 1;
  return rows.filter((r) => r.faixa !== 0).map((r) => r.pts / max);
}

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

function BarraLinha({ row, top, rank, gridFracoes }: { row: BarraFrente; top: number; rank: number; gridFracoes: number[] }) {
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
        {/* linhas de grade das faixas */}
        {gridFracoes.map((f, i) => (
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
            🚀 além da última faixa
          </span>
        )}
      </div>
    </div>
  );
}

function FrenteBarRace({ painel, faixas }: { painel: PainelColaborador; faixas: FaixaTables }) {
  const legado = painel.ativado.legado;
  const fAltasPFAtivado = faixaAlcancada(faixas.faixasAltasPF, painel.ativado.ptsAltasPF);
  const bonusAparelhoAtivado = bonusAparelhoAtual(faixas.aparelhoBonus, painel.ativado.valorAparelhos);

  // RENOV. MV (já com FB/AVA somado) e ALTAS são frentes independentes —
  // cada uma mostra a própria faixa. ALTAS PF é bônus à parte (depende de a
  // Faixa_1 PJ estar liberada — ver aviso abaixo). Aparelhos não tem mais
  // régua de "faixa determinante": mostra o nível do bônus em R$.
  // Em meses ANTIGOS (legado = regra até SET/2026), usa as réguas antigas de
  // MV/ALTAS e os pontos de MV não incluem FB/AVA (que tem bônus próprio).
  const faixasMVAtual = legado ? faixas.faixasMVAntiga : faixas.faixasMV;
  const faixasAltasAtual = legado ? faixas.faixasAltasAntiga : faixas.faixasAltas;
  const mvMax = faixasMVAtual[faixasMVAtual.length - 1]?.pts ?? 1;
  const altasMax = faixasAltasAtual[faixasAltasAtual.length - 1]?.pts ?? 1;
  const altasPFMax = faixas.faixasAltasPF[faixas.faixasAltasPF.length - 1]?.pts ?? 1;
  const aparelhosMax = faixas.aparelhoBonus[faixas.aparelhoBonus.length - 1]?.valor ?? 1;

  const rows: BarraFrente[] = [
    {
      id: "mv",
      label: legado ? "RENOV. MV" : "RENOV. MV + FB/AVA",
      color: COLORS.mv,
      lancado: painel.lancado.ptsMV,
      ativado: painel.ativado.ptsMV,
      scaleMax: mvMax,
      unidade: "pts",
      faixaLabel: `Faixa ${painel.ativado.faixaMV}`,
    },
    {
      id: "altas",
      label: "ALTAS",
      color: COLORS.altas,
      lancado: painel.lancado.ptsAltas,
      ativado: painel.ativado.ptsAltas,
      scaleMax: altasMax,
      unidade: "pts",
      faixaLabel: `Faixa ${painel.ativado.faixaALTAS}`,
    },
    {
      id: "altas_pf",
      label: `ALTAS PF${painel.ativado.altasPFLiberado ? "" : " (bloqueado)"}`,
      color: COLORS.altas_pf,
      lancado: painel.lancado.ptsAltasPF,
      ativado: painel.ativado.ptsAltasPF,
      scaleMax: altasPFMax,
      unidade: "pts",
      faixaLabel: `Faixa ${fAltasPFAtivado.faixa}`,
    },
    {
      id: "aparelhos",
      label: "Aparelhos",
      color: COLORS.aparelhos,
      lancado: painel.lancado.valorAparelhos,
      ativado: painel.ativado.valorAparelhos,
      scaleMax: aparelhosMax,
      unidade: "reais",
      faixaLabel: `Nível ${bonusAparelhoAtivado.faixa}`,
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

  const fracoesMV = gridFracoes(faixasMVAtual);

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
            <BarraLinha key={row.id} row={row} top={topOf[row.id]} rank={rankOf[row.id]} gridFracoes={fracoesMV} />
          ))}
        </div>
        <div className="relative mt-1 h-4">
          {fracoesMV.map((f, i) => (
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
        {legado ? (
          <>
            Regra vigente até SET/2026: a faixa final de RENOV. MV e ALTAS é determinada pela <b>menor</b> faixa entre
            RENOV. MV, ALTAS e Aparelhos (régua própria de R$ 6 mil a R$ 20 mil). RENOV. FB/AVA tem bônus à parte. ALTAS PF
            é bônus à parte.
          </>
        ) : (
          <>
            RENOV. MV (já somado com FB/AVA) e ALTAS são frentes independentes — cada uma paga pela própria faixa, sem mais
            a regra de "menor faixa entre as frentes". ALTAS PF é bônus à parte. A premiação só é paga se as duas travas de
            elegibilidade abaixo (6 BL + R$6.000,00 em Aparelhos no período) estiverem batidas.
          </>
        )}
      </p>
      {!painel.ativado.altasPFLiberado && (
        <div className="text-xs font-semibold mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.4)", color: COLORS.altas_pf }}>
          🔒 O bônus de ALTAS PF ainda não está liberado: é preciso atingir ao menos a Faixa 1 (ativado) em RENOV. MV
          {legado ? ", ALTAS e Aparelhos" : " e ALTAS"} antes de as vendas PF gerarem premiação.
        </div>
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
  const faixaMaxima = rows[rows.length - 1]?.faixa ?? 0;
  const semTeto = faixaAtual === faixaMaxima && alemDoTeto(rows, ptsAtual);
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
          🚀 Sem teto: com {fmtNum(ptsAtual)} pts você já passou da Faixa {faixaMaxima} — o percentual fica travado em{" "}
          {((rows[rows.length - 1]?.pctFinal ?? 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% e a premiação
          continua subindo proporcionalmente aos pontos.
        </div>
      )}
    </div>
  );
}

const BL_MINIMO_MES = 6;
const APARELHOS_MINIMO_MES = 6000;

function ElegibilidadeCard({ resultado }: { resultado: ResultadoPremiacao }) {
  const blOk = resultado.blAtivadas >= BL_MINIMO_MES;
  const aparelhosOk = resultado.valorAparelhos >= APARELHOS_MINIMO_MES;
  return (
    <div
      className="card p-4"
      style={{ borderTop: `3px solid ${resultado.destravou ? "#22c55e" : COLORS.altas_pf}` }}
    >
      <h4 className="text-sm font-bold mb-3">Elegibilidade — trava da premiação no mês</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        <div
          className="rounded-lg px-3 py-2"
          style={{ background: blOk ? "rgba(34,197,94,.1)" : "rgba(245,158,11,.1)", border: `1px solid ${blOk ? "rgba(34,197,94,.4)" : "rgba(245,158,11,.4)"}` }}
        >
          <div className="text-[.65rem] uppercase tracking-wide text-ink-dim">BL (Internet Fixa) instaladas no mês</div>
          <div className="text-lg font-extrabold">{blOk ? "✅" : "⚠️"} {fmtNum(resultado.blAtivadas)} / {BL_MINIMO_MES}</div>
        </div>
        <div
          className="rounded-lg px-3 py-2"
          style={{ background: aparelhosOk ? "rgba(34,197,94,.1)" : "rgba(245,158,11,.1)", border: `1px solid ${aparelhosOk ? "rgba(34,197,94,.4)" : "rgba(245,158,11,.4)"}` }}
        >
          <div className="text-[.65rem] uppercase tracking-wide text-ink-dim">Aparelhos ativados no mês</div>
          <div className="text-lg font-extrabold">{aparelhosOk ? "✅" : "⚠️"} {fmtBRL(resultado.valorAparelhos)} / {fmtBRL(APARELHOS_MINIMO_MES)}</div>
        </div>
      </div>
      <p className="text-xs text-ink-dim mt-3">
        É preciso bater os dois mínimos no mês (6 BL instaladas <b>e</b> R$ 6.000,00 em Aparelhos ativados) para destravar a
        premiação. Faltando qualquer um dos dois, a premiação do período inteiro zera — incluindo RENOV. MV, ALTAS, o bônus
        ALTAS PF e o bônus em R$ de Aparelhos.
      </p>
    </div>
  );
}

function faixaAparelhoAtual(rows: AparelhoFaixaRow[], valor: number): AparelhoFaixaRow {
  let atual = rows[0];
  for (const f of rows) {
    if (f.faixa !== 0 && valor >= f.valor) atual = f;
  }
  return atual ?? { faixa: 0, valor: 0, metaPct: "< 60%" };
}

/** Régua antiga (até SET/2026) de Aparelhos — R$6 mil a R$20 mil — que era uma das frentes "determinantes" da faixa final. */
function AparelhoFaixaTable({ rows, valorAtual, faixaFinal }: { rows: AparelhoFaixaRow[]; valorAtual: number; faixaFinal: number }) {
  const atual = faixaAparelhoAtual(rows, valorAtual);
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${COLORS.aparelhos}` }}>
      <h4 className="text-sm font-bold mb-3">Aparelhos — régua antiga (R$ 6 mil a R$ 20 mil)</h4>
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
            {rows.map((r) => {
              const current = r.faixa === atual.faixa;
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
      <p className="text-xs text-ink-dim mt-3">
        Regra antiga: a faixa de Aparelhos entra no cálculo da faixa final (junto com RENOV. MV e ALTAS) pela regra da{" "}
        <b>menor faixa entre as frentes</b> — faixa final atual: <b style={{ color: COLORS.aparelhos }}>Faixa {faixaFinal}</b>.
      </p>
    </div>
  );
}

function AparelhoBonusTable({
  bonusRows,
  valorAtual,
  bonusValorAtual,
  legado,
  advanceThreshold = 50000,
  advanceMessage,
  footerNote,
}: {
  bonusRows: AparelhoBonusRow[];
  valorAtual: number;
  bonusValorAtual: number;
  legado?: boolean;
  /** Valor em R$ de Aparelhos pra avançar 1 faixa — varia por perfil (Consultivo: R$50 mil; Renovação Fixa: R$20 mil). */
  advanceThreshold?: number;
  /** Texto customizado pro aviso de avanço (perfis fora do Consultivo têm mecânica diferente). */
  advanceMessage?: string;
  /** Substitui o texto padrão sobre a trava de elegibilidade — alguns perfis não têm essa trava binária. */
  footerNote?: string;
}) {
  const rows = bonusRows.filter((r) => r.faixa !== 0);
  const atual = bonusAparelhoAtual(bonusRows, valorAtual);
  const advance = valorAtual >= advanceThreshold;
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${COLORS.aparelhos}` }}>
      <h4 className="text-sm font-bold mb-3">Aparelhos — bônus em R$ (R$ 10 mil a R$ 50 mil)</h4>
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
          ? advanceMessage ??
            (legado
              ? `🎉 Atingiu ${fmtBRL(advanceThreshold)} em aparelhos — a faixa final (determinante) avança 1 faixa!`
              : `🎉 Atingiu ${fmtBRL(advanceThreshold)} em aparelhos — a frente (RENOV. MV ou ALTAS) que estiver na faixa mais baixa avança 1 faixa!`)
          : `Ainda não atingiu ${fmtBRL(advanceThreshold)} em aparelhos — não há avanço extra de faixa (faltam ${fmtBRL(Math.max(0, advanceThreshold - valorAtual))})`}
      </div>
      <p className="text-xs text-ink-dim mt-2">
        {footerNote ??
          "Esse bônus soma à parte, na mesma mecânica do avanço de faixa acima — mas só é pago se as travas de elegibilidade (6 BL + R$ 6.000,00 em Aparelhos no mês) estiverem batidas."}
      </p>
    </div>
  );
}

function ResultadoGrid({ resultado }: { resultado: ResultadoPremiacao }) {
  // Na regra ANTIGA (legado), RENOV. FB/AVA tem régua e bônus próprios, à
  // parte de RENOV. MV — ptsMV/valorMV NÃO incluem FB/AVA nesse caso (ver
  // calcularPremiacaoAntiga). Por isso aqui é preciso um card dedicado pro
  // bônus de FB/AVA só em legado; na regra nova FB/AVA já vem somado dentro
  // de ptsMV/valorMV, então o card de cima já conta a história inteira.
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat
        label={resultado.legado ? "RENOV. MV" : "RENOV. MV + FB/AVA"}
        value={`Faixa ${resultado.faixaMV}`}
        sub={
          resultado.legado
            ? `${fmtNum(resultado.ptsMV)} pts · ${fmtBRL(resultado.valorMV)}`
            : `${fmtNum(resultado.ptsMV)} pts (${fmtNum(resultado.ptsFBAVA)} de FB/AVA) · ${fmtBRL(resultado.valorMV)}`
        }
      />
      {resultado.legado && (
        <Stat
          label="Bônus RENOV. FB/AVA"
          value={fmtBRL(resultado.bonusFBAVA)}
          sub={`${fmtNum(resultado.ptsFBAVA)} pts`}
        />
      )}
      <Stat
        label="ALTAS"
        value={`Faixa ${resultado.faixaALTAS}`}
        sub={`${fmtNum(resultado.ptsAltas)} pts · ${fmtBRL(resultado.valorALTAS)}`}
      />
      <Stat
        label="Bônus ALTAS PF"
        value={resultado.altasPFLiberado ? fmtBRL(resultado.bonusAltasPF) : "🔒 Bloqueado"}
        sub={`${fmtNum(resultado.ptsAltasPF)} pts`}
      />
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
  // Na regra ANTIGA (legado), ptsMV NÃO inclui FB/AVA (que tem régua/bônus
  // próprios à parte) — mostrar só "RENOV. MV + FB/AVA" com o valor de
  // ptsMV faria parecer que a pontuação de RENOV. FB sumiu. Por isso, em
  // legado, mostra os dois separados (igual já é feito no painel da
  // Renovação Fixa).
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[.7rem] text-ink-dim mt-3">
      <span><b className="text-ink">{fmtNum(resultado.ptsMV)}</b> {resultado.legado ? "RENOV. MV" : "RENOV. MV + FB/AVA"}</span>
      <span>·</span>
      {resultado.legado && (
        <>
          <span>
            <b className="text-ink">{fmtNum(resultado.ptsFBAVA)}</b> RENOV. FB/AVA ({fmtBRL(resultado.bonusFBAVA)})
          </span>
          <span>·</span>
        </>
      )}
      <span><b className="text-ink">{fmtNum(resultado.ptsAltas)}</b> ALTAS</span>
      <span>·</span>
      <span><b className="text-ink">{fmtNum(resultado.ptsAltasPF)}</b> ALTAS PF</span>
      <span>·</span>
      <span><b className="text-ink">{fmtBRL(resultado.valorAparelhos)}</b> Aparelhos vendidos</span>
      <span>·</span>
      <span><b className="text-ink">{fmtNum(resultado.blAtivadas)}</b> BL ativadas</span>
    </div>
  );
}

/** Degraus do bônus de BL (perfil Renovação Fixa) — reaproveita FaixaRow: pts = qtd mínima de BL, valor = R$ do degrau. */
function BLBonusTable({ rows, qtdAtual, bonusAtual }: { rows: FaixaRow[]; qtdAtual: number; bonusAtual: number }) {
  const degraus = rows.filter((r) => r.faixa !== 0);
  return (
    <div className="card p-4" style={{ borderTop: `3px solid ${COLORS.altas_pf}` }}>
      <h4 className="text-sm font-bold mb-3">Bônus de BL (Internet Fixa)</h4>
      <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.35)" }}>
        <div className="text-[.65rem] uppercase tracking-wide text-ink-dim">Bônus em R$</div>
        <div className="text-base font-extrabold" style={{ color: COLORS.altas_pf }}>{fmtBRL(bonusAtual)}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[260px]">
          <thead>
            <tr className="text-left text-ink-dim uppercase">
              <th className="py-1 pr-2">Qtd. de BL</th>
              <th className="py-1 pr-2">Bônus (R$)</th>
            </tr>
          </thead>
          <tbody>
            {degraus.map((r) => {
              const hit = qtdAtual >= r.pts;
              return (
                <tr
                  key={r.faixa}
                  className="border-t border-white/5"
                  style={hit ? { color: COLORS.altas_pf, fontWeight: 700 } : { color: "var(--ink-dim)" }}
                >
                  <td className="py-1.5 pr-2">{fmtNum(r.pts)}+</td>
                  <td className="py-1.5 pr-2">{fmtBRL(r.valor)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-dim mt-2">Bônus fixo por degrau de quantidade de BL ativada no mês — não é percentual.</p>
    </div>
  );
}

/**
 * Painel do perfil RENOVAÇÃO FIXA — régua própria (pool único de pontos:
 * RENOV. MV + RENOV. FB + ALTAS), bônus de Aparelhos (avanço em R$20 mil) e
 * bônus de BL por degrau de quantidade. Não reaproveita FrenteBarRace/
 * MiniFaixaTable/ElegibilidadeCard do Consultivo — a mecânica é diferente o
 * bastante pra justificar um componente próprio (ver calculo-premiacao.ts).
 */
function PainelRenovFixa({ painel, faixas }: { painel: PainelColaborador; faixas: FaixaTables }) {
  const { lancado, ativado } = painel;
  // Em rampagem, a régua usada no cálculo deste período é a de rampagem
  // (menos pts, mesmo R$) — só cai na normal se essa régua ainda não tiver
  // sido cadastrada (mesma regra de segurança do backend, ver aggregate.ts).
  const reguaRampagem = painel.mesRampagem ? faixas.faixasRenovFixaRampagem[painel.mesRampagem] : undefined;
  const reguaAtual = reguaRampagem && reguaRampagem.length > 0 ? reguaRampagem : faixas.faixasRenovFixa;
  const faixaMaxima = reguaAtual[reguaAtual.length - 1]?.faixa ?? 0;
  const semTeto = ativado.faixaMV === faixaMaxima && alemDoTeto(reguaAtual, ativado.ptsMV);

  return (
    <div className="flex flex-col gap-8">
      {painel.mesRampagem && (
        <div
          className="text-xs font-bold rounded-lg px-3 py-2"
          style={{ background: "rgba(34,197,94,.12)", color: "var(--good)", border: "1px solid rgba(34,197,94,.35)" }}
        >
          🚀 Mês {painel.mesRampagem} de 3 em rampagem — a régua abaixo já está com a pontuação reduzida desse período
          (o valor em R$ de cada faixa é o mesmo de sempre).
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Pontos lançados (pool único)</div>
          <div className="text-4xl font-extrabold">{fmtNum(lancado.ptsMV)} <span className="text-lg font-bold text-ink-dim">pts</span></div>
          <div className="text-xs text-ink-dim mt-2">Premiação lançada estimada: {fmtBRL(lancado.premiacaoFinal)}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[.7rem] text-ink-dim mt-3">
            <span><b className="text-ink">{fmtNum(lancado.ptsFBAVA)}</b> de RENOV. FB</span>
            <span>·</span>
            <span><b className="text-ink">{fmtNum(lancado.ptsAltas)}</b> de ALTAS</span>
            <span>·</span>
            <span><b className="text-ink">{fmtBRL(lancado.valorAparelhos)}</b> Aparelhos vendidos</span>
            <span>·</span>
            <span><b className="text-ink">{fmtNum(lancado.blAtivadas)}</b> BL ativadas</span>
          </div>
        </div>
        <div className="card p-5" style={{ border: "1px solid rgba(34,197,94,.4)" }}>
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Pontos ativados (conta oficialmente)</div>
          <div className="text-4xl font-extrabold text-good">{fmtNum(ativado.ptsMV)} <span className="text-lg font-bold text-ink-dim">pts</span></div>
          <div className="text-xs text-ink-dim mt-2">Premiação ativada estimada: {fmtBRL(ativado.premiacaoFinal)}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[.7rem] text-ink-dim mt-3">
            <span><b className="text-ink">{fmtNum(ativado.ptsFBAVA)}</b> de RENOV. FB</span>
            <span>·</span>
            <span><b className="text-ink">{fmtNum(ativado.ptsAltas)}</b> de ALTAS</span>
            <span>·</span>
            <span><b className="text-ink">{fmtBRL(ativado.valorAparelhos)}</b> Aparelhos vendidos</span>
            <span>·</span>
            <span><b className="text-ink">{fmtNum(ativado.blAtivadas)}</b> BL ativadas</span>
          </div>
        </div>
      </div>

      {ativado.faltouInjustificada && (
        <div className="card p-4 border border-accent-3 text-accent-3 text-sm font-semibold">
          🚫 Falta injustificada registrada no período — a premiação ativada foi zerada (regra de assiduidade).
        </div>
      )}
      {!ativado.faltouInjustificada && ativado.isZero && (
        <div className="card p-4 border border-accent-3 text-accent-3 text-sm font-semibold">
          ⚠️ Ainda não alcançou a Faixa 1 no período — a premiação ativada está zerada.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Faixa" value={`Faixa ${ativado.faixaMV}`} sub={`${fmtNum(ativado.ptsMV)} pts · ${fmtBRL(ativado.valorMV)}`} />
        <Stat label="Bônus Aparelhos" value={fmtBRL(ativado.bonusAparelhosRS)} sub={fmtBRL(ativado.valorAparelhos) + " vendidos"} />
        <Stat label="Bônus de BL" value={fmtBRL(ativado.bonusBL)} sub={`${fmtNum(ativado.blAtivadas)} BL ativadas`} />
        <Stat label="Premiação total" value={fmtBRL(ativado.premiacaoFinal)} />
      </div>

      <p className="text-xs text-ink-dim">
        RENOV. MV + RENOV. FB + ALTAS somam um pool único de pontos, pago por uma régua só (sem a regra de "menor faixa
        entre as frentes" do Consultivo). RENOV. FB tem bônus de BL à parte. Carência: toda venda conta pelo mês real de
        ativação (sem o adiantamento de 2 meses do Consultivo).
      </p>

      <div>
        <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wide mb-3">
          Quanto falta para a próxima faixa — sua posição atual está destacada
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <MiniFaixaTable
            title={`RENOV. MV + RENOV. FB + ALTAS (pool único)${painel.mesRampagem ? ` — rampagem mês ${painel.mesRampagem}` : ""}`}
            rows={reguaAtual}
            faixaAtual={ativado.faixaMV}
            ptsAtual={ativado.ptsMV}
            color={COLORS.mv}
          />
          <BLBonusTable rows={faixas.blBonusRenovFixa} qtdAtual={ativado.blAtivadas} bonusAtual={ativado.bonusBL} />
          <div className="md:col-span-2">
            <AparelhoBonusTable
              bonusRows={faixas.aparelhoBonus}
              valorAtual={ativado.valorAparelhos}
              bonusValorAtual={ativado.bonusAparelhosRS}
              advanceThreshold={20000}
              advanceMessage="🎉 Atingiu R$ 20.000,00 em aparelhos — a faixa avança 1!"
              footerNote="Esse bônus soma à parte, na mesma mecânica do avanço de faixa acima."
            />
          </div>
        </div>
        {semTeto && (
          <div
            className="text-xs font-bold mt-3 rounded-lg px-3 py-2"
            style={{ background: "linear-gradient(135deg, #ec1a72, #8b3dff)", color: "#fff" }}
          >
            🚀 Sem teto: você já passou da Faixa {faixaMaxima} — a premiação continua subindo proporcionalmente aos pontos.
          </div>
        )}
      </div>
    </div>
  );
}

export function PainelLancadoAtivado({ painel, faixas }: { painel: PainelColaborador; faixas: FaixaTables }) {
  if (!painel.configurado) return <PerfilNaoConfigurado perfil={painel.perfil} />;
  if (painel.perfil === "RENOVACAO_FIXA") return <PainelRenovFixa painel={painel} faixas={faixas} />;
  const legado = painel.ativado.legado;
  // ptsMV já vem do backend com FB/AVA somado (regra nova) — não soma ptsFBAVA de novo aqui.
  // Na regra antiga (legado), ptsMV já vem SEM FB/AVA (que tem bônus à parte), então o total
  // aqui também não inclui FB/AVA — mantém consistência com o que cada regra de fato paga.
  const ptsLancadoTotal = painel.lancado.ptsMV + painel.lancado.ptsAltas + painel.lancado.ptsAltasPF;
  const ptsAtivadoTotal = painel.ativado.ptsMV + painel.ativado.ptsAltas + painel.ativado.ptsAltasPF;
  const fAltasPFAtivado = faixaAlcancada(faixas.faixasAltasPF, painel.ativado.ptsAltasPF);

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
          {legado
            ? "⚠️ Nenhuma das frentes (RENOV. MV, ALTAS ou Aparelhos) atingiu a Faixa 1 no período — a premiação ativada está zerada."
            : "⚠️ Faltam as travas de elegibilidade do mês (6 BL instaladas e/ou R$ 6.000,00 em Aparelhos ativados) — a premiação ativada do período está zerada."}
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
          {legado
            ? 'Regra vigente até SET/2026: a faixa final é a MENOR entre RENOV. MV, ALTAS e Aparelhos. ALTAS PF e RENOV. FB/AVA são bônus à parte.'
            : 'RENOV. MV (já com FB/AVA somado) e ALTAS são independentes — cada uma é paga pela própria faixa, sem a regra antiga de "menor faixa entre as frentes". ALTAS PF é bônus à parte.'}
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <MiniFaixaTable
            title={legado ? "RENOV. MV (régua antiga)" : "RENOV. MV (já com FB/AVA somado)"}
            rows={legado ? faixas.faixasMVAntiga : faixas.faixasMV}
            faixaAtual={painel.ativado.faixaMV}
            ptsAtual={painel.ativado.ptsMV}
            color={COLORS.mv}
          />
          <MiniFaixaTable
            title={legado ? "ALTAS (régua antiga)" : "ALTAS"}
            rows={legado ? faixas.faixasAltasAntiga : faixas.faixasAltas}
            faixaAtual={painel.ativado.faixaALTAS}
            ptsAtual={painel.ativado.ptsAltas}
            color={COLORS.altas}
          />
          <MiniFaixaTable
            title={`ALTAS PF (bônus independente${painel.ativado.altasPFLiberado ? "" : " — bloqueado"})`}
            rows={faixas.faixasAltasPF}
            faixaAtual={fAltasPFAtivado.faixa}
            ptsAtual={painel.ativado.ptsAltasPF}
            color={COLORS.altas_pf}
          />
          {legado ? (
            <AparelhoFaixaTable
              rows={faixas.aparelhoFaixas}
              valorAtual={painel.ativado.valorAparelhos}
              faixaFinal={painel.ativado.faixaMV}
            />
          ) : (
            <ElegibilidadeCard resultado={painel.ativado} />
          )}
          <div className="md:col-span-2">
            <AparelhoBonusTable
              bonusRows={faixas.aparelhoBonus}
              valorAtual={painel.ativado.valorAparelhos}
              bonusValorAtual={painel.ativado.bonusAparelhosRS}
              legado={legado}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
