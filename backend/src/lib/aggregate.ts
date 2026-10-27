import { prisma } from "./prisma";
import {
  calcularPremiacao,
  calcularPremiacaoAntiga,
  calcularPremiacaoRenovFixa,
  FaixaTables,
  PontosAgregados,
  ResultadoPremiacao,
} from "./calculo-premiacao";

// A partir de 01/10/2026 vale a regra NOVA de premiação; SET/2026 (inclusive)
// e meses anteriores continuam na regra ANTIGA — ver calculo-premiacao.ts.
export const CUTOVER_OUT26 = new Date(2026, 9, 1); // mês 9 = outubro (0-indexado)

// Decide a regra pelo mês do período CALCULADO (period.from), não pelo mês
// em que a venda foi registrada — é assim que o painel/fechamento sempre
// funcionou (um mês selecionado de cada vez). Sem "from" (consulta de todo o
// histórico, sem filtro de mês), usa a regra nova por padrão.
export function usaRegraNova(period: PeriodFilter): boolean {
  if (!period.from) return true;
  return period.from >= CUTOVER_OUT26;
}

export async function getFaixaTables(): Promise<FaixaTables> {
  const [mv, fbava, altas, altasPF, aparelhoFaixas, aparelhoBonus, mvAntiga, altasAntiga, renovFixa, blBonusRenovFixa] =
    await Promise.all([
      prisma.faixaTable.findMany({ where: { indicator: "RENOV_MV" }, orderBy: { faixa: "asc" } }),
      prisma.faixaTable.findMany({ where: { indicator: "RENOV_FBAVA" }, orderBy: { faixa: "asc" } }),
      prisma.faixaTable.findMany({ where: { indicator: "ALTAS" }, orderBy: { faixa: "asc" } }),
      prisma.faixaTable.findMany({ where: { indicator: "ALTAS_PF" }, orderBy: { faixa: "asc" } }),
      prisma.aparelhoFaixa.findMany({ orderBy: { faixa: "asc" } }),
      prisma.aparelhoBonus.findMany({ orderBy: { faixa: "asc" } }),
      prisma.faixaTable.findMany({ where: { indicator: "RENOV_MV_PRE_OUT26" }, orderBy: { faixa: "asc" } }),
      prisma.faixaTable.findMany({ where: { indicator: "ALTAS_PRE_OUT26" }, orderBy: { faixa: "asc" } }),
      prisma.faixaTable.findMany({ where: { indicator: "RENOV_FIXA" }, orderBy: { faixa: "asc" } }),
      prisma.faixaTable.findMany({ where: { indicator: "BL_BONUS_RENOV_FIXA" }, orderBy: { faixa: "asc" } }),
    ]);
  return {
    faixasMV: mv,
    faixasFbava: fbava,
    faixasAltas: altas,
    faixasAltasPF: altasPF,
    aparelhoFaixas,
    aparelhoBonus,
    faixasMVAntiga: mvAntiga,
    faixasAltasAntiga: altasAntiga,
    faixasRenovFixa: renovFixa,
    blBonusRenovFixa,
  };
}

export interface PeriodFilter {
  from?: Date;
  to?: Date;
}

type PontosAcc = {
  ptsMV: number;
  ptsFB: number;
  ptsAvaDados: number;
  ptsAvaVoz: number;
  ptsAltas: number;
  ptsAltasPF: number;
  valorAparelhos: number;
};

