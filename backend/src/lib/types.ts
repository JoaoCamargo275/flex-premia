export const ROLES = ["MASTER", "SUPERVISOR", "COLABORADOR"] as const;
export type Role = (typeof ROLES)[number];

export const SALE_STATUSES = [
  "PENDENTE",
  "EM_ANDAMENTO",
  "ATIVADA",
  "CANCELADA",
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
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
