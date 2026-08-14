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

// Evolução ao longo do tempo, já quebrada por frente — o eixo X acompanha o
// período selecionado no filtro (dia a dia se o período for curto, semana a
// semana se for mais longo), em vez de sempre fixar "últimos 6 meses".
export interface FrenteSeriesValue {
  lancado: number;
  ativado: number;
}

export interface EvolutionPoint {
  bucket: string; // rótulo do eixo X (ex.: "05/08" ou "sem. 03/08")
  mv: FrenteSeriesValue;
  fbava: FrenteSeriesValue;
  altas: FrenteSeriesValue;
  aparelhos: FrenteSeriesValue; // em R$, não em quantidade
}

export interface EvolutionSeries {
  granularity: "day" | "week";
  points: EvolutionPoint[];
}

export interface TeamOverview {
  members: MemberOverview[];
  totals: KpiTotals;
  totalsAnterior: KpiTotals;
  evolution: EvolutionSeries;
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

function frenteKeyFromIndicator(indicator: string): keyof Omit<EvolutionPoint, "bucket"> | null {
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayLabel(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

function emptyFrenteSeriesValue(): FrenteSeriesValue {
  return { lancado: 0, ativado: 0 };
}

// Evolução no período selecionado, quebrada por frente. Se o período for
// curto (até 31 dias), mostra dia a dia; se for mais longo, agrupa em
// blocos de 7 dias — assim o eixo X sempre acompanha o filtro de período
// escolhido lá em cima, em vez de fixar sempre "últimos 6 meses".
async function getEvolutionSeries(userIds: string[], period: PeriodFilter): Promise<EvolutionSeries> {
  if (userIds.length === 0) return { granularity: "day", points: [] };

  const now = new Date();
  const from = period.from ?? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = period.to ?? now;

  const totalDays = Math.max(1, Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1);
  const granularity: "day" | "week" = totalDays <= 31 ? "day" : "week";

  const bucketOrder: string[] = [];
  const points = new Map<string, EvolutionPoint>();

  function ensureBucket(key: string, label: string) {
    if (!points.has(key)) {
      bucketOrder.push(key);
      points.set(key, {
        bucket: label,
        mv: emptyFrenteSeriesValue(),
        fbava: emptyFrenteSeriesValue(),
        altas: emptyFrenteSeriesValue(),
        aparelhos: emptyFrenteSeriesValue(),
      });
    }
  }

  function keyForDate(d: Date): { key: string; label: string } {
    if (granularity === "day") {
      return { key: dayKey(d), label: dayLabel(d) };
    }
    const diffDays = Math.floor((startOfDay(d).getTime() - startOfDay(from).getTime()) / 86400000);
    const weekIndex = Math.max(0, Math.floor(diffDays / 7));
    const weekStart = new Date(from);
    weekStart.setDate(weekStart.getDate() + weekIndex * 7);
    return { key: `w${weekIndex}`, label: `sem. ${dayLabel(weekStart)}` };
  }

  // pré-popula todos os buckets do período, pra o eixo X ficar contínuo
  // mesmo em dias/semanas sem nenhum registro.
  if (granularity === "day") {
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      ensureBucket(dayKey(d), dayLabel(d));
    }
  } else {
    const totalWeeks = Math.ceil(totalDays / 7);
    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = new Date(from);
      weekStart.setDate(weekStart.getDate() + i * 7);
      ensureBucket(`w${i}`, `sem. ${dayLabel(weekStart)}`);
    }
  }

  const items = await prisma.saleItem.findMany({
    where: {
      sale: { colaboradorId: { in: userIds }, cancelado: false },
      OR: [{ sale: { createdAt: { gte: from, lte: to } } }, { ativo: true, dataAtivacao: { gte: from, lte: to } }],
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

  for (const item of items) {
    const frente = frenteKeyFromIndicator(item.indicator);
    if (!frente) continue;
    // Aparelhos não gera pontos (pointsTotal sempre 0 nesse indicador) —
    // o que importa lá é o valor em R$ vendido. As demais frentes usam
    // pontos (já congelados por item em pointsTotal).
    const valor = frente === "aparelhos" ? item.valorReais ?? 0 : item.pointsTotal;

    if (item.sale.createdAt >= from && item.sale.createdAt <= to) {
      const { key, label } = keyForDate(item.sale.createdAt);
      ensureBucket(key, label);
      points.get(key)![frente].lancado += valor;
    }
    if (item.ativo && item.dataAtivacao && item.dataAtivacao >= from && item.dataAtivacao <= to) {
      const { key, label } = keyForDate(item.dataAtivacao);
      ensureBucket(key, label);
      points.get(key)![frente].ativado += valor;
    }
  }

  return { granularity, points: bucketOrder.map((k) => points.get(k)!) };
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

  const [totals, totalsAnterior, evolution] = await Promise.all([
    getKpiTotals(userIds, period),
    getKpiTotals(userIds, previousPeriod(period)),
    getEvolutionSeries(userIds, period),
  ]);

  return { members, totals, totalsAnterior, evolution };
}

export { getFaixaTables };
