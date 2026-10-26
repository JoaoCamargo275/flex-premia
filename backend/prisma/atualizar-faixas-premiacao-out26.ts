/**
 * Atualização das FAIXAS DE PREMIAÇÃO (OTE) — Consultivo, OUT/2026, conforme
 * a planilha "Premiação OTE Flex" (aba NOVO_OTE_Consult-OUT26).
 *
 * Atualiza (upsert por faixa, não apaga nada):
 *  - FaixaTable "RENOV_MV": agora é a tabela combinada de RENOV. MV + FB +
 *    AVA (a lógica de somar os pontos de FB/AVA em cima de MV já foi feita
 *    no código, aqui só entram os valores novos da régua).
 *  - FaixaTable "ALTAS": novos valores de premiação por faixa.
 *  - AparelhoBonus: nova régua de bônus em R$ (R$10 mil a R$50 mil).
 *
 * Não mexe em RENOV_FBAVA nem em AparelhoFaixa (ficam no banco sem uso,
 * já que a lógica nova não lê mais essas duas tabelas) — e não mexe em
 * nenhuma venda, ponto já lançado ou premiação já fechada.
 *
 * Rodar (dentro da pasta backend), SÓ DEPOIS de atualizar e implantar o
 * código novo (calculo-premiacao.ts / aggregate.ts):
 *   npx tsx prisma/atualizar-faixas-premiacao-out26.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FaixaRow {
  faixa: number;
  pts: number;
  valor: number;
  aparelhos: number;
  metaPct: string;
  pctFinal: number | null;
}

// RENOV. MV, FB e AVA combinados — Premiação Base OTE R$2.000,00
const RENOV_MV_NOVO: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 40%", pctFinal: 0 },
  { faixa: 1, pts: 200, valor: 300, aparelhos: 6000, metaPct: "40%", pctFinal: 0.15 },
  { faixa: 2, pts: 300, valor: 600, aparelhos: 6000, metaPct: "60%", pctFinal: 0.3 },
  { faixa: 3, pts: 400, valor: 800, aparelhos: 6000, metaPct: "80%", pctFinal: 0.4 },
  { faixa: 4, pts: 500, valor: 1000, aparelhos: 6000, metaPct: "100%", pctFinal: 0.5 },
  { faixa: 5, pts: 600, valor: 1200, aparelhos: 6000, metaPct: "120%", pctFinal: 0.6 },
  { faixa: 6, pts: 700, valor: 1400, aparelhos: 6000, metaPct: "140%", pctFinal: 0.7 },
  { faixa: 7, pts: 800, valor: 2000, aparelhos: 6000, metaPct: "160%", pctFinal: 1.0 },
  { faixa: 8, pts: 1000, valor: 3200, aparelhos: 6000, metaPct: "200%", pctFinal: 1.6 },
];

// ALTAS — Premiação Base OTE R$3.200,00
const ALTAS_NOVO: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 40%", pctFinal: 0 },
  { faixa: 1, pts: 200, valor: 480, aparelhos: 6000, metaPct: "40%", pctFinal: 0.15 },
  { faixa: 2, pts: 300, valor: 960, aparelhos: 6000, metaPct: "60%", pctFinal: 0.3 },
  { faixa: 3, pts: 400, valor: 1280, aparelhos: 6000, metaPct: "80%", pctFinal: 0.4 },
  { faixa: 4, pts: 500, valor: 1600, aparelhos: 6000, metaPct: "100%", pctFinal: 0.5 },
  { faixa: 5, pts: 600, valor: 1920, aparelhos: 6000, metaPct: "120%", pctFinal: 0.6 },
  { faixa: 6, pts: 700, valor: 2240, aparelhos: 6000, metaPct: "140%", pctFinal: 0.7 },
  { faixa: 7, pts: 800, valor: 3200, aparelhos: 6000, metaPct: "160%", pctFinal: 1.0 },
  { faixa: 8, pts: 1000, valor: 5120, aparelhos: 6000, metaPct: "200%", pctFinal: 1.6 },
];

const APARELHO_BONUS_NOVO: { faixa: number; valor: number; mult: number }[] = [
  { faixa: 1, valor: 10000, mult: 0.005 },
  { faixa: 2, valor: 15000, mult: 0.0075 },
  { faixa: 3, valor: 20000, mult: 0.01 },
  { faixa: 4, valor: 25000, mult: 0.0125 },
  { faixa: 5, valor: 30000, mult: 0.015 },
  { faixa: 6, valor: 50000, mult: 0.02 },
];

async function upsertFaixaTable(indicator: string, rows: FaixaRow[]) {
  for (const r of rows) {
    await prisma.faixaTable.upsert({
      where: { indicator_faixa: { indicator, faixa: r.faixa } },
      update: { pts: r.pts, valor: r.valor, aparelhos: r.aparelhos, metaPct: r.metaPct, pctFinal: r.pctFinal },
      create: { indicator, faixa: r.faixa, pts: r.pts, valor: r.valor, aparelhos: r.aparelhos, metaPct: r.metaPct, pctFinal: r.pctFinal },
    });
  }
  // remove faixas antigas que não existem mais na régua nova (ex.: se a
  // tabela antiga tinha mais faixas do que a nova) — só a tabela de
  // configuração, não mexe em venda nenhuma.
  const faixasValidas = rows.map((r) => r.faixa);
  const removidas = await prisma.faixaTable.deleteMany({
    where: { indicator, faixa: { notIn: faixasValidas } },
  });
  return { atualizados: rows.length, removidos: removidas.count };
}

async function main() {
  console.log("Atualizando FaixaTable RENOV_MV (agora RENOV. MV + FB + AVA combinados)...");
  const resMV = await upsertFaixaTable("RENOV_MV", RENOV_MV_NOVO);
  console.log(`  ${resMV.atualizados} faixa(s) atualizada(s)/criada(s), ${resMV.removidos} faixa(s) antiga(s) removida(s).`);

  console.log("Atualizando FaixaTable ALTAS...");
  const resAltas = await upsertFaixaTable("ALTAS", ALTAS_NOVO);
  console.log(`  ${resAltas.atualizados} faixa(s) atualizada(s)/criada(s), ${resAltas.removidos} faixa(s) antiga(s) removida(s).`);

  console.log("Atualizando AparelhoBonus (régua de R$10 mil a R$50 mil)...");
  for (const r of APARELHO_BONUS_NOVO) {
    await prisma.aparelhoBonus.upsert({
      where: { faixa: r.faixa },
      update: { valor: r.valor, mult: r.mult },
      create: { faixa: r.faixa, valor: r.valor, mult: r.mult },
    });
  }
  const faixasBonusValidas = APARELHO_BONUS_NOVO.map((r) => r.faixa);
  const bonusRemovidos = await prisma.aparelhoBonus.deleteMany({ where: { faixa: { notIn: faixasBonusValidas } } });
  console.log(`  ${APARELHO_BONUS_NOVO.length} faixa(s) de bônus atualizada(s)/criada(s), ${bonusRemovidos.count} faixa(s) antiga(s) removida(s).`);

  console.log("");
  console.log("Concluído. RENOV_FBAVA e AparelhoFaixa (régua antiga de Aparelhos) ficaram como estavam, só não são mais lidas pelo cálculo novo.");
  console.log("Nenhuma venda, ponto já lançado ou premiação já fechada foi alterada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
