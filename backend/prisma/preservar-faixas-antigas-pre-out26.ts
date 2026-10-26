/**
 * Preserva as réguas ANTIGAS de RENOV_MV e ALTAS (as que valiam até
 * SET/2026, antes da atualização de faixas de OUT/2026) sob os
 * indicadores "RENOV_MV_PRE_OUT26" e "ALTAS_PRE_OUT26" — usados pelo
 * cálculo quando o mês calculado é SET/2026 ou anterior (ver
 * calculo-premiacao.ts / aggregate.ts usaRegraNova()).
 *
 * Os valores abaixo são os mesmos de prisma/seed.ts (FAIXAS_MV e
 * FAIXAS_ALTAS originais) — a régua que estava em produção antes da
 * atualização de OUT/2026 ter sobrescrito os indicadores "RENOV_MV" e
 * "ALTAS".
 *
 * Idempotente (upsert por indicador+faixa), não mexe em nenhuma venda,
 * ponto já lançado ou premiação já fechada.
 *
 * Rodar (dentro da pasta backend):
 *   npx tsx prisma/preservar-faixas-antigas-pre-out26.ts
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

const FAIXAS_MV_ANTIGA: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 60%", pctFinal: null },
  { faixa: 1, pts: 300, valor: 300, aparelhos: 6000, metaPct: "60%", pctFinal: 0.2 },
  { faixa: 2, pts: 400, valor: 600, aparelhos: 8000, metaPct: "80%", pctFinal: 0.3 },
  { faixa: 3, pts: 500, valor: 1000, aparelhos: 10000, metaPct: "100%", pctFinal: 0.4 },
  { faixa: 4, pts: 600, valor: 1400, aparelhos: 12000, metaPct: "120%", pctFinal: 0.47 },
  { faixa: 5, pts: 750, valor: 2000, aparelhos: 15000, metaPct: "150%", pctFinal: 0.53 },
  { faixa: 6, pts: 1000, valor: 3200, aparelhos: 20000, metaPct: "200%", pctFinal: 0.64 },
];

const FAIXAS_ALTAS_ANTIGA: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 60%", pctFinal: null },
  { faixa: 1, pts: 300, valor: 480, aparelhos: 6000, metaPct: "60%", pctFinal: 0.32 },
  { faixa: 2, pts: 400, valor: 960, aparelhos: 8000, metaPct: "80%", pctFinal: 0.48 },
  { faixa: 3, pts: 500, valor: 1600, aparelhos: 10000, metaPct: "100%", pctFinal: 0.64 },
  { faixa: 4, pts: 600, valor: 2240, aparelhos: 12000, metaPct: "120%", pctFinal: 0.75 },
  { faixa: 5, pts: 750, valor: 3200, aparelhos: 15000, metaPct: "150%", pctFinal: 0.85 },
  { faixa: 6, pts: 1000, valor: 5120, aparelhos: 20000, metaPct: "200%", pctFinal: 1.02 },
];

async function upsertFaixaTable(indicator: string, rows: FaixaRow[]) {
  for (const r of rows) {
    await prisma.faixaTable.upsert({
      where: { indicator_faixa: { indicator, faixa: r.faixa } },
      update: { pts: r.pts, valor: r.valor, aparelhos: r.aparelhos, metaPct: r.metaPct, pctFinal: r.pctFinal },
      create: { indicator, faixa: r.faixa, pts: r.pts, valor: r.valor, aparelhos: r.aparelhos, metaPct: r.metaPct, pctFinal: r.pctFinal },
    });
  }
}

async function main() {
  console.log("Criando/atualizando RENOV_MV_PRE_OUT26 (régua antiga, válida até SET/2026)...");
  await upsertFaixaTable("RENOV_MV_PRE_OUT26", FAIXAS_MV_ANTIGA);
  console.log(`  ${FAIXAS_MV_ANTIGA.length} faixa(s) gravada(s).`);

  console.log("Criando/atualizando ALTAS_PRE_OUT26 (régua antiga, válida até SET/2026)...");
  await upsertFaixaTable("ALTAS_PRE_OUT26", FAIXAS_ALTAS_ANTIGA);
  console.log(`  ${FAIXAS_ALTAS_ANTIGA.length} faixa(s) gravada(s).`);

  console.log("");
  console.log("Concluído. RENOV_MV e ALTAS (régua nova, a partir de OUT/2026) continuam como estavam.");
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
