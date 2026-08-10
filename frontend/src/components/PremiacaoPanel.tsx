import { fmtBRL, fmtNum } from "../lib/format";
import type { ResultadoPremiacao, PainelColaborador } from "../lib/premiacao-types";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">{label}</div>
      <div className="text-lg font-extrabold">{value}</div>
      {sub && <div className="text-xs text-ink-dim mt-0.5">{sub}</div>}
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

export function PainelLancadoAtivado({ painel }: { painel: PainelColaborador }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Premiação lançada (todas as vendas)</div>
          <div className="text-2xl font-extrabold">{fmtBRL(painel.lancado.premiacaoFinal)}</div>
        </div>
        <div className="card p-4" style={{ border: "1px solid rgba(34,197,94,.4)" }}>
          <div className="text-xs uppercase tracking-wide text-ink-dim mb-1">Premiação ativada (conta oficialmente)</div>
          <div className="text-2xl font-extrabold text-good">{fmtBRL(painel.ativado.premiacaoFinal)}</div>
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

      <div>
        <h3 className="text-sm font-bold text-ink-dim uppercase tracking-wide mb-2">Lançado (todas, exceto canceladas)</h3>
        <ResultadoGrid resultado={painel.lancado} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-good uppercase tracking-wide mb-2">Ativado (conta para faixa/premiação)</h3>
        <ResultadoGrid resultado={painel.ativado} />
      </div>
    </div>
  );
}
