import { prisma } from "./prisma";
import { getFaixaTables, getPainelColaborador, type PeriodFilter } from "./aggregate";

export interface MemberOverview {
  id: string;
  name: string;
  email: string;
  premiacaoLancada: number;
  premiacaoAtivada: number;
  faixaAtivada: number;
}

export interface KpiTotals {
  vendasLancadas: number;
  vendasAtivadas: number;
  taxaConversao: number;
  premiacaoEstimada: number;
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

async function getKpiTotals(userIds: string[], period: PeriodFilter): Promise<KpiTotals> {
  if (userIds.length === 0) {
    return { vendasLancadas: 0, vendasAtivadas: 0, taxaConversao: 0, premiacaoEstimada: 0 };
  }

  const where = {
    colaboradorId: { in: userIds },
    cancelado: false,
    ...(period.from || period.to
      ? { createdAt: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) } }
      : {}),
  };

  // "Venda ativada" aqui = venda com pelo menos um produto já ativo (a
  // ativação em si é controlada por produto, ver SaleItem.ativo).
  const [vendasLancadas, vendasAtivadas] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.count({ where: { ...where, items: { some: { ativo: true } } } }),
  ]);

  let premiacaoEstimada = 0;
  for (const userId of userIds) {
    const painel = await getPainelColaborador(userId, period);
    premiacaoEstimada += painel.ativado.premiacaoFinal;
  }

  return {
    vendasLancadas,
    vendasAtivadas,
    taxaConversao: vendasLancadas > 0 ? (vendasAtivadas / vendasLancadas) * 100 : 0,
    premiacaoEstimada,
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
