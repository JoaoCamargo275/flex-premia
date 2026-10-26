/**
 * Camada de cálculo de premiação.
 *
 * Regras vigentes a partir da atualização de faixas de OUT/2026
 * (planilha "Premiação OTE Flex" — aba NOVO_OTE_Consult-OUT26):
 *
 * - RENOV. MV, FB e AVA (dados e voz) viraram uma ÚNICA pontuação — os
 *   pontos de FB/AVA somam direto em cima dos de MV, e usam a tabela de
 *   faixas de RENOV. MV. Não existe mais tabela/bônus separado de FB/AVA.
 * - RENOV. MV (já com FB/AVA somados) e ALTAS são frentes INDEPENDENTES:
 *   cada uma calcula sua própria faixa e seu próprio valor de premiação,
 *   pela sua própria tabela — não existe mais a regra de "a menor faixa
 *   entre as frentes é quem determina o valor pago".
 * - Não existe mais régua de faixa determinante para Aparelhos. A única
 *   trava (elegibilidade) agora é binária: mínimo de 6 BL (Banda Larga)
 *   instaladas no mês E mínimo de R$ 6.000,00 em Aparelhos ativados no
 *   mês. Se faltar qualquer um dos dois, a premiação inteira (RENOV. MV,
 *   ALTAS e os dois bônus) zera no período.
 * - Bônus de Aparelhos em R$ (régua de R$10 mil a R$50 mil) continua
 *   existindo, sempre somado por fora, na mesma mecânica de antes — só
 *   os valores da régua mudaram.
 * - Ao atingir R$ 50.000,00 em Aparelhos no período, a frente com a
 *   classificação mais baixa entre RENOV. MV e ALTAS avança 1 faixa
 *   (a outra frente não é afetada). Em empate, as duas avançam.
 * - ALTAS PF continua sendo bônus aditivo à parte (não participa de
 *   nenhuma regra de "menor faixa"), liberado só quando RENOV. MV e
 *   ALTAS já alcançaram ao menos a Faixa 1 (regra de "Faixa_1 de PJ").
 * - Nenhum indicador por pontuação tem teto: passada a última faixa da
 *   tabela, o percentual fica travado e o valor sobe proporcionalmente
 *   aos pontos.
 * - Falta injustificada (assiduidade) zera toda a premiação do período.
 *
 * Observação: a régua antiga de "faixa determinante de Aparelhos"
 * (R$6k–20k, modelo AparelhoFaixa) não é mais usada no cálculo — ficou
 * só a trava binária de R$6.000,00 descrita acima.
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
export const MAX_FAIXA = 8;
export const BL_MINIMO_MES = 6;
export const APARELHOS_MINIMO_MES = 6000;

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
    const taxaFixaFaixaMax = max.valor / max.pts;
    return ptsReais * taxaFixaFaixaMax;
  }
  const found = faixasArr.find((f) => f.faixa === faixaNum);
  return found ? found.valor : 0;
}

export function alemDoTeto(faixasArr: FaixaRow[], ptsReais: number): boolean {
  const max = faixasArr[faixasArr.length - 1];
  return ptsReais > max.pts;
}

export function bonusAparelhoPercent(bonusArr: AparelhoBonusRow[], valor: number): number {
  let atual = bonusArr[0];
  for (const f of bonusArr) {
    if (f.faixa !== 0 && valor >= f.valor) atual = f;
  }
  return atual.mult;
}

export interface PontosAgregados {
  /** RENOV. MV puro (sem FB/AVA ainda somado — a soma acontece aqui dentro). */
  ptsMV: number;
  ptsFB: number;
  ptsAvaDados: number;
  ptsAvaVoz: number;
  ptsAltas: number;
  ptsAltasPF: number;
  valorAparelhos: number;
  /** Qtd. de itens de Internet Fixa (BL) ativados no período — ver regra dos "6 BL". */
  blAtivadas: number;
  faltouInjustificada: boolean;
}

export interface FaixaTables {
  faixasMV: FaixaRow[];
  faixasFbava: FaixaRow[];
  faixasAltas: FaixaRow[];
  faixasAltasPF: FaixaRow[];
  aparelhoFaixas: AparelhoFaixaRow[];
  aparelhoBonus: AparelhoBonusRow[];
}

export interface ResultadoPremiacao {
  ptsMV: number;
  ptsFBAVA: number;
  ptsAltas: number;
  ptsAltasPF: number;
  valorAparelhos: number;
  blAtivadas: number;

  faixaMV: number;
  faixaALTAS: number;
  faixaAltasPF: number;
  isZero: boolean;
  /** true se bateu as duas travas (6 BL + R$6.000 em Aparelhos) no período. */
  destravou: boolean;
  advance: boolean;

