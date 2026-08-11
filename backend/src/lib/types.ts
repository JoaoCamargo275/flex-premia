export const ROLES = ["MASTER", "SUPERVISOR", "COLABORADOR"] as const;
export type Role = (typeof ROLES)[number];

// O status da venda agora é texto livre digitado pelo colaborador (não é mais
// um enum fechado). Esta lista serve só como sugestão (datalist) no frontend.
// O cancelamento de uma venda é controlado à parte pelo campo Sale.cancelado.
export const SALE_STATUS_SUGESTOES = [
  "Pendente",
  "Em aprovação",
  "Em instalação",
  "Ativada",
] as const;
export type SaleStatus = string;

// Mantido para exibição de status antigos/históricos que ainda usem os
// códigos legados (ex.: exportação de CSV de vendas criadas antes desta
// mudança). Para status novos (texto livre), o valor já vem pronto para exibir.
export const SALE_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em aprovação/instalação",
  ATIVADA: "Ativada",
  CANCELADA: "Cancelada",
};

export const INDICATORS = [
  "RENOV_MV",
  "RENOV_FB",
  "RENOV_AVA_DADOS",
  "RENOV_AVA_VOZ",
  "ALTAS",
  "APARELHOS",
] as const;
export type Indicator = (typeof INDICATORS)[number];

export const INDICATOR_LABELS: Record<Indicator, string> = {
  RENOV_MV: "RENOV. MV",
  RENOV_FB: "RENOV. FB",
  RENOV_AVA_DADOS: "RENOV. AVA — Dados",
  RENOV_AVA_VOZ: "RENOV. AVA — Voz",
  ALTAS: "ALTAS",
  APARELHOS: "Aparelhos",
};

// Faixa de pontuação agrupada para exibição (FB/AVA soma os 3 sub-indicadores)
export type FaixaGroup = "RENOV_MV" | "RENOV_FBAVA" | "ALTAS";
