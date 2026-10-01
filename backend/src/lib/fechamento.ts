// Fechamento mensal — exportação em planilha Excel (.xlsx) usada pelo
// Supervisor (fechamento da própria equipe) e pelo Master (fechamento de
// todas as equipes). Cada colaborador/equipe vira uma aba própria dentro do
// mesmo arquivo, além de uma aba "Resumo" com o total por frente.
//
// Regras seguidas (mesmas do resto do app):
// - Só entram vendas ATIVADAS (ativo=true) cuja data CONSIDERADA de
//   ativação (ver dataConsideradaAtivacao em aggregate.ts) caia dentro do
//   período filtrado — a mesma regra "mês de registro + mês seguinte" usada
//   nos painéis de Master/Supervisor.
// - As 5 frentes são as mesmas do resto do app: RENOV. MV, RENOV. FB/AVA,
//   ALTAS PJ, ALTAS PF e Aparelhos (valor em R$, não pontos).
// - O fechamento do Master usa os MESMOS números que o Supervisor já vê no
//   dele (nenhum cálculo novo, nenhuma trava/aprovação) — só reorganizado
//   por equipe.
import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import {
  dentroDoPeriodo,
  dataConsideradaAtivacao,
  getPainelColaborador,
  type PeriodFilter,
} from "./aggregate";
import type { ResultadoPremiacao } from "./calculo-premiacao";

type FrenteKey = "mv" | "fbava" | "altas" | "altas_pf" | "aparelhos";

const FRENTE_LABELS: Record<FrenteKey, string> = {
  mv: "RENOV. MV",
  fbava: "RENOV. FB/AVA",
  altas: "ALTAS PJ",
  altas_pf: "ALTAS PF",
  aparelhos: "Aparelhos (R$)",
};

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
const MOEDA_FMT = '"R$" #,##0.00';
const DATA_FMT = "dd/mm/yyyy";

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

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function periodoLabel(period: PeriodFilter): string {
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  if (period.from && period.to) return `Período: ${fmt(period.from)} a ${fmt(period.to)}`;
  if (period.from) return `Período: a partir de ${fmt(period.from)}`;
  if (period.to) return `Período: até ${fmt(period.to)}`;
  return "Período: todo o histórico";
}

// Nome de arquivo (sem acento/espaço) para o Content-Disposition.
export function nomeArquivoSeguro(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "fechamento"
  );
}

// Nomes de aba do Excel têm limite de 31 caracteres e não podem repetir nem
// conter alguns caracteres especiais — normaliza e desambigua.
function excelSafeSheetName(raw: string, used: Set<string>): string {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, "").trim().slice(0, 31) || "Aba";
  let name = cleaned;
  let i = 2;
  while (used.has(name)) {
    const suffix = ` (${i})`;
    name = cleaned.slice(0, 31 - suffix.length) + suffix;
    i++;
  }
  used.add(name);
  return name;
}

export interface VendaAtivadaRow {
  clienteNome: string;
  clienteCnpj: string;
  dataVenda: Date;
  dataAtivacao: Date;
  frente: string;
  produto: string;
  quantidade: number;
  pontos: number;
  valorReais: number | null;
}

