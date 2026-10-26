/**
 * Camada de cálculo de premiação.
 *
 * A partir de OUT/2026 a premiação passou a ter DUAS versões de regra,
 * conforme o mês calculado (ver CUTOVER_OUT26 em aggregate.ts):
 *
 * - Até SET/2026 (inclusive): regra ANTIGA — calcularPremiacaoAntiga().
 *   RENOV. MV e ALTAS, mais a faixa de Aparelhos (régua R$6k-20k), são
 *   "determinantes": a faixa que efetivamente paga é a MENOR entre as
 *   três. RENOV. FB/AVA é bônus à parte com tabela própria. Todo produto
 *   (inclusive Aparelhos e Internet Fixa) segue a carência de 2 meses.
 * - A partir de OUT/2026: regra NOVA — calcularPremiacao() (planilha
 *   "Premiação OTE Flex", aba NOVO_OTE_Consult-OUT26):
 *   - RENOV. MV, FB e AVA viraram uma pontuação só (FB/AVA some como
 *     tabela/bônus separado).
 *   - RENOV. MV (já com FB/AVA) e ALTAS são frentes INDEPENDENTES — cada
 *     uma calcula sua própria faixa e seu próprio valor, sem a regra da
 *     "menor faixa entre as frentes".
 *   - Não existe mais régua de faixa determinante de Aparelhos — a trava
 *     é binária: mínimo de 6 BL (Internet Fixa) instaladas no mês E
 *     mínimo de R$6.000,00 em Aparelhos ativados no mês; faltando
 *     qualquer um dos dois, a premiação inteira do período zera.
 *   - Aparelhos e Internet Fixa não seguem mais a carência de 2 meses —
 *     contam sempre pelo mês real de ativação (ver ehSemCarencia em
 *     aggregate.ts).
 *   - Ao atingir R$50.000,00 em Aparelhos, a frente (RENOV. MV ou ALTAS)
 *     com a faixa mais baixa avança 1 (empate: as duas avançam).
 * - Em ambas as versões: ALTAS PF é bônus aditivo à parte, liberado só
 *   com Faixa_1+ nas frentes PJ determinantes; nenhum indicador por
 *   pontuação tem teto (sem teto, o percentual da última faixa fica
 *   travado e o valor sobe proporcional aos pontos); falta injustificada
 *   zera toda a premiação do período.
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
export const MAX_FAIXA_ANTIGA = 6;
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
  /** RENOV. MV puro (sem FB/AVA ainda somado — a soma acontece dentro de calcularPremiacao). */
  ptsMV: number;
  ptsFB: number;
  ptsAvaDados: number;
  ptsAvaVoz: number;
  ptsAltas: number;
  ptsAltasPF: number;
  valorAparelhos: number;
  /** Qtd. de itens de Internet Fixa (BL) ativados no período — só usado na regra nova. */
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
  /** Réguas antigas de RENOV. MV e ALTAS (antes de OUT/2026), preservadas à parte — ver calcularPremiacaoAntiga. */
  faixasMVAntiga: FaixaRow[];
  faixasAltasAntiga: FaixaRow[];
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
  /** true se bateu as travas de elegibilidade no período (significado difere entre regra antiga/nova — ver `legado`). */
  destravou: boolean;
  advance: boolean;
  /** true quando este resultado foi calculado pela regra ANTIGA (até SET/2026). */
  legado: boolean;

  valorMV: number;
  valorALTAS: number;
  bonusAparelhosRS: number;
  bonusAltasPF: number;
  /** true se o bônus PF está liberado */
  altasPFLiberado: boolean;

  premiacaoFinal: number;
  faltouInjustificada: boolean;
}

/**
 * Regra NOVA, vigente a partir de OUT/2026 — ver cabeçalho do arquivo.
 */
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
    legado: false,

    valorMV: input.faltouInjustificada ? 0 : valorMVFinal,
    valorALTAS: input.faltouInjustificada ? 0 : valorALTASFinal,
    bonusAparelhosRS: input.faltouInjustificada ? 0 : bonusAparelhosRS,
    bonusAltasPF: input.faltouInjustificada ? 0 : bonusAltasPF,
    altasPFLiberado,

    premiacaoFinal,
    faltouInjustificada: input.faltouInjustificada,
  };
}

/**
 * Regra ANTIGA, vigente até SET/2026 (inclusive) — mantida igual ao
 * comportamento original do sistema antes da atualização de OUT/2026.
 */
export function calcularPremiacaoAntiga(input: PontosAgregados, tables: FaixaTables): ResultadoPremiacao {
  const { faixasFbava, faixasAltasPF, aparelhoFaixas, aparelhoBonus } = tables;
  const faixasMV = tables.faixasMVAntiga;
  const faixasAltas = tables.faixasAltasAntiga;

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
  if (advance) faixaFinalNum = Math.min(MAX_FAIXA_ANTIGA, faixaFinalNum + 1);

  const faixaDeterminante = isZero ? 0 : faixaFinalNum;

  const valorMVFinal = isZero ? 0 : valorSemTeto(faixasMV, faixaFinalNum, ptsMV);
  const valorALTASFinal = isZero ? 0 : valorSemTeto(faixasAltas, faixaFinalNum, ptsAltas);

  const multAparelhoFinal = bonusAparelhoPercent(aparelhoBonus, input.valorAparelhos);
  const bonusAparelhosRS = input.valorAparelhos * multAparelhoFinal;

  const ptsAltasPF = input.ptsAltasPF;
  const fALTASPF = faixaAlcancada(faixasAltasPF, ptsAltasPF);
  const bonusAltasPFBruto = fALTASPF.faixa === 0 ? 0 : valorSemTeto(faixasAltasPF, fALTASPF.faixa, ptsAltasPF);
  const altasPFLiberado = fMV.faixa >= 1 && fALTAS.faixa >= 1 && fAparelhos.faixa >= 1;
  const bonusAltasPF = altasPFLiberado ? bonusAltasPFBruto : 0;

  let premiacaoFinal = valorMVFinal + valorALTASFinal + bonusAparelhosRS + bonusFBAVA + bonusAltasPF;
  if (input.faltouInjustificada) premiacaoFinal = 0;

  return {
    ptsMV,
    ptsFBAVA,
    ptsAltas,
    ptsAltasPF,
    valorAparelhos: input.valorAparelhos,
    blAtivadas: input.blAtivadas,

    // No formato antigo MV e ALTAS sempre mostram a mesma faixa (a
    // determinante) — por isso os dois campos recebem o mesmo valor.
    faixaMV: faixaDeterminante,
    faixaALTAS: faixaDeterminante,
    faixaAltasPF: fALTASPF.faixa,
    isZero,
    destravou: !isZero,
    advance,
    legado: true,

    valorMV: input.faltouInjustificada ? 0 : valorMVFinal,
    valorALTAS: input.faltouInjustificada ? 0 : valorALTASFinal,
    bonusAparelhosRS: input.faltouInjustificada ? 0 : bonusAparelhosRS,
    bonusAltasPF: input.faltouInjustificada ? 0 : bonusAltasPF,
    altasPFLiberado,

    premiacaoFinal,
    faltouInjustificada: input.faltouInjustificada,
  };
}