  valorMV: number;
  valorALTAS: number;
  bonusAparelhosRS: number;
  bonusAltasPF: number;
  /** true se o bônus PF está liberado (Faixa_1+ em RENOV. MV e ALTAS) */
  altasPFLiberado: boolean;

  premiacaoFinal: number;
  faltouInjustificada: boolean;
}

export function calcularPremiacao(input: PontosAgregados, tables: FaixaTables): ResultadoPremiacao {
  const { faixasMV, faixasAltas, faixasAltasPF, aparelhoBonus } = tables;

  // RENOV. MV, FB e AVA (dados+voz) viraram uma pontuação só.
  const ptsFBAVA = input.ptsFB + input.ptsAvaDados + input.ptsAvaVoz;
  const ptsMV = input.ptsMV + ptsFBAVA;

  const fMV = faixaAlcancada(faixasMV, ptsMV);
  const ptsAltas = input.ptsAltas;
  const fALTAS = faixaAlcancada(faixasAltas, ptsAltas);

  // Trava binária: 6 BL instaladas + R$6.000 em Aparelhos no mês. Faltando
  // qualquer um dos dois, a premiação inteira (MV, ALTAS e os bônus) zera.
  const destravou = input.blAtivadas >= BL_MINIMO_MES && input.valorAparelhos >= APARELHOS_MINIMO_MES;
  const isZero = !destravou;

  // Ao atingir R$50.000 em Aparelhos, a frente com a faixa mais baixa entre
  // RENOV. MV e ALTAS avança 1 (em empate, as duas avançam), até o teto.
  const advance = input.valorAparelhos >= APARELHO_ADVANCE_THRESHOLD;
  let faixaMVFinal = fMV.faixa;
  let faixaALTASFinal = fALTAS.faixa;
  if (advance && destravou) {
    const minFaixa = Math.min(fMV.faixa, fALTAS.faixa);
    if (fMV.faixa === minFaixa) faixaMVFinal = Math.min(MAX_FAIXA, fMV.faixa + 1);
    if (fALTAS.faixa === minFaixa) faixaALTASFinal = Math.min(MAX_FAIXA, fALTAS.faixa + 1);
  }

  const valorMVFinal = isZero ? 0 : valorSemTeto(faixasMV, faixaMVFinal, ptsMV);
  const valorALTASFinal = isZero ? 0 : valorSemTeto(faixasAltas, faixaALTASFinal, ptsAltas);

  const multAparelhoFinal = bonusAparelhoPercent(aparelhoBonus, input.valorAparelhos);
  const bonusAparelhosRSBruto = input.valorAparelhos * multAparelhoFinal;
  const bonusAparelhosRS = isZero ? 0 : bonusAparelhosRSBruto;

  // ALTAS_PF (upsell Pessoa Física): bônus aditivo, não participa da trava
  // acima — só é pago se RENOV. MV e ALTAS já alcançaram ao menos a Faixa_1
  // ("Faixa_1 de PJ").
  const ptsAltasPF = input.ptsAltasPF;
  const fALTASPF = faixaAlcancada(faixasAltasPF, ptsAltasPF);
  const bonusAltasPFBruto = fALTASPF.faixa === 0 ? 0 : valorSemTeto(faixasAltasPF, fALTASPF.faixa, ptsAltasPF);
  const altasPFLiberado = fMV.faixa >= 1 && fALTAS.faixa >= 1;
  const bonusAltasPF = altasPFLiberado ? bonusAltasPFBruto : 0;

  let premiacaoFinal = valorMVFinal + valorALTASFinal + bonusAparelhosRS + bonusAltasPF;
  if (input.faltouInjustificada) premiacaoFinal = 0;

  return {
    ptsMV,
    ptsFBAVA,
    ptsAltas,
    ptsAltasPF,
    valorAparelhos: input.valorAparelhos,
    blAtivadas: input.blAtivadas,

    faixaMV: faixaMVFinal,
    faixaALTAS: faixaALTASFinal,
    faixaAltasPF: fALTASPF.faixa,
    isZero,
    destravou,
    advance,

    valorMV: input.faltouInjustificada ? 0 : valorMVFinal,
    valorALTAS: input.faltouInjustificada ? 0 : valorALTASFinal,
    bonusAparelhosRS: input.faltouInjustificada ? 0 : bonusAparelhosRS,
    bonusAltasPF: input.faltouInjustificada ? 0 : bonusAltasPF,
    altasPFLiberado,

    premiacaoFinal,
    faltouInjustificada: input.faltouInjustificada,
  };
}
