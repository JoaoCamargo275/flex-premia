import { prisma } from "./prisma";
import {
  calcularPremiacao,
  FaixaTables,
  PontosAgregados,
  ResultadoPremiacao,
} from "./calculo-premiacao";

export async function getFaixaTables(): Promise<FaixaTables> {
  const [mv, fbava, altas, aparelhoFaixas, aparelhoBonus] = await Promise.all([
    prisma.faixaTable.findMany({ where: { indicator: "RENOV_MV" }, orderBy: { faixa: "asc" } }),
    prisma.faixaTable.findMany({ where: { indicator: "RENOV_FBAVA" }, orderBy: { faixa: "asc" } }),
    prisma.faixaTable.findMany({ where: { indicator: "ALTAS" }, orderBy: { faixa: "asc" } }),
    prisma.aparelhoFaixa.findMany({ orderBy: { faixa: "asc" } }),
    prisma.aparelhoBonus.findMany({ orderBy: { faixa: "asc" } }),
  ]);
  return {
    faixasMV: mv,
    faixasFbava: fbava,
    faixasAltas: altas,
    aparelhoFaixas,
    aparelhoBonus,
  };
}

export interface PeriodFilter {
  from?: Date;
  to?: Date;
}

type PontosAcc = { ptsMV: number; ptsFB: number; ptsAvaDados: number; ptsAvaVoz: number; ptsAltas: number; valorAparelhos: number };

function novoPontosAcc(): PontosAcc {
  return { ptsMV: 0, ptsFB: 0, ptsAvaDados: 0, ptsAvaVoz: 0, ptsAltas: 0, valorAparelhos: 0 };
}

function somarNoAcc(acc: PontosAcc, indicator: string, pointsTotal: number, valorReais: number | null) {
  switch (indicator) {
    case "RENOV_MV":
      acc.ptsMV += pointsTotal;
      break;
    case "RENOV_FB":
      acc.ptsFB += pointsTotal;
      break;
    case "RENOV_AVA_DADOS":
      acc.ptsAvaDados += pointsTotal;
      break;
    case "RENOV_AVA_VOZ":
      acc.ptsAvaVoz += pointsTotal;
      break;
    case "ALTAS":
      acc.ptsAltas += pointsTotal;
      break;
    case "APARELHOS":
      acc.valorAparelhos += valorReais ?? 0;
      break;
  }
}

// Monta o filtro de data (gte/lte) a partir do período, ou undefined se o
// período for "todo o histórico" (sem from/to).
function rangeDoPeriodo(period: PeriodFilter) {
  if (!period.from && !period.to) return undefined;
  return { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) };
}

function dentroDoPeriodo(d: Date | null, period: PeriodFilter): boolean {
  if (!d) return false;
  if (period.from && d < period.from) return false;
  if (period.to && d > period.to) return false;
  return true;
}

// "Lançado" conta pela data em que a venda foi registrada (Sale.createdAt,
// que o colaborador pode escolher em "Nova venda"). "Ativado" conta pela
// data em que o PRODUTO foi de fato ativado (SaleItem.dataAtivacao, também
// escolhida pelo colaborador) — são datas independentes, então um item pode
// contar como lançado num período e como ativado em outro (ex.: vendido em
// julho, ativado em agosto).
async function sumPontosPorIndicador(
  colaboradorId: string,
  period: PeriodFilter
): Promise<{ lancado: PontosAcc; ativado: PontosAcc }> {
  const range = rangeDoPeriodo(period);

  const items = await prisma.saleItem.findMany({
    where: {
      sale: { colaboradorId, cancelado: false },
      ...(range ? { OR: [{ sale: { createdAt: range } }, { ativo: true, dataAtivacao: range }] } : {}),
    },
    select: {
      indicator: true,
      pointsTotal: true,
      valorReais: true,
      ativo: true,
      dataAtivacao: true,
      sale: { select: { createdAt: true } },
    },
  });

  const lancado = novoPontosAcc();
  const ativado = novoPontosAcc();

  for (const it of items) {
    const contaLancado = !range || dentroDoPeriodo(it.sale.createdAt, period);
    const contaAtivado = it.ativo && (!range || dentroDoPeriodo(it.dataAtivacao, period));
    if (contaLancado) somarNoAcc(lancado, it.indicator, it.pointsTotal, it.valorReais);
    if (contaAtivado) somarNoAcc(ativado, it.indicator, it.pointsTotal, it.valorReais);
  }

  return { lancado, ativado };
}

