// Espelha o formato retornado pelo backend (src/lib/metas.ts) — mantidos
// como tipos estruturais aqui porque frontend e backend são
// deployados/buildados separadamente.

// As 3 frentes principais que recebem meta (RENOV MV, ALTAS PJ, Aparelhos).
export type FrenteMeta = "mv" | "altas" | "aparelhos";

export const FRENTES_META: FrenteMeta[] = ["mv", "altas", "aparelhos"];

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
}

export const FRENTE_META_LABEL: Record<FrenteMeta, string> = {
  mv: "RENOV. MV",
  altas: "ALTAS PJ",
  aparelhos: "Aparelhos",
};

export const FRENTE_META_EMOJI: Record<FrenteMeta, string> = {
  mv: "📱",
  altas: "🚀",
  aparelhos: "💰",
};

// Aparelhos é medido em R$, as outras duas frentes em pontos.
export function isValorFrenteMeta(frente: FrenteMeta): boolean {
  return frente === "aparelhos";
}
