import { prisma } from "./prisma";
import type { PeriodFilter } from "./aggregate";

// As 3 frentes principais que recebem meta (RENOV MV, ALTAS PJ, Aparelhos —
// de propósito FORA: RENOV FB/AVA e ALTAS PF). Metas de MV/ALTAS são em
// pontos, meta de Aparelhos é em R$ (mesma unidade usada no resto do app).
export const FRENTES_META = ["mv", "altas", "aparelhos"] as const;
export type FrenteMeta = (typeof FRENTES_META)[number];

export function isFrenteMeta(v: string): v is FrenteMeta {
  return (FRENTES_META as readonly string[]).includes(v);
}

function frenteMetaDoIndicador(indicator: string): FrenteMeta | null {
  switch (indicator) {
    case "RENOV_MV":
      return "mv";
    case "ALTAS":
      return "altas";
    case "APARELHOS":
      return "aparelhos";
    default:
      return null;
  }
}

export interface MetaValores {
  metaDiaria: number;
  metaSemanal: number;
  metaMensal: number;
}

export type MetasPorFrente = Record<FrenteMeta, MetaValores>;

function metaVazia(): MetaValores {
  return { metaDiaria: 0, metaSemanal: 0, metaMensal: 0 };
}

function metasVazias(): MetasPorFrente {
  return { mv: metaVazia(), altas: metaVazia(), aparelhos: metaVazia() };
}

// Metas "padrão fixo" do colaborador — um registro por frente, que vale até
// o Supervisor editar de novo. Frentes sem meta definida ainda voltam como 0.
export async function getMetasDoColaborador(userId: string): Promise<MetasPorFrente> {
  const rows = await prisma.meta.findMany({ where: { userId } });
  const metas = metasVazias();
  for (const r of rows) {
    const frente: string = r.frente;
    if (!isFrenteMeta(frente)) continue;
    metas[frente] = { metaDiaria: r.metaDiaria, metaSemanal: r.metaSemanal, metaMensal: r.metaMensal };
  }
  return metas;
}

export async function setMetasDoColaborador(
  userId: string,
  definidaPorId: string,
  valores: Partial<Record<FrenteMeta, MetaValores>>
): Promise<void> {
  const ops = FRENTES_META.filter((f) => valores[f]).map((frente) => {
    const v = valores[frente]!;
    const metaDiaria = Math.max(0, v.metaDiaria || 0);
    const metaSemanal = Math.max(0, v.metaSemanal || 0);
    const metaMensal = Math.max(0, v.metaMensal || 0);
    return prisma.meta.upsert({
      where: { userId_frente: { userId, frente } },
      update: { metaDiaria, metaSemanal, metaMensal, definidaPorId },
      create: { userId, frente, metaDiaria, metaSemanal, metaMensal, definidaPorId },
    });
  });
  if (ops.length > 0) await prisma.$transaction(ops);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

// Segunda-feira da semana corrente (00:00) — a equipe trabalha só de
// segunda a sexta, então a "meta semanal" é sempre medida nessa janela,
// nunca sábado/domingo.
function segundaDaSemana(d: Date): Date {
  const dia = d.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
  const diffParaSegunda = dia === 0 ? -6 : 1 - dia;
  const seg = new Date(d);
  seg.setDate(d.getDate() + diffParaSegunda);
  return startOfDay(seg);
}

function sextaDaSemana(d: Date): Date {
  const seg = segundaDaSemana(d);
  const sex = new Date(seg);
  sex.setDate(seg.getDate() + 4);
  return endOfDay(sex);
}

function dayLabel(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

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

// Progresso das 3 frentes com meta, sempre contado pelas vendas LANÇADAS
// (Sale.createdAt) — nunca pelas ativadas, já que ativação pode levar até
// 2 meses e inviabilizaria bater uma meta diária/semanal no mesmo período.
// "Hoje" e "semana" são sempre em relação a AGORA (não navegam no tempo);
// só o "mês" segue o período informado (mesmo seletor de mês do Meu Painel).
export async function getMetasProgresso(userId: string, periodoMes: PeriodFilter): Promise<MetasResumo> {
  const now = new Date();
  const hojeInicio = startOfDay(now);
  const hojeFim = endOfDay(now);
  const semanaInicio = segundaDaSemana(now);
  const semanaFim = sextaDaSemana(now);
  const mesInicio = periodoMes.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFim = periodoMes.to ?? endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const rangeMin = new Date(Math.min(hojeInicio.getTime(), semanaInicio.getTime(), mesInicio.getTime()));
  const rangeMax = new Date(Math.max(hojeFim.getTime(), semanaFim.getTime(), mesFim.getTime()));

  const [metas, items] = await Promise.all([
    getMetasDoColaborador(userId),
    prisma.saleItem.findMany({
      where: {
        sale: { colaboradorId: userId, cancelado: false, createdAt: { gte: rangeMin, lte: rangeMax } },
        indicator: { in: ["RENOV_MV", "ALTAS", "APARELHOS"] },
      },
      select: { indicator: true, pointsTotal: true, valorReais: true, sale: { select: { createdAt: true } } },
    }),
  ]);

  const frentes: MetasProgresso = {
    mv: { meta: metas.mv, hoje: 0, semana: 0, mes: 0 },
    altas: { meta: metas.altas, hoje: 0, semana: 0, mes: 0 },
    aparelhos: { meta: metas.aparelhos, hoje: 0, semana: 0, mes: 0 },
  };

  // Pré-popula a série diária do mês selecionado com todos os dias em 0,
  // pra o gráfico ficar contínuo mesmo em dias sem venda nenhuma.
  const seriesMap: Record<FrenteMeta, Map<string, number>> = { mv: new Map(), altas: new Map(), aparelhos: new Map() };
  const diasNoMes = new Date(mesInicio.getFullYear(), mesInicio.getMonth() + 1, 0).getDate();
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const d = new Date(mesInicio.getFullYear(), mesInicio.getMonth(), dia);
    const key = dayLabel(d);
    for (const f of FRENTES_META) seriesMap[f].set(key, 0);
  }

  for (const it of items) {
    const frente = frenteMetaDoIndicador(it.indicator);
    if (!frente) continue;
    const valor = frente === "aparelhos" ? it.valorReais ?? 0 : it.pointsTotal;
    const d = it.sale.createdAt;
    if (d >= hojeInicio && d <= hojeFim) frentes[frente].hoje += valor;
    if (d >= semanaInicio && d <= semanaFim) frentes[frente].semana += valor;
    if (d >= mesInicio && d <= mesFim) {
      frentes[frente].mes += valor;
      const key = dayLabel(d);
      seriesMap[frente].set(key, (seriesMap[frente].get(key) ?? 0) + valor);
    }
  }

  const series: Record<FrenteMeta, MetaSeriePonto[]> = { mv: [], altas: [], aparelhos: [] };
  for (const f of FRENTES_META) {
    series[f] = Array.from(seriesMap[f].entries()).map(([dia, valor]) => ({ dia, valor }));
  }

  return { frentes, series };
}
