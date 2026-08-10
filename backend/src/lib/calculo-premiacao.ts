/**
 * Camada de cálculo de premiação — porte direto das funções do simulador
 * original (index.html: faixaAlcancada, valorSemTeto, alemDoTeto,
 * faixaAparelho, bonusAparelhoPercent), adaptada para trabalhar sobre
 * pontos agregados vindos do banco em vez de inputs de tela.
 *
 * Regras preservadas:
 * - RENOV. MV, ALTAS e a faixa de Aparelhos (régua R$6k-20k) são os
 *   indicadores determinantes: a faixa final é a MENOR entre os três.
 * - RENOV. FB/AVA e o bônus em R$ de Aparelhos (régua R$10k-50k) somam
 *   sempre, não participam da regra da menor faixa.
 * - Se algum determinante estiver em Faixa 0, zera a parte determinante
 *   (os dois bônus continuam sendo pagos).
 * - Ao atingir R$50.000,00 em aparelhos, a faixa final avança +1 (máx 6).
 * - Nenhum indicador por pontuação tem teto: passada a Faixa 6, o
 *   percentual fica travado e o valor sobe proporcionalmente aos pontos.
 * - Falta injustificada (assiduidade) zera toda a premiação do período.
 */

export interface FaixaRow {
  faixa: number;
  pts: number;
  valor: number;
  aparelhos: number;
  metaPct: string;
  pctFinal: number | null;
}

export interface AparelhoFaixaRow {
  faixa: number;
  valor: number;
  metaPct: string;
}

export interface AparelhoBonusRow {
  faixa: number;
  valor: number;
  mult: number;
}

export const APARELHO_ADVANCE_THRESHOLD = 50000;

export function faixaAlcancada(faixasArr: FaixaRow[], pts: number): FaixaRow {
  let atual = faixasArr[0];
  for (const f of faixasArr) {
    if (f.faixa !== 0 && pts >= f.pts) atual = f;
  }
  return atual;
}

export function valorSemTeto(faixasArr: FaixaRow[], faixaNum: number, ptsReais: number): number {
  const max = faixasArr[faixasArr.length - 1];
  if (faixaNum === max.faixa && ptsReais > max.pts) {
    const taxaFixaFaixa6 = max.valor / max.pts;
    return ptsReais * taxaFixaFaixa6;
  }
  const found = faixasArr.find((f) => f.faixa === faixaNum);
  return found ? found.valor : 0;
}

export function alemDoTeto(faixasArr: FaixaRow[], ptsReais: number): boolean {
  const max = faixasArr[faixasArr.length - 1];
  return ptsReais > max.pts;
}

export function faixaAparelho(faixasArr: AparelhoFaixaRow[], valor: number): AparelhoFaixaRow {
  let atual = faixasArr[0];
  for (const f of faixasArr) {
    if (f.faixa !== 0 && valor >= f.valor) atual = f;
  }
  return atual;
}

export function bonusAparelhoPercent(bonusArr: AparelhoBonusRow[], valor: number): number {
  let atual = bonusArr[0];
  for (const f of bonusArr) {
    if (f.faixa !== 0 && valor >= f.valor) atual = f;
  }
  return atual.mult;
}

export interface PontosAgregados {
  ptsMV: number;
  ptsFB: number;
  ptsAvaDados: number;
  ptsAvaVoz: number;
  ptsAltas: number;
  valorAparelhos: number;
  faltouInjustificada: boolean;
}

export interface FaixaTables {
  faixasMV: FaixaRow[];
  faixasFbava: FaixaRow[];
  faixasAltas: FaixaRow[];
  aparelhoFaixas: AparelhoFaixaRow[];
  aparelhoBonus: AparelhoBonusRow[];
}

export interface ResultadoPremiacao {
  ptsMV: number;
  ptsFBAVA: number;
  ptsAltas: number;
  valorAparelhos: number;

  faixaMV: number;
  faixaALTAS: number;
  faixaAparelhosIndicador: number;
  faixaFinal: number;
  faixaDeterminante: number;
  isZero: boolean;
  advance: boolean;

  valorMV: number;
  valorALTAS: number;
  bonusFBAVA: number;
  bonusAparelhosRS: number;

  premiacaoFinal: number;
  faltouInjustificada: boolean;
}

export function calcularPremiacao(input: PontosAgregados, tables: FaixaTables): ResultadoPremiacao {
  const { faixasMV, faixasFbava, faixasAltas, aparelhoFaixas, aparelhoBonus } = tables;

  const ptsMV = input.ptsMV;
  const fMV = faixaAlcancada(faixasMV, ptsMV);

  const ptsFBAVA = input.ptsFB + input.ptsAvaDados + input.ptsAvaVoz;
  const fFBAVA = faixaAlcancada(faixasFbava, ptsFBAVA);
  const bonusFBAVA = fFBAVA.faixa === 0 ? 0 : valorSemTeto(faixasFbava, fFBAVA.faixa, ptsFBAVA);

  const ptsAltas = input.ptsAltas;
  const fALTAS = faixaAlcancada(faixasAltas, ptsAltas);

  const fAparelhos = faixaAparelho(aparelhoFaixas, input.valorAparelhos);

  let faixaFinalNum = Math.min(fMV.faixa, fALTAS.faixa, fAparelhos.faixa);
  const isZero = faixaFinalNum === 0;
  const advance = input.valorAparelhos >= APARELHO_ADVANCE_THRESHOLD;
  if (advance) faixaFinalNum = Math.min(6, faixaFinalNum + 1);

  const faixaDeterminante = isZero ? 0 : faixaFinalNum;

  const valorMVFinal = isZero ? 0 : valorSemTeto(faixasMV, faixaFinalNum, ptsMV);
  const valorALTASFinal = isZero ? 0 : valorSemTeto(faixasAltas, faixaFinalNum, ptsAltas);

  const multAparelhoFinal = bonusAparelhoPercent(aparelhoBonus, input.valorAparelhos);
  const bonusAparelhosRS = input.valorAparelhos * multAparelhoFinal;

  let premiacaoFinal = valorMVFinal + valorALTASFinal + bonusAparelhosRS + bonusFBAVA;
  if (input.faltouInjustificada) premiacaoFinal = 0;

  return {
    ptsMV,
    ptsFBAVA,
    ptsAltas,
    valorAparelhos: input.valorAparelhos,

    faixaMV: fMV.faixa,
    faixaALTAS: fALTAS.faixa,
    faixaAparelhosIndicador: fAparelhos.faixa,
    faixaFinal: faixaFinalNum,
    faixaDeterminante,
    isZero,
    advance,

    valorMV: input.faltouInjustificada ? 0 : valorMVFinal,
    valorALTAS: input.faltouInjustificada ? 0 : valorALTASFinal,
    bonusFBAVA: input.faltouInjustificada ? 0 : bonusFBAVA,
    bonusAparelhosRS: input.faltouInjustificada ? 0 : bonusAparelhosRS,

    premiacaoFinal,
    faltouInjustificada: input.faltouInjustificada,
  };
}