// Itens ATIVADOS (contam ponto) de um colaborador dentro do período, com o
// detalhe de cliente/produto/datas — usado na aba de detalhe do fechamento.
//
// Valor (R$) do item: pra Aparelhos já vem gravado em SaleItem.valorReais
// (é o valor digitado na hora da venda). Pra ALTAS PJ não tem um valor
// congelado na venda — usa o preço cadastrado no catálogo (CatalogItem.price)
// vezes a quantidade. As demais frentes (RENOV. MV/FB/AVA e ALTAS PF) não
// mostram valor aqui — só pontos (pedido explícito: só ALTAS PJ e Aparelhos
// têm valor em R$ relevante pro fechamento).
export async function getVendasAtivadasDetalhadas(
  colaboradorId: string,
  period: PeriodFilter
): Promise<VendaAtivadaRow[]> {
  const items = await prisma.saleItem.findMany({
    where: {
      sale: { colaboradorId, cancelado: false },
      ativo: true,
    },
    select: {
      indicator: true,
      label: true,
      quantity: true,
      pointsTotal: true,
      valorReais: true,
      ativo: true,
      dataAtivacao: true,
      catalogItem: { select: { price: true } },
      sale: { select: { clienteNome: true, clienteCnpj: true, createdAt: true } },
    },
  });

  const rows: VendaAtivadaRow[] = [];
  for (const it of items) {
    const dataConsiderada = dataConsideradaAtivacao(it.sale.createdAt, it.ativo, it.dataAtivacao);
    if (!dataConsiderada || !dentroDoPeriodo(dataConsiderada, period)) continue;
    const frente = frenteDoIndicador(it.indicator);
    if (!frente) continue;

    let valor = it.valorReais; // já vem preenchido pra Aparelhos
    if (frente === "altas" && it.catalogItem?.price != null) {
      valor = it.catalogItem.price * it.quantity;
    }

    rows.push({
      clienteNome: it.sale.clienteNome,
      clienteCnpj: it.sale.clienteCnpj,
      dataVenda: it.sale.createdAt,
      dataAtivacao: it.dataAtivacao!,
      frente: FRENTE_LABELS[frente],
      produto: it.label,
      quantidade: it.quantity,
      pontos: it.pointsTotal,
      valorReais: valor,
    });
  }

  rows.sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime());
  return rows;
}

interface ColaboradorFechamento {
  id: string;
  nome: string;
  email: string;
  ativado: ResultadoPremiacao;
  vendas: VendaAtivadaRow[];
}

async function montarColaboradoresFechamento(
  membros: { id: string; name: string; email: string }[],
  period: PeriodFilter
): Promise<ColaboradorFechamento[]> {
  const out: ColaboradorFechamento[] = [];
  for (const m of membros) {
    const [painel, vendas] = await Promise.all([
      getPainelColaborador(m.id, period),
      getVendasAtivadasDetalhadas(m.id, period),
    ]);
    out.push({ id: m.id, nome: m.name, email: m.email, ativado: painel.ativado, vendas });
  }
  return out;
}

function headerRow(sheet: ExcelJS.Worksheet, values: string[]): ExcelJS.Row {
  const row = sheet.addRow(values);
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
  });
  return row;
}

function tituloRow(sheet: ExcelJS.Worksheet, texto: string) {
  const row = sheet.addRow([texto]);
  row.font = { bold: true, size: 14 };
}

// Liga as setinhas de filtro do Excel (AutoFiltro) no cabeçalho de uma
// tabela — cobre só as linhas de dado (headerRowNumber até lastDataRowNumber),
// sem incluir a linha de total logo abaixo. Cada aba só pode ter UM
// autoFiltro, então cada função abaixo escolhe a tabela principal da aba.
function ativarAutoFiltro(
  sheet: ExcelJS.Worksheet,
  headerRowNumber: number,
  lastDataRowNumber: number,
  columnCount: number
) {
  if (lastDataRowNumber < headerRowNumber) return;
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: lastDataRowNumber, column: columnCount },
  };
}