function novoPontosAcc(): PontosAcc {
  return { ptsMV: 0, ptsFB: 0, ptsAvaDados: 0, ptsAvaVoz: 0, ptsAltas: 0, ptsAltasPF: 0, valorAparelhos: 0 };
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
    case "ALTAS_PF":
      acc.ptsAltasPF += pointsTotal;
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

export function dentroDoPeriodo(d: Date | null, period: PeriodFilter): boolean {
  if (!d) return false;
  if (period.from && d < period.from) return false;
  if (period.to && d > period.to) return false;
  return true;
}

// Toda venda tem o próprio mês de registro (Sale.createdAt) e o mês seguinte
// como prazo para ativação — ativando dentro dessa janela de 2 meses, o
// item conta para o resultado do MÊS DE REGISTRO (mesmo se ativado só no mês
// seguinte). Ex.: vendido em agosto e ativado em agosto OU setembro → conta
// pra agosto. Se ativar fora dessa janela (2+ meses depois do registro), o
// item passa a contar pelo próprio mês em que foi ativado (comportamento
// "solto", igual ao de antes dessa regra).
// Devolve a data a usar nos filtros de período pro "ativado", ou null se o
// item não está ativo (não conta pra ativado em período nenhum).
// semCarencia=true pula a regra dos 2 meses e sempre conta pelo mês real de
// ativação — usado para Internet Fixa (BL) e Aparelhos (ver
// ehSemCarencia()), que não entram no fluxo de carência dos demais produtos.
export function dataConsideradaAtivacao(
  saleCreatedAt: Date,
  ativo: boolean,
  dataAtivacao: Date | null,
  semCarencia: boolean = false
): Date | null {
  if (!ativo || !dataAtivacao) return null;
  if (semCarencia) return dataAtivacao;
  const regMonthIndex = saleCreatedAt.getFullYear() * 12 + saleCreatedAt.getMonth();
  const actMonthIndex = dataAtivacao.getFullYear() * 12 + dataAtivacao.getMonth();
  const diff = actMonthIndex - regMonthIndex;
  if (diff === 0 || diff === 1) return saleCreatedAt;
  return dataAtivacao;
}

// Internet Fixa (avulso/combo) e Aparelhos são as únicas frentes que NÃO
// seguem a carência de "registrado no mês X, ativado em X ou X+1 conta pra
// X" — para essas duas, conta sempre pelo mês em que realmente ativou.
const CATEGORIAS_INTERNET_FIXA = new Set(["fixa", "fixa_combo"]);
export function ehSemCarencia(indicator: string, categoryId: string | null | undefined): boolean {
  if (indicator === "APARELHOS") return true;
  if (indicator === "ALTAS" && categoryId && CATEGORIAS_INTERNET_FIXA.has(categoryId)) return true;
  return false;
}

async function sumPontosPorIndicador(
  colaboradorId: string,
  period: PeriodFilter,
  regraNova: boolean,
  // Perfil Renovação Fixa: SEMPRE pelo mês real de ativação, nunca
  // "empurra" pro mês de registro — ver calcularPremiacaoRenovFixa.
  forcarSemCarencia: boolean = false
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
      catalogItem: { select: { categoryId: true } },
    },
  });

  const lancado = novoPontosAcc();
  const ativado = novoPontosAcc();

  for (const it of items) {
    const contaLancado = !range || dentroDoPeriodo(it.sale.createdAt, period);
    // A exceção de "sem carência" (Aparelhos/Internet Fixa contam pelo mês
    // real de ativação) só vale na regra nova (a partir de OUT/2026) — exceto
    // para o perfil Renovação Fixa, que não tem carência em NENHUM indicador.
    const semCarencia = forcarSemCarencia || (regraNova && ehSemCarencia(it.indicator, it.catalogItem?.categoryId));
    const dataConsiderada = dataConsideradaAtivacao(it.sale.createdAt, it.ativo, it.dataAtivacao, semCarencia);
    const contaAtivado = dataConsiderada !== null && (!range || dentroDoPeriodo(dataConsiderada, period));
    if (contaLancado) somarNoAcc(lancado, it.indicator, it.pointsTotal, it.valorReais);
    if (contaAtivado) somarNoAcc(ativado, it.indicator, it.pointsTotal, it.valorReais);
  }

  return { lancado, ativado };
}

// Conta quantas "BLs" (itens de Internet Fixa — avulso + combo) foram
// ativadas dentro do período, já pelo mês real de ativação (sem carência —
// ver ehSemCarencia). Usada pela trava de "mínimo 6 BL no mês".
async function contarBLsAtivadas(colaboradorId: string, period: PeriodFilter): Promise<number> {
  const range = rangeDoPeriodo(period);

  const items = await prisma.saleItem.findMany({
    where: {
      sale: { colaboradorId, cancelado: false },
      indicator: "ALTAS",
      ativo: true,
      catalogItem: { categoryId: { in: ["fixa", "fixa_combo"] } },
      ...(range ? { dataAtivacao: range } : {}),
    },
    select: { quantity: true, dataAtivacao: true },
  });

  let total = 0;
  for (const it of items) {
    if (!it.dataAtivacao) continue;
    if (range && !dentroDoPeriodo(it.dataAtivacao, period)) continue;
    total += it.quantity;
  }
  return total;
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
  /** Perfil do colaborador (ver src/lib/types.ts). */
  perfil: string;
  /** false quando o perfil ainda não tem régua/cálculo de premiação implementado — ver resultadoNaoConfigurado(). */
  configurado: boolean;
}

// Perfis cujo cálculo de premiação já está implementado. Qualquer
// colaborador com um perfil fora desta lista (ex.: um perfil futuro ainda
// sem régua definida) recebe um painel zerado com configurado=false, em vez
// de rodar o cálculo errado nele por engano.
const PERFIS_COM_CALCULO = new Set(["CONSULTIVO", "RENOVACAO_FIXA"]);

