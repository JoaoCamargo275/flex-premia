export const ROLES = ["MASTER", "SUPERVISOR", "COLABORADOR"] as const;
export type Role = (typeof ROLES)[number];

// Perfil do colaborador — define qual régua/meta/cálculo de premiação se
// aplica (ver aggregate.ts/calculo-premiacao.ts). Só importa para
// role=COLABORADOR. Novos perfis entram só adicionando aqui; um perfil sem
// cálculo implementado mostra "painel não configurado" em vez de rodar a
// conta errada.
export const PERFIS = ["CONSULTIVO", "RENOVACAO_FIXA"] as const;
export type Perfil = (typeof PERFIS)[number];
export const PERFIL_LABELS: Record<Perfil, string> = {
  CONSULTIVO: "Consultivo",
  RENOVACAO_FIXA: "Renovação Fixa",
};

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

// Perfil RENOVAÇÃO FIXA: o colaborador classifica CADA venda de RENOV_MV/
// RENOV_FB como UP/PD/DW (mesmo sentido do Consultivo: Upsell/Padrão/
// Downsell), e é essa classificação — não o catálogo — que define os pontos
// da venda (ver calculo-premiacao.ts/aggregate.ts e sales.ts). RENOV_FB não
// tem DW. Produtos/pontos normais do catálogo continuam valendo para as
// demais frentes (ALTAS, etc.) e para colaboradores Consultivo.
export const RENOV_TIPOS = ["UP", "PD", "DW"] as const;
export type RenovTipo = (typeof RENOV_TIPOS)[number];
export const RENOV_TIPO_LABELS: Record<RenovTipo, string> = {
  UP: "Upsell (UP)",
  PD: "Padrão (PD)",
  DW: "Downsell (DW)",
};
// Pontos por unidade, por indicador + tipo — planilha "Premiação OTE Flex",
// aba NOVO_OTE_Renov-OUT26 (linha 4: MÓVEL 10/7/4, FIXA 20/14).
export const RENOV_FIXA_PONTOS: Record<string, Partial<Record<RenovTipo, number>>> = {
  RENOV_MV: { UP: 10, PD: 7, DW: 4 },
  RENOV_FB: { UP: 20, PD: 14 },
};
