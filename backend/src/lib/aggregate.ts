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

async function sumPontosPorIndicador(
  colaboradorId: string,
  onlyAtivo: boolean,
  period: PeriodFilter
) {
  // A ativação agora é por PRODUTO (SaleItem.ativo), não mais pela venda
  // inteira — dois itens da mesma venda podem ativar em datas diferentes.
  const items = await prisma.saleItem.findMany({
    where: {
      ...(onlyAtivo ? { ativo: true } : {}),
      sale: {
        colaboradorId,
        cancelado: false,
        ...(period.from || period.to
          ? {
              createdAt: {
                ...(period.from ? { gte: period.from } : {}),
                ...(period.to ? { lte: period.to } : {}),
              },
            }
          : {}),
      },
    },
    select: { indicator: true, pointsTotal: true, valorReais: true },
  });

  const acc = { ptsMV: 0, ptsFB: 0, ptsAvaDados: 0, ptsAvaVoz: 0, ptsAltas: 0, valorAparelhos: 0 };
  for (const it of items) {
    switch (it.indicator) {
      case "RENOV_MV":
        acc.ptsMV += it.pointsTotal;
        break;
      case "RENOV_FB":
        acc.ptsFB += it.pointsTotal;
        break;
      case "RENOV_AVA_DADOS":
        acc.ptsAvaDados += it.pointsTotal;
        break;
      case "RENOV_AVA_VOZ":
        acc.ptsAvaVoz += it.pointsTotal;
        break;
      case "ALTAS":
        acc.ptsAltas += it.pointsTotal;
        break;
      case "APARELHOS":
        acc.valorAparelhos += it.valorReais ?? 0;
        break;
    }
  }
  return acc;
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
  const items = await prisma.saleItem.findMany({
    where: {
      sale: {
        colaboradorId,
        cancelado: false,
        ...(period.from || period.to
          ? {
              createdAt: {
                ...(period.from ? { gte: period.from } : {}),
                ...(period.to ? { lte: period.to } : {}),
              },
            }
          : {}),
      },
    },
    select: { indicator: true, label: true, quantity: true, pointsTotal: true, valorReais: true, ativo: true },
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
    const map = maps[frente];
    let entry = map.get(it.label);
    if (!entry) {
      entry = { label: it.label, qtdLancada: 0, qtdAtivada: 0, pontosLancados: 0, pontosAtivados: 0, valorLancado: 0, valorAtivado: 0 };
      map.set(it.label, entry);
    }
    const qtd = frente === "aparelhos" ? 1 : it.quantity;
    entry.qtdLancada += qtd;
    entry.pontosLancados += it.pointsTotal;
    entry.valorLancado += it.valorReais ?? 0;
    if (it.ativo) {
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
  const [lancadoAgg, ativadoAgg, faltou] = await Promise.all([
    sumPontosPorIndicador(colaboradorId, false, period),
    sumPontosPorIndicador(colaboradorId, true, period),
    getFaltouInjustificada(colaboradorId, period),
  ]);

  const lancadoInput: PontosAgregados = { ...lancadoAgg, faltouInjustificada: false };
  const ativadoInput: PontosAgregados = { ...ativadoAgg, faltouInjustificada: faltou };

  return {
    lancado: calcularPremiacao(lancadoInput, tables),
    ativado: calcularPremiacao(ativadoInput, tables),
  };
}