function addResumoColaboradoresSheet(
  workbook: ExcelJS.Workbook,
  titulo: string,
  subtitulo: string,
  colaboradores: ColaboradorFechamento[]
) {
  const sheet = workbook.addWorksheet("Resumo");
  tituloRow(sheet, titulo);
  sheet.addRow([subtitulo]);
  sheet.addRow([]);
  const header = headerRow(sheet, [
    "Colaborador",
    FRENTE_LABELS.mv,
    FRENTE_LABELS.fbava,
    FRENTE_LABELS.altas,
    FRENTE_LABELS.altas_pf,
    FRENTE_LABELS.aparelhos,
    "Premiação RENOV MV (R$)",
    "Premiação RENOV FB/AVA (R$)",
    "Premiação ALTAS PJ (R$)",
    "Premiação ALTAS PF (R$)",
    "Premiação Aparelhos (R$)",
    "Premiação TOTAL (R$)",
  ]);
  const headerRowNumber = header.number;

  for (const c of colaboradores) {
    const row = sheet.addRow([
      c.nome,
      c.ativado.ptsMV,
      c.ativado.ptsFBAVA,
      c.ativado.ptsAltas,
      c.ativado.ptsAltasPF,
      c.ativado.valorAparelhos,
      c.ativado.valorMV,
      c.ativado.bonusFBAVA,
      c.ativado.valorALTAS,
      c.ativado.bonusAltasPF,
      c.ativado.bonusAparelhosRS,
      c.ativado.premiacaoFinal,
    ]);
    row.getCell(6).numFmt = MOEDA_FMT;
    for (let i = 7; i <= 12; i++) row.getCell(i).numFmt = MOEDA_FMT;
  }
  const lastDataRowNumber = sheet.rowCount;
  ativarAutoFiltro(sheet, headerRowNumber, lastDataRowNumber, 12);

  const totalRow = sheet.addRow([
    "TOTAL DA EQUIPE",
    sum(colaboradores.map((c) => c.ativado.ptsMV)),
    sum(colaboradores.map((c) => c.ativado.ptsFBAVA)),
    sum(colaboradores.map((c) => c.ativado.ptsAltas)),
    sum(colaboradores.map((c) => c.ativado.ptsAltasPF)),
    sum(colaboradores.map((c) => c.ativado.valorAparelhos)),
    sum(colaboradores.map((c) => c.ativado.valorMV)),
    sum(colaboradores.map((c) => c.ativado.bonusFBAVA)),
    sum(colaboradores.map((c) => c.ativado.valorALTAS)),
    sum(colaboradores.map((c) => c.ativado.bonusAltasPF)),
    sum(colaboradores.map((c) => c.ativado.bonusAparelhosRS)),
    sum(colaboradores.map((c) => c.ativado.premiacaoFinal)),
  ]);
  totalRow.font = { bold: true };
  for (let i = 6; i <= 12; i++) totalRow.getCell(i).numFmt = MOEDA_FMT;

  sheet.getColumn(1).width = 30;
  for (let i = 2; i <= 6; i++) sheet.getColumn(i).width = 18;
  for (let i = 7; i <= 12; i++) sheet.getColumn(i).width = 24;
}

function addColaboradorSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  c: ColaboradorFechamento,
  period: PeriodFilter
) {
  const sheet = workbook.addWorksheet(sheetName);
  tituloRow(sheet, c.nome);
  sheet.addRow([periodoLabel(period)]);
  sheet.addRow([]);

  headerRow(sheet, ["Frente", "Pontos/Valor ativado", "Premiação (R$)"]);
  const rowMV = sheet.addRow([FRENTE_LABELS.mv, c.ativado.ptsMV, c.ativado.valorMV]);
  rowMV.getCell(3).numFmt = MOEDA_FMT;
  const rowFbava = sheet.addRow([FRENTE_LABELS.fbava, c.ativado.ptsFBAVA, c.ativado.bonusFBAVA]);
  rowFbava.getCell(3).numFmt = MOEDA_FMT;
  const rowAltas = sheet.addRow([FRENTE_LABELS.altas, c.ativado.ptsAltas, c.ativado.valorALTAS]);
  rowAltas.getCell(3).numFmt = MOEDA_FMT;
  const rowAltasPF = sheet.addRow([FRENTE_LABELS.altas_pf, c.ativado.ptsAltasPF, c.ativado.bonusAltasPF]);
  rowAltasPF.getCell(3).numFmt = MOEDA_FMT;
  const aparRow = sheet.addRow([FRENTE_LABELS.aparelhos, c.ativado.valorAparelhos, c.ativado.bonusAparelhosRS]);
  aparRow.getCell(2).numFmt = MOEDA_FMT;
  aparRow.getCell(3).numFmt = MOEDA_FMT;
  const totalPremiacaoRow = sheet.addRow(["TOTAL PREMIAÇÃO (R$)", "", c.ativado.premiacaoFinal]);
  totalPremiacaoRow.font = { bold: true };
  totalPremiacaoRow.getCell(3).numFmt = MOEDA_FMT;
  sheet.addRow([]);
  sheet.addRow(["Vendas ativadas no período"]).font = { bold: true };

  const detailHeader = headerRow(sheet, [
    "Cliente",
    "CNPJ/CPF",
    "Data da venda",
    "Data de ativação",
    "Frente",
    "Produto",
    "Qtd",
    "Pontos",
    "Valor (R$)",
  ]);
  const detailHeaderRowNumber = detailHeader.number;

  for (const v of c.vendas) {
    const row = sheet.addRow([
      v.clienteNome,
      v.clienteCnpj,
      v.dataVenda,
      v.dataAtivacao,
      v.frente,
      v.produto,
      v.quantidade,
      v.pontos,
      v.valorReais ?? "",
    ]);
    row.getCell(3).numFmt = DATA_FMT;
    row.getCell(4).numFmt = DATA_FMT;
    if (v.valorReais != null) row.getCell(9).numFmt = MOEDA_FMT;
  }

  if (c.vendas.length === 0) {
    sheet.addRow(["Nenhuma venda ativada nesse período."]);
  } else {
    ativarAutoFiltro(sheet, detailHeaderRowNumber, sheet.rowCount, 9);
    // Só ALTAS PJ entra nesse total — Aparelhos já tem o próprio total em R$
    // na tabela de frentes acima, não precisa somar os dois juntos aqui.
    const totalValorAltas = sum(
      c.vendas.filter((v) => v.frente === FRENTE_LABELS.altas).map((v) => v.valorReais ?? 0)
    );
    const totalValorRow = sheet.addRow([
      "TOTAL ALTAS PJ VENDIDO (R$)",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalValorAltas,
    ]);
    totalValorRow.font = { bold: true };
    totalValorRow.getCell(9).numFmt = MOEDA_FMT;
  }

  const widths = [28, 20, 14, 16, 18, 28, 8, 10, 14];
  widths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });
}

// Fechamento do Supervisor: uma aba "Resumo" com o total por frente de cada
// colaborador da própria equipe, e uma aba por colaborador com o detalhe das
// vendas ativadas no período (cliente, CNPJ, produto, pontos, datas).
export async function buildFechamentoSupervisorXlsx(
  supervisorId: string,
  period: PeriodFilter
): Promise<{ buffer: Buffer; teamName: string }> {
  const team = await prisma.team.findUnique({
    where: { supervisorId },
    include: { members: { where: { role: "COLABORADOR" }, orderBy: { name: "asc" } } },
  });
  if (!team) throw new Error("Sua equipe ainda não foi configurada. Peça a um Master para vincular sua equipe.");

  const colaboradores = await montarColaboradoresFechamento(team.members, period);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FlexPremia";
  workbook.created = new Date();

  addResumoColaboradoresSheet(workbook, `Fechamento — ${team.name}`, periodoLabel(period), colaboradores);

  const usedNames = new Set<string>(["Resumo"]);
  for (const c of colaboradores) {
    const sheetName = excelSafeSheetName(c.nome, usedNames);
    addColaboradorSheet(workbook, sheetName, c, period);
  }

  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  return { buffer, teamName: team.name };
}

