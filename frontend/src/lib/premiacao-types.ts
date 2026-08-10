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

export interface MemberOverview {
  id: string;
  name: string;
  email: string;
  premiacaoLancada: number;
  premiacaoAtivada: number;
  faixaAtivada: number;
}

export interface KpiTotals {
  vendasLancadas: number;
  vendasAtivadas: number;
  taxaConversao: number;
  premiacaoEstimada: number;
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
