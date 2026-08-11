import { prisma } from "./prisma";
import { getFaixaTables, getPainelColaborador, type PeriodFilter } from "./aggregate";

// Quantidade lançada/ativada de uma frente para um colaborador — usada tanto
// nos pontos (RENOV. MV/FB-AVA/ALTAS) quanto no valor em R$ de Aparelhos.
export interface FrenteBreakdown {
  lancado: number;
  ativado: number;
}

export interface MemberFrentes {
  mv: FrenteBreakdown;
  fbava: FrenteBreakdown;
  altas: FrenteBreakdown;
  aparelhos: FrenteBreakdown; // valor em R$, não pontos
}

export interface MemberOverview {
  id: string;
  name: string;
  email: string;
  premiacaoLancada: number;
  premiacaoAtivada: number;
  faixaAtivada: number;
  frentes: MemberFrentes;
}

export interface KpiTotals {
  vendasLancadas: number;
  vendasAtivadas: number;
  taxaConversao: number;
  premiacaoEstimada: number;
  // Novos indicadores usados no painel do Supervisor (e disponíveis para o Master também):
  pontosAtivos: number; // soma de pontos ativados (RENOV. MV + FB/AVA + ALTAS) de toda a equipe
  taxaAtivacaoColaboradores: number; // % de colaboradores da equipe com ao menos 1 produto ativo no período
  qtdProdutosMv: number;
  qtdProdutosFbava: number;
  qtdProdutosAltas: number;
  qtdProdutosAparelhos: number;
}

export interface MonthlyPoint {
  month: string;
  lancadas: number;
  ativadas: number;
}

export interface TeamOverview {
  members: MemberOverview[];
  totals: KpiTotals;
  totalsAnterior: KpiTotals;
  monthly: MonthlyPoint[];
}

function periodWhereClause(period: PeriodFilter) {
  return period.from || period.to
    ? { createdAt: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) } }
    : {};
}

async function getQuantidadesPorFrente(
  userIds: string[],
  period: PeriodFilter
): Promise<{ mv: number; fbava: number; altas: number; aparelhos: number }> {
  if (userIds.length === 0) return { mv: 0, fbava: 0, altas: 0, aparelhos: 0 };

  const items = await prisma.saleItem.findMany({
    where: {
      sale: {
        colaboradorId: { in: userIds },
        cancelado: false,
        ...periodWhereClause(period),
      },
    },
    select: { indicator: true, quantity: true },
  });

  const acc = { mv: 0, fbava: 0, altas: 0, aparelhos: 0 };
  for (const it of items) {
    switch (it.indicator) {
      case "RENOV_MV":
        acc.mv += it.quantity;
        break;
      case "RENOV_FB":
      case "RENOV_AVA_DADOS":
      case "RENOV_AVA_VOZ":
        acc.fbava += it.quantity;
        break;
      case "ALTAS":
        acc.altas += it.quantity;
        break;
      case "APARELHOS":
        acc.aparelhos += 1;
        break;
    }
  }
  return acc;
}

async function getTaxaAtivacaoColaboradores(userIds: string[], period: PeriodFilter): Promise<number> {
  if (userIds.length === 0) return 0;
  const ativos = await prisma.user.count({
    where: {
      id: { in: userIds },
      sales: { some: { cancelado: false, items: { some: { ativo: true } }, ...periodWhereClause(period) } },
    },
  });
  return (ativos / userIds.length) * 100;
}

async function getKpiTotals(userIds: string[], period: PeriodFilter): Promise<KpiTotals> {
  if (userIds.length === 0) {
    return {
      vendasLancadas: 0,
      vendasAtivadas: 0,
      taxaConversao: 0,
      premiacaoEstimada: 0,
      pontosAtivos: 0,
      taxaAtivacaoColaboradores: 0,
      qtdProdutosMv: 0,
      qtdProdutosFbava: 0,
      qtdProdutosAltas: 0,
      qtdProdutosAparelhos: 0,
    };
  }

  const where = {
    colaboradorId: { in: userIds },
    cancelado: false,
    ...periodWhereClause(period),
  };

  // "Venda ativada" aqui = venda com pelo menos um produto já ativo (a
  // ativação em si é controlada por produto, ver SaleItem.ativo).
  const [vendasLancadas, vendasAtivadas, quantidades, taxaAtivacaoColaboradores] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.count({ where: { ...where, items: { some: { ativo: true } } } }),
    getQuantidadesPorFrente(userIds, period),
    getTaxaAtivacaoColaboradores(userIds, period),
  ]);

  let premiacaoEstimada = 0;
  let pontosAtivos = 0;
  for (const userId of userIds) {
    const painel = await getPainelColaborador(userId, period);
    premiacaoEstimada += painel.ativado.premiacaoFinal;
    pontosAtivos += painel.ativado.ptsMV + painel.ativado.ptsFBAVA + painel.ativado.ptsAltas;
  }

  return {
    vendasLancadas,
    vendasAtivadas,
    taxaConversao: vendasLancadas > 0 ? (vendasAtivadas / vendasLancadas) * 100 : 0,
    premiacaoEstimada,
    pontosAtivos,
    taxaAtivacaoColaboradores,
    qtdProdutosMv: quantidades.mv,
    qtdProdutosFbava: quantidades.fbava,
    qtdProdutosAltas: quantidades.altas,
    qtdProdutosAparelhos: quantidades.aparelhos,
  };
}

function previousPeriod(period: PeriodFilter): PeriodFilter {
  if (!period.from || !period.to) return {};
  const durationMs = period.to.getTime() - period.from.getTime();
  return {
    from: new Date(period.from.getTime() - durationMs),
    to: new Date(period.from.getTime() - 1),
  };
}

async function getMonthlyEvolution(userIds: string[]): Promise<MonthlyPoint[]> {
  if (userIds.length === 0) return [];
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { colaboradorId: { in: userIds }, cancelado: false, createdAt: { gte: since } },
    select: { createdAt: true, items: { select: { ativo: true } } },
  });

  const buckets = new Map<string, MonthlyPoint>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { month: key, lancadas: 0, ativadas: 0 });
  }

  for (const sale of sales) {
    const d = sale.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.lancadas += 1;
      if (sale.items.some((i) => i.ativo)) bucket.ativadas += 1;
    }
  }

  return Array.from(buckets.values());
}

export async function getTeamOverview(userIds: string[], period: PeriodFilter = {}): Promise<TeamOverview> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    orderBy: { name: "asc" },
  });

  const members: MemberOverview[] = [];
  for (const user of users) {
    const painel = await getPainelColaborador(user.id, period);
    members.push({
      id: user.id,
      name: user.name,
      email: user.email,
      premiacaoLancada: painel.lancado.premiacaoFinal,
      premiacaoAtivada: painel.ativado.premiacaoFinal,
      faixaAtivada: painel.ativado.faixaDeterminante,
      frentes: {
        mv: { lancado: painel.lancado.ptsMV, ativado: painel.ativado.ptsMV },
        fbava: { lancado: painel.lancado.ptsFBAVA, ativado: painel.ativado.ptsFBAVA },
        altas: { lancado: painel.lancado.ptsAltas, ativado: painel.ativado.ptsAltas },
        aparelhos: { lancado: painel.lancado.valorAparelhos, ativado: painel.ativado.valorAparelhos },
      },
    });
  }

  const [totals, totalsAnterior, monthly] = await Promise.all([
    getKpiTotals(userIds, period),
    getKpiTotals(userIds, previousPeriod(period)),
    getMonthlyEvolution(userIds),
  ]);

  return { members, totals, totalsAnterior, monthly };
}

export { getFaixaTables };
