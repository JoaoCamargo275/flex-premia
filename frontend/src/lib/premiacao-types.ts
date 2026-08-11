// Espelha o formato retornado pelo backend (src/lib/calculo-premiacao.ts e
// src/lib/aggregate.ts) — mantidos como tipos estruturais aqui porque
// frontend e backend são deployados/buildados separadamente.

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

export interface PainelColaborador {
  lancado: ResultadoPremiacao;
  ativado: ResultadoPremiacao;
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
  aparelhoFaixas: AparelhoFaixaRow[];
  aparelhoBonus: AparelhoBonusRow[];
}

export interface FrenteBreakdown {
  lancado: number;
  ativado: number;
}

export interface MemberFrentes {
  mv: FrenteBreakdown;
  fbava: FrenteBreakdown;
  altas: FrenteBreakdown;
  aparelhos: FrenteBreakdown; // valor em R$, não pontos
}

export interface MemberOverview {
  id: string;
  name: string;
  email: string;
  premiacaoLancada: number;
  premiacaoAtivada: number;
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
  qtdProdutosAparelhos: number;
}

export interface MonthlyPoint {
  month: string;
  lancadas: number;
  ativadas: number;
}

export interface TeamOverview {
  members: MemberOverview[];
  totals: KpiTotals;
  totalsAnterior: KpiTotals;
  monthly: MonthlyPoint[];
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
  aparelhos: ProdutoBreakdownItem[];
}
