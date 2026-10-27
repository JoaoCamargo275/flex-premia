// Espelha o formato retornado pelo backend (src/lib/metas.ts) — mantidos
// como tipos estruturais aqui porque frontend e backend são
// deployados/buildados separadamente.

// Todas as frentes que podem receber meta, somadas entre os perfis — qual
// subconjunto um colaborador de fato usa vem em MetasResumo.frentesVisiveis
// (perfil Consultivo: mv/altas/aparelhos; Renovação Fixa: só fb).
export type FrenteMeta = "mv" | "altas" | "aparelhos" | "fb";

export const FRENTES_META: FrenteMeta[] = ["mv", "altas", "aparelhos", "fb"];

export interface MetaValores {
  metaDiaria: number;
  metaSemanal: number;
  metaMensal: number;
}

export type MetasPorFrente = Record<FrenteMeta, MetaValores>;

export interface ProgressoFrente {
  meta: MetaValores;
  hoje: number;
  semana: number;
  mes: number;
}

export type MetasProgresso = Record<FrenteMeta, ProgressoFrente>;

export interface MetaSeriePonto {
  dia: string; // "DD/MM"
  valor: number;
}

export interface MetasResumo {
  frentes: MetasProgresso;
  series: Record<FrenteMeta, MetaSeriePonto[]>;
  /** Frentes que esse colaborador de fato usa, conforme o perfil dele. */
  frentesVisiveis: FrenteMeta[];
}

export const FRENTE_META_LABEL: Record<FrenteMeta, string> = {
  mv: "RENOV. MV",
  altas: "ALTAS PJ",
  aparelhos: "Aparelhos",
  fb: "RENOV. FB",
};

export const FRENTE_META_EMOJI: Record<FrenteMeta, string> = {
  mv: "📱",
  altas: "🚀",
  aparelhos: "💰",
  fb: "🔄",
};

// Aparelhos é medido em R$, as outras duas frentes em pontos.
export function isValorFrenteMeta(frente: FrenteMeta): boolean {
  return frente === "aparelhos";
}
