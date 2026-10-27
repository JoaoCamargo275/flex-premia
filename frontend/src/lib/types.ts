export const ROLES = ["MASTER", "SUPERVISOR", "COLABORADOR"] as const;
export type Role = (typeof ROLES)[number];

// Perfil do colaborador — define qual régua/meta/cálculo de premiação se
// aplica. Só importa para role=COLABORADOR. Espelha backend/src/lib/types.ts.
export const PERFIS = ["CONSULTIVO", "RENOVACAO_FIXA"] as const;
export type Perfil = (typeof PERFIS)[number];
export const PERFIL_LABELS: Record<Perfil, string> = {
  CONSULTIVO: "Consultivo",
  RENOVACAO_FIXA: "Renovação Fixa",
};

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
  "ALTAS_PF",
  "APARELHOS",
] as const;
export type Indicator = (typeof INDICATORS)[number];

export const INDICATOR_LABELS: Record<Indicator, string> = {
  RENOV_MV: "RENOV. MV",
  RENOV_FB: "RENOV. FB",
  RENOV_AVA_DADOS: "RENOV. AVA — Dados",
  RENOV_AVA_VOZ: "RENOV. AVA — Voz",
  ALTAS: "ALTAS",
  ALTAS_PF: "ALTAS PF",
  APARELHOS: "Aparelhos",
};

// Faixa de pontuação agrupada para exibição (FB/AVA soma os 3 sub-indicadores)
export type FaixaGroup = "RENOV_MV" | "RENOV_FBAVA" | "ALTAS" | "ALTAS_PF";

// Perfil RENOVAÇÃO FIXA: classificação UP/PD/DW escolhida pelo colaborador
// em cada venda de RENOV_MV/RENOV_FB (define os pontos nesse perfil — ver
// backend/src/lib/types.ts). RENOV_FB não tem DW.
export const RENOV_TIPOS = ["UP", "PD", "DW"] as const;
export type RenovTipo = (typeof RENOV_TIPOS)[number];
export const RENOV_TIPO_LABELS: Record<RenovTipo, string> = {
  UP: "Upsell (UP)",
  PD: "Padrão (PD)",
  DW: "Downsell (DW)",
};
export const RENOV_TIPOS_POR_INDICADOR: Partial<Record<Indicator, readonly RenovTipo[]>> = {
  RENOV_MV: ["UP", "PD", "DW"],
  RENOV_FB: ["UP", "PD"],
};
// Pontos por unidade, só para a prévia do carrinho — espelha
// backend/src/lib/types.ts (RENOV_FIXA_PONTOS); quem calcula pra valer é o
// backend, no momento de salvar a venda.
export const RENOV_FIXA_PONTOS: Partial<Record<Indicator, Partial<Record<RenovTipo, number>>>> = {
  RENOV_MV: { UP: 10, PD: 7, DW: 4 },
  RENOV_FB: { UP: 20, PD: 14 },
};