async function getFaltouInjustificada(colaboradorId: string, period: PeriodFilter) {
  // Se o período cobrir mais de um mês, qualquer falta marcada no intervalo zera a premiação do período.
  const from = period.from ?? new Date(0);
  const to = period.to ?? new Date();
  const flags = await prisma.attendanceFlag.findMany({
    where: { userId: colaboradorId, faltouInjustificada: true },
  });
  return flags.some((f) => {
    const [y, m] = f.yearMonth.split("-").map(Number);
    const flagDate = new Date(y, m - 1, 15);
    return flagDate >= from && flagDate <= to;
  });
}

export interface PainelColaborador {
  lancado: ResultadoPremiacao;
  ativado: ResultadoPremiacao;
}

// Agrupamento das 4 frentes usadas nas telas de acompanhamento (Master/Supervisor):
// RENOV. MV | RENOV. FB/AVA (soma FB + AVA Dados + AVA Voz) | ALTAS | Aparelhos.
export type FrenteKey = "mv" | "fbava" | "altas" | "aparelhos";

function frenteDoIndicador(indicator: string): FrenteKey | null {
  switch (indicator) {
    case "RENOV_MV":
      return "mv";
    case "RENOV_FB":
    case "RENOV_AVA_DADOS":
    case "RENOV_AVA_VOZ":
      return "fbava";
    case "ALTAS":
      return "altas";
    case "APARELHOS":
      return "aparelhos";
    default:
      return null;
  }
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

// Lista, para um colaborador, quais produtos específicos ele vendeu em cada
// uma das 4 frentes e a quantidade de cada um (lançado vs ativado) — usado
// no detalhe do colaborador nas telas de Master/Supervisor.
export async function getProdutosPorFrente(
  colaboradorId: string,
  period: PeriodFilter = {}
): Promise<ProdutosPorFrente> {
  const range = rangeDoPeriodo(period);

  // Mesma regra do painel: "lançado" pela data da venda, "ativado" pela
  // data de ativação do produto — datas independentes, um item pode entrar
  // no lançado de um período e no ativado de outro.
  const items = await prisma.saleItem.findMany({
    where: {
      sale: { colaboradorId, cancelado: false },
      ...(range ? { OR: [{ sale: { createdAt: range } }, { ativo: true, dataAtivacao: range }] } : {}),
    },
    select: {
      indicator: true,
      label: true,
      quantity: true,
      pointsTotal: true,
      valorReais: true,
      ativo: true,
      dataAtivacao: true,
      sale: { select: { createdAt: true } },
    },
  });

  const maps: Record<FrenteKey, Map<string, ProdutoBreakdownItem>> = {
    mv: new Map(),
    fbava: new Map(),
    altas: new Map(),
    aparelhos: new Map(),
  };

  for (const it of items) {
    const frente = frenteDoIndicador(it.indicator);
    if (!frente) continue;
    const contaLancado = !range || dentroDoPeriodo(it.sale.createdAt, period);
    const contaAtivado = it.ativo && (!range || dentroDoPeriodo(it.dataAtivacao, period));
    if (!contaLancado && !contaAtivado) continue;

    const map = maps[frente];
    let entry = map.get(it.label);
    if (!entry) {
      entry = { label: it.label, qtdLancada: 0, qtdAtivada: 0, pontosLancados: 0, pontosAtivados: 0, valorLancado: 0, valorAtivado: 0 };
      map.set(it.label, entry);
    }
    const qtd = frente === "aparelhos" ? 1 : it.quantity;
    if (contaLancado) {
      entry.qtdLancada += qtd;
      entry.pontosLancados += it.pointsTotal;
      entry.valorLancado += it.valorReais ?? 0;
    }
    if (contaAtivado) {
      entry.qtdAtivada += qtd;
      entry.pontosAtivados += it.pointsTotal;
      entry.valorAtivado += it.valorReais ?? 0;
    }
  }

  const ordenar = (m: Map<string, ProdutoBreakdownItem>) =>
    Array.from(m.values()).sort((a, b) => b.qtdLancada - a.qtdLancada);

  return {
    mv: ordenar(maps.mv),
    fbava: ordenar(maps.fbava),
    altas: ordenar(maps.altas),
    aparelhos: ordenar(maps.aparelhos),
  };
}

export async function getPainelColaborador(
  colaboradorId: string,
  period: PeriodFilter = {}
): Promise<PainelColaborador> {
  const tables = await getFaixaTables();
  const [{ lancado: lancadoAgg, ativado: ativadoAgg }, faltou] = await Promise.all([
    sumPontosPorIndicador(colaboradorId, period),
    getFaltouInjustificada(colaboradorId, period),
  ]);

  const lancadoInput: PontosAgregados = { ...lancadoAgg, faltouInjustificada: false };
  const ativadoInput: PontosAgregados = { ...ativadoAgg, faltouInjustificada: faltou };

  return {
    lancado: calcularPremiacao(lancadoInput, tables),
    ativado: calcularPremiacao(ativadoInput, tables),
  };
}
