export const ROLES = ["MASTER", "SUPERVISOR", "COLABORADOR"] as const;
export type Role = (typeof ROLES)[number];

// O status da venda é texto livre digitado pelo colaborador — esta lista é
// só uma sugestão (datalist) para agilizar o preenchimento. O cancelamento
// de uma venda é controlado à parte pelo campo "cancelado" (ver SaleActions).
export const SALE_STATUS_SUGESTOES = [
  "Pendente",
  "Em aprovação",
  "Em instalação",
  "Ativada",
] as const;
export type SaleStatus = string;

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