function resultadoNaoConfigurado(legado: boolean): ResultadoPremiacao {
  return {
    ptsMV: 0,
    ptsFBAVA: 0,
    ptsAltas: 0,
    ptsAltasPF: 0,
    valorAparelhos: 0,
    blAtivadas: 0,
    faixaMV: 0,
    faixaALTAS: 0,
    faixaAltasPF: 0,
    isZero: true,
    destravou: false,
    advance: false,
    legado,
    valorMV: 0,
    valorALTAS: 0,
    bonusAparelhosRS: 0,
    bonusAltasPF: 0,
    bonusBL: 0,
    altasPFLiberado: false,
    premiacaoFinal: 0,
    faltouInjustificada: false,
  };
}

// Agrupamento das 5 frentes usadas nas telas de acompanhamento (Master/Supervisor):
// RENOV. MV | RENOV. FB/AVA (soma FB + AVA Dados + AVA Voz) | ALTAS | ALTAS PF | Aparelhos.
export type FrenteKey = "mv" | "fbava" | "altas" | "altas_pf" | "aparelhos";

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
    case "ALTAS_PF":
      return "altas_pf";
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
  altas_pf: ProdutoBreakdownItem[];
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
  const regraNova = usaRegraNova(period);
  const colaborador = await prisma.user.findUnique({ where: { id: colaboradorId }, select: { perfil: true } });
  const ehRenovFixa = colaborador?.perfil === "RENOVACAO_FIXA";

  // Mesma regra do painel: "lançado" pela data da venda, "ativado" pela
  // data considerada de ativação (ver dataConsideradaAtivacao) — um item pode entrar
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
      catalogItem: { select: { categoryId: true } },
    },
  });

  const maps: Record<FrenteKey, Map<string, ProdutoBreakdownItem>> = {
    mv: new Map(),
    fbava: new Map(),
    altas: new Map(),
    altas_pf: new Map(),
    aparelhos: new Map(),
  };

  for (const it of items) {
    const frente = frenteDoIndicador(it.indicator);
    if (!frente) continue;
    const contaLancado = !range || dentroDoPeriodo(it.sale.createdAt, period);
    const semCarencia = ehRenovFixa || (regraNova && ehSemCarencia(it.indicator, it.catalogItem?.categoryId));
    const dataConsiderada = dataConsideradaAtivacao(it.sale.createdAt, it.ativo, it.dataAtivacao, semCarencia);
    const contaAtivado = dataConsiderada !== null && (!range || dentroDoPeriodo(dataConsiderada, period));
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
    altas_pf: ordenar(maps.altas_pf),
    aparelhos: ordenar(maps.aparelhos),
  };
}

export async function getPainelColaborador(
  colaboradorId: string,
  period: PeriodFilter = {}
): Promise<PainelColaborador> {
  const regraNova = usaRegraNova(period);
  const colaborador = await prisma.user.findUnique({ where: { id: colaboradorId }, select: { perfil: true } });
  const perfil = colaborador?.perfil ?? "CONSULTIVO";

  if (!PERFIS_COM_CALCULO.has(perfil)) {
    // Perfil ainda sem régua/meta definida (ex.: Renovação Fixa) — painel
    // zerado e marcado como não configurado, sem rodar o cálculo do
    // Consultivo nele.
    const vazio = resultadoNaoConfigurado(!regraNova);
    return { lancado: vazio, ativado: vazio, perfil, configurado: false };
  }

  // Perfil Renovação Fixa não segue o cutover OUT/2026 (perfil novo, sem
  // "regra antiga") e nunca tem carência, em nenhum indicador.
  const ehRenovFixa = perfil === "RENOVACAO_FIXA";

  const tables = await getFaixaTables();
  const [{ lancado: lancadoAgg, ativado: ativadoAgg }, faltou, blAtivadas] = await Promise.all([
    sumPontosPorIndicador(colaboradorId, period, regraNova, ehRenovFixa),
    getFaltouInjustificada(colaboradorId, period),
    contarBLsAtivadas(colaboradorId, period),
  ]);

  // A trava de "6 BL no mês" é sempre sobre o que foi efetivamente
  // ativado — por isso o mesmo valor entra tanto no lado "lançado" quanto
  // no "ativado" (não existe um "BL lançada" separado). Só é usada pela
  // regra nova (calcularPremiacao) — a antiga ignora esse campo.
  const lancadoInput: PontosAgregados = { ...lancadoAgg, blAtivadas, faltouInjustificada: false };
  const ativadoInput: PontosAgregados = { ...ativadoAgg, blAtivadas, faltouInjustificada: faltou };

  const calc = ehRenovFixa ? calcularPremiacaoRenovFixa : regraNova ? calcularPremiacao : calcularPremiacaoAntiga;
  return {
    lancado: calc(lancadoInput, tables),
    ativado: calc(ativadoInput, tables),
    perfil,
    configurado: true,
  };
}
