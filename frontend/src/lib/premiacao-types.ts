// Espelha o formato retornado pelo backend (src/lib/calculo-premiacao.ts e
// src/lib/aggregate.ts) — mantidos como tipos estruturais aqui porque
// frontend e backend são deployados/buildados separadamente.

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
  /** true se bateu as travas de elegibilidade no período (significado muda conforme `legado`). */
  destravou: boolean;
  advance: boolean;
  /** true quando este resultado foi calculado pela regra ANTIGA (até SET/2026). */
  legado: boolean;

  valorMV: number;
  valorALTAS: number;
  bonusAparelhosRS: number;
  bonusAltasPF: number;
  /** Bônus de BL (perfil Renovação Fixa) — 0 para os demais perfis/regras. */
  bonusBL: number;
  altasPFLiberado: boolean;

  premiacaoFinal: number;
  faltouInjustificada: boolean;
}

export interface PainelColaborador {
  lancado: ResultadoPremiacao;
  ativado: ResultadoPremiacao;
  /** Perfil do colaborador (ver lib/types.ts). */
  perfil: string;
  /** false quando o perfil ainda não tem régua/meta configurada — painel vem zerado. */
  configurado: boolean;
  /** Perfil Renovação Fixa em rampagem: 1, 2 ou 3; null fora de rampagem ou em outros perfis. */
  mesRampagem: number | null;
}

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

export interface FaixaTables {
  faixasMV: FaixaRow[];
  faixasFbava: FaixaRow[];
  faixasAltas: FaixaRow[];
  faixasAltasPF: FaixaRow[];
  aparelhoFaixas: AparelhoFaixaRow[];
  aparelhoBonus: AparelhoBonusRow[];
  faixasMVAntiga: FaixaRow[];
  faixasAltasAntiga: FaixaRow[];
  /** Perfil Renovação Fixa — régua única e degraus de bônus de BL. */
  faixasRenovFixa: FaixaRow[];
  blBonusRenovFixa: FaixaRow[];
  /** Perfil Renovação Fixa "rampagem" — réguas alternativas (mesmo R$, menos pts) por mês de rampagem (1, 2, 3). */
  faixasRenovFixaRampagem: Record<number, FaixaRow[]>;
}

export interface FrenteBreakdown {
  lancado: number;
  ativado: number;
}

export interface MemberFrentes {
  mv: FrenteBreakdown;
  fbava: FrenteBreakdown;
  altas: FrenteBreakdown;
  altas_pf: FrenteBreakdown;
  aparelhos: FrenteBreakdown; // valor em R$, não pontos
}

export interface MemberPremiacaoPorFrente {
  mv: number;
  fbava: number;
  altas: number;
  altas_pf: number;
  aparelhos: number;
}

export interface MemberOverview {
  id: string;
  name: string;
  email: string;
  premiacaoLancada: number;
  premiacaoAtivada: number;
  premiacaoAtivadaPorFrente: MemberPremiacaoPorFrente;
  faixaAtivada: number;
  frentes: MemberFrentes;
}

export interface KpiTotals {
  vendasLancadas: number;
  vendasAtivadas: number;
  taxaConversao: number;
  premiacaoEstimada: number;
  pontosAtivos: number;
  taxaAtivacaoColaboradores: number;
  qtdProdutosMv: number;
  qtdProdutosFbava: number;
  qtdProdutosAltas: number;
  qtdProdutosAltasPF: number;
  qtdProdutosAparelhos: number;
}

export interface FrenteSeriesValue {
  lancado: number;
  ativado: number;
}

export interface EvolutionPoint {
  bucket: string;
  mv: FrenteSeriesValue;
  fbava: FrenteSeriesValue;
  altas: FrenteSeriesValue;
  altas_pf: FrenteSeriesValue;
  aparelhos: FrenteSeriesValue; // em R$, não em quantidade
}

export interface EvolutionSeries {
  granularity: "day" | "week";
  points: EvolutionPoint[];
}

export interface TeamOverview {
  members: MemberOverview[];
  totals: KpiTotals;
  totalsAnterior: KpiTotals;
  evolution: EvolutionSeries;
}

export interface ProdutoBreakdownItem {
  label: string;
  qtdLancada: number;
  qtdAtivada: number;
  pontosLancados: number;
  pontosAtivados: number;
  valorLancado: number;
  valorAtivado: number;
}

export interface ProdutosPorFrente {
  mv: ProdutoBreakdownItem[];
  fbava: ProdutoBreakdownItem[];
  altas: ProdutoBreakdownItem[];
  altas_pf: ProdutoBreakdownItem[];
  aparelhos: ProdutoBreakdownItem[];
}