function addResumoEquipesSheet(
  workbook: ExcelJS.Workbook,
  subtitulo: string,
  equipes: { nomeEquipe: string; supervisorNome: string; colaboradores: ColaboradorFechamento[] }[]
) {
  const sheet = workbook.addWorksheet("Resumo");
  tituloRow(sheet, "Fechamento — todas as equipes");
  sheet.addRow([subtitulo]);
  sheet.addRow([]);
  const header = headerRow(sheet, [
    "Equipe",
    "Supervisor",
    FRENTE_LABELS.mv,
    FRENTE_LABELS.fbava,
    FRENTE_LABELS.altas,
    FRENTE_LABELS.altas_pf,
    FRENTE_LABELS.aparelhos,
    "Premiação RENOV MV (R$)",
    "Premiação RENOV FB/AVA (R$)",
    "Premiação ALTAS PJ (R$)",
    "Premiação ALTAS PF (R$)",
    "Premiação Aparelhos (R$)",
    "Premiação TOTAL (R$)",
  ]);
  const headerRowNumber = header.number;

  for (const eq of equipes) {
    const row = sheet.addRow([
      eq.nomeEquipe,
      eq.supervisorNome,
      sum(eq.colaboradores.map((c) => c.ativado.ptsMV)),
      sum(eq.colaboradores.map((c) => c.ativado.ptsFBAVA)),
      sum(eq.colaboradores.map((c) => c.ativado.ptsAltas)),
      sum(eq.colaboradores.map((c) => c.ativado.ptsAltasPF)),
      sum(eq.colaboradores.map((c) => c.ativado.valorAparelhos)),
      sum(eq.colaboradores.map((c) => c.ativado.valorMV)),
      sum(eq.colaboradores.map((c) => c.ativado.bonusFBAVA)),
      sum(eq.colaboradores.map((c) => c.ativado.valorALTAS)),
      sum(eq.colaboradores.map((c) => c.ativado.bonusAltasPF)),
      sum(eq.colaboradores.map((c) => c.ativado.bonusAparelhosRS)),
      sum(eq.colaboradores.map((c) => c.ativado.premiacaoFinal)),
    ]);
    row.getCell(7).numFmt = MOEDA_FMT;
    for (let i = 8; i <= 13; i++) row.getCell(i).numFmt = MOEDA_FMT;
  }
  ativarAutoFiltro(sheet, headerRowNumber, sheet.rowCount, 13);

  const totalRow = sheet.addRow([
    "TOTAL GERAL",
    "",
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.ptsMV))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.ptsFBAVA))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.ptsAltas))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.ptsAltasPF))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.valorAparelhos))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.valorMV))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.bonusFBAVA))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.valorALTAS))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.bonusAltasPF))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.bonusAparelhosRS))),
    sum(equipes.flatMap((eq) => eq.colaboradores.map((c) => c.ativado.premiacaoFinal))),
  ]);
  totalRow.font = { bold: true };
  for (let i = 7; i <= 13; i++) totalRow.getCell(i).numFmt = MOEDA_FMT;

  sheet.getColumn(1).width = 26;
  sheet.getColumn(2).width = 24;
  for (let i = 3; i <= 7; i++) sheet.getColumn(i).width = 18;
  for (let i = 8; i <= 13; i++) sheet.getColumn(i).width = 24;
}

function addEquipeSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  nomeEquipe: string,
  supervisorNome: string,
  colaboradores: ColaboradorFechamento[],
  period: PeriodFilter
) {
  const sheet = workbook.addWorksheet(sheetName);
  tituloRow(sheet, nomeEquipe);
  sheet.addRow([`Supervisor: ${supervisorNome}`]);
  sheet.addRow([periodoLabel(period)]);
  sheet.addRow([]);
  const header = headerRow(sheet, [
    "Colaborador",
    FRENTE_LABELS.mv,
    FRENTE_LABELS.fbava,
    FRENTE_LABELS.altas,
    FRENTE_LABELS.altas_pf,
    FRENTE_LABELS.aparelhos,
    "Premiação RENOV MV (R$)",
    "Premiação RENOV FB/AVA (R$)",
    "Premiação ALTAS PJ (R$)",
    "Premiação ALTAS PF (R$)",
    "Premiação Aparelhos (R$)",
    "Premiação TOTAL (R$)",
  ]);
  const headerRowNumber = header.number;

  for (const c of colaboradores) {
    const row = sheet.addRow([
      c.nome,
      c.ativado.ptsMV,
      c.ativado.ptsFBAVA,
      c.ativado.ptsAltas,
      c.ativado.ptsAltasPF,
      c.ativado.valorAparelhos,
      c.ativado.valorMV,
      c.ativado.bonusFBAVA,
      c.ativado.valorALTAS,
      c.ativado.bonusAltasPF,
      c.ativado.bonusAparelhosRS,
      c.ativado.premiacaoFinal,
    ]);
    row.getCell(6).numFmt = MOEDA_FMT;
    for (let i = 7; i <= 12; i++) row.getCell(i).numFmt = MOEDA_FMT;
  }

  if (colaboradores.length === 0) {
    sheet.addRow(["Nenhum colaborador nessa equipe."]);
  } else {
    ativarAutoFiltro(sheet, headerRowNumber, sheet.rowCount, 12);
  }

  const totalRow = sheet.addRow([
    "TOTAL DA EQUIPE",
    sum(colaboradores.map((c) => c.ativado.ptsMV)),
    sum(colaboradores.map((c) => c.ativado.ptsFBAVA)),
    sum(colaboradores.map((c) => c.ativado.ptsAltas)),
    sum(colaboradores.map((c) => c.ativado.ptsAltasPF)),
    sum(colaboradores.map((c) => c.ativado.valorAparelhos)),
    sum(colaboradores.map((c) => c.ativado.valorMV)),
    sum(colaboradores.map((c) => c.ativado.bonusFBAVA)),
    sum(colaboradores.map((c) => c.ativado.valorALTAS)),
    sum(colaboradores.map((c) => c.ativado.bonusAltasPF)),
    sum(colaboradores.map((c) => c.ativado.bonusAparelhosRS)),
    sum(colaboradores.map((c) => c.ativado.premiacaoFinal)),
  ]);
  totalRow.font = { bold: true };
  for (let i = 6; i <= 12; i++) totalRow.getCell(i).numFmt = MOEDA_FMT;

  sheet.getColumn(1).width = 30;
  for (let i = 2; i <= 6; i++) sheet.getColumn(i).width = 18;
  for (let i = 7; i <= 12; i++) sheet.getColumn(i).width = 24;
}

// Fechamento do Master: uma aba "Resumo" com o total por frente de cada
// equipe, e uma aba por equipe listando os colaboradores dela com os mesmos
// pontos ativados por frente que o Supervisor já vê no fechamento dele
// (nenhum cálculo novo, sem trava/aprovação — sempre ao vivo).
export async function buildFechamentoMasterXlsx(
  period: PeriodFilter,
  teamIdFiltro?: string
): Promise<{ buffer: Buffer }> {
  const teams = await prisma.team.findMany({
    where: teamIdFiltro ? { id: teamIdFiltro } : undefined,
    include: {
      members: { where: { role: "COLABORADOR" }, orderBy: { name: "asc" } },
      supervisor: true,
    },
    orderBy: { name: "asc" },
  });

  const equipesData: { nomeEquipe: string; supervisorNome: string; colaboradores: ColaboradorFechamento[] }[] = [];
  for (const team of teams) {
    const colaboradores = await montarColaboradoresFechamento(team.members, period);
    equipesData.push({
      nomeEquipe: team.name,
      supervisorNome: team.supervisor?.name ?? "— sem supervisor —",
      colaboradores,
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FlexPremia";
  workbook.created = new Date();

  addResumoEquipesSheet(workbook, periodoLabel(period), equipesData);

  const usedNames = new Set<string>(["Resumo"]);
  for (const eq of equipesData) {
    const sheetName = excelSafeSheetName(eq.nomeEquipe, usedNames);
    addEquipeSheet(workbook, sheetName, eq.nomeEquipe, eq.supervisorNome, eq.colaboradores, period);
  }

  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  return { buffer };
}
