/**
 * Configura a régua do perfil RENOVAÇÃO FIXA — planilha "Premiação OTE
 * Flex", aba NOVO_OTE_Renov-OUT26.
 *
 * Grava (upsert por faixa, não apaga nada de venda/premiação já fechada):
 *  - FaixaTable "RENOV_FIXA": régua única (pool RENOV. MV + RENOV. FB +
 *    ALTAS), Premiação Base OTE R$1.200,00 / 100% da meta = 750 pts.
 *  - FaixaTable "BL_BONUS_RENOV_FIXA": degraus de bônus por quantidade de
 *    BL ativada no mês (reaproveita as colunas pts/valor da tabela como
 *    "qtd mínima de BL" / "R$ do degrau" — não é uma régua de pontuação).
 *  - FaixaTable "RENOV_FIXA_M1"/"RENOV_FIXA_M2"/"RENOV_FIXA_M3": régua de
 *    "rampagem" do 1º, 2º e 3º mês do colaborador no perfil (ver
 *    User.perfilDesde e mesRampagem() em aggregate.ts) — mesmos R$ por
 *    faixa da régua normal, pts reduzido (planilha com "Premiação Base
 *    OTE" de 100% da meta em 350 pts no mês 1, 400 pts no mês 2 e 500 pts
 *    no mês 3, em vez de 750). Com isso os 3 meses de rampagem estão
 *    completos.
 *
 * O bônus de Aparelhos (R$10 mil a R$50 mil) deste perfil REAPROVEITA a
 * tabela AparelhoBonus que já existe (os valores da planilha são idênticos
 * aos do Consultivo) — só o limiar de "avança 1 faixa" é diferente
 * (R$20.000,00 em vez de R$50.000,00), e isso já está fixo no código
 * (APARELHO_ADVANCE_THRESHOLD_RENOV_FIXA em calculo-premiacao.ts), não
 * precisa de dado novo no banco. O bônus de BL também NÃO muda em
 * rampagem (confirmado com o usuário) — só a régua principal.
 *
 * Rodar (dentro da pasta backend), depois de implantar o código novo:
 *   npx tsx prisma/configurar-renov-fixa.ts
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

// Régua única — colunas E (Pontuação) / G (Premiação Final) / D (% da Meta) / F (Multiplicador).
const FAIXAS_RENOV_FIXA: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 40%", pctFinal: 0 },
  { faixa: 1, pts: 300, valor: 180, aparelhos: 0, metaPct: "40%", pctFinal: 0.15 },
  { faixa: 2, pts: 450, valor: 360, aparelhos: 0, metaPct: "60%", pctFinal: 0.3 },
  { faixa: 3, pts: 600, valor: 480, aparelhos: 0, metaPct: "80%", pctFinal: 0.4 },
  { faixa: 4, pts: 750, valor: 600, aparelhos: 0, metaPct: "100%", pctFinal: 0.5 },
  { faixa: 5, pts: 900, valor: 720, aparelhos: 0, metaPct: "120%", pctFinal: 0.6 },
  { faixa: 6, pts: 1050, valor: 840, aparelhos: 0, metaPct: "140%", pctFinal: 0.7 },
  { faixa: 7, pts: 1200, valor: 1200, aparelhos: 0, metaPct: "160%", pctFinal: 1.0 },
  { faixa: 8, pts: 1500, valor: 1920, aparelhos: 0, metaPct: "200%", pctFinal: 1.6 },
];

// Régua de rampagem, mês 1 — mesma estrutura de FAIXAS_RENOV_FIXA, mas com
// "Premiação Base OTE" (100% da meta) em 350 pts em vez de 750: todas as
// faixas escalam proporcionalmente, o R$ de cada faixa fica idêntico ao da
// régua normal.
const FAIXAS_RENOV_FIXA_M1: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 40%", pctFinal: 0 },
  { faixa: 1, pts: 140, valor: 180, aparelhos: 0, metaPct: "40%", pctFinal: 0.15 },
  { faixa: 2, pts: 210, valor: 360, aparelhos: 0, metaPct: "60%", pctFinal: 0.3 },
  { faixa: 3, pts: 280, valor: 480, aparelhos: 0, metaPct: "80%", pctFinal: 0.4 },
  { faixa: 4, pts: 350, valor: 600, aparelhos: 0, metaPct: "100%", pctFinal: 0.5 },
  { faixa: 5, pts: 420, valor: 720, aparelhos: 0, metaPct: "120%", pctFinal: 0.6 },
  { faixa: 6, pts: 490, valor: 840, aparelhos: 0, metaPct: "140%", pctFinal: 0.7 },
  { faixa: 7, pts: 560, valor: 1200, aparelhos: 0, metaPct: "160%", pctFinal: 1.0 },
  { faixa: 8, pts: 700, valor: 1920, aparelhos: 0, metaPct: "200%", pctFinal: 1.6 },
];

// Régua de rampagem, mês 2 — mesma estrutura de FAIXAS_RENOV_FIXA, mas com
// "Premiação Base OTE" (100% da meta) em 400 pts em vez de 750: todas as
// faixas escalam proporcionalmente, o R$ de cada faixa fica idêntico ao da
// régua normal.
const FAIXAS_RENOV_FIXA_M2: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 40%", pctFinal: 0 },
  { faixa: 1, pts: 160, valor: 180, aparelhos: 0, metaPct: "40%", pctFinal: 0.15 },
  { faixa: 2, pts: 240, valor: 360, aparelhos: 0, metaPct: "60%", pctFinal: 0.3 },
  { faixa: 3, pts: 320, valor: 480, aparelhos: 0, metaPct: "80%", pctFinal: 0.4 },
  { faixa: 4, pts: 400, valor: 600, aparelhos: 0, metaPct: "100%", pctFinal: 0.5 },
  { faixa: 5, pts: 480, valor: 720, aparelhos: 0, metaPct: "120%", pctFinal: 0.6 },
  { faixa: 6, pts: 560, valor: 840, aparelhos: 0, metaPct: "140%", pctFinal: 0.7 },
  { faixa: 7, pts: 640, valor: 1200, aparelhos: 0, metaPct: "160%", pctFinal: 1.0 },
  { faixa: 8, pts: 800, valor: 1920, aparelhos: 0, metaPct: "200%", pctFinal: 1.6 },
];

// Régua de rampagem, mês 3 — mesma estrutura de FAIXAS_RENOV_FIXA, mas com
// "Premiação Base OTE" (100% da meta) em 500 pts em vez de 750: todas as
// faixas escalam proporcionalmente, o R$ de cada faixa fica idêntico ao da
// régua normal.
const FAIXAS_RENOV_FIXA_M3: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 40%", pctFinal: 0 },
  { faixa: 1, pts: 200, valor: 180, aparelhos: 0, metaPct: "40%", pctFinal: 0.15 },
  { faixa: 2, pts: 300, valor: 360, aparelhos: 0, metaPct: "60%", pctFinal: 0.3 },
  { faixa: 3, pts: 400, valor: 480, aparelhos: 0, metaPct: "80%", pctFinal: 0.4 },
  { faixa: 4, pts: 500, valor: 600, aparelhos: 0, metaPct: "100%", pctFinal: 0.5 },
  { faixa: 5, pts: 600, valor: 720, aparelhos: 0, metaPct: "120%", pctFinal: 0.6 },
  { faixa: 6, pts: 700, valor: 840, aparelhos: 0, metaPct: "140%", pctFinal: 0.7 },
  { faixa: 7, pts: 800, valor: 1200, aparelhos: 0, metaPct: "160%", pctFinal: 1.0 },
  { faixa: 8, pts: 1000, valor: 1920, aparelhos: 0, metaPct: "200%", pctFinal: 1.6 },
];

// Degraus do bônus de BL — colunas G (Qtd. BL) / H (Valor R$) da seção
// "Bônus de BL" da planilha. pts aqui = quantidade mínima de BL ativada.
const BL_BONUS_RENOV_FIXA: FaixaRow[] = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "", pctFinal: null },
  { faixa: 1, pts: 2, valor: 70, aparelhos: 0, metaPct: "", pctFinal: null },
  { faixa: 2, pts: 4, valor: 160, aparelhos: 0, metaPct: "", pctFinal: null },
  { faixa: 3, pts: 6, valor: 270, aparelhos: 0, metaPct: "", pctFinal: null },
  { faixa: 4, pts: 8, valor: 400, aparelhos: 0, metaPct: "", pctFinal: null },
  { faixa: 5, pts: 10, valor: 550, aparelhos: 0, metaPct: "", pctFinal: null },
  { faixa: 6, pts: 12, valor: 720, aparelhos: 0, metaPct: "", pctFinal: null },
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
  console.log("Criando/atualizando RENOV_FIXA (régua única — pool RENOV. MV + RENOV. FB + ALTAS)...");
  await upsertFaixaTable("RENOV_FIXA", FAIXAS_RENOV_FIXA);
  console.log(`  ${FAIXAS_RENOV_FIXA.length} faixa(s) gravada(s).`);

  console.log("Criando/atualizando BL_BONUS_RENOV_FIXA (degraus do bônus de BL)...");
  await upsertFaixaTable("BL_BONUS_RENOV_FIXA", BL_BONUS_RENOV_FIXA);
  console.log(`  ${BL_BONUS_RENOV_FIXA.length} degrau(s) gravado(s).`);

  console.log("Criando/atualizando RENOV_FIXA_M1 (régua de rampagem — mês 1)...");
  await upsertFaixaTable("RENOV_FIXA_M1", FAIXAS_RENOV_FIXA_M1);
  console.log(`  ${FAIXAS_RENOV_FIXA_M1.length} faixa(s) gravada(s).`);

  console.log("Criando/atualizando RENOV_FIXA_M2 (régua de rampagem — mês 2)...");
  await upsertFaixaTable("RENOV_FIXA_M2", FAIXAS_RENOV_FIXA_M2);
  console.log(`  ${FAIXAS_RENOV_FIXA_M2.length} faixa(s) gravada(s).`);

  console.log("Criando/atualizando RENOV_FIXA_M3 (régua de rampagem — mês 3)...");
  await upsertFaixaTable("RENOV_FIXA_M3", FAIXAS_RENOV_FIXA_M3);
  console.log(`  ${FAIXAS_RENOV_FIXA_M3.length} faixa(s) gravada(s).`);

  console.log("");
  console.log("Concluído. Os 3 meses de rampagem (M1/M2/M3) estão completos. O bônus de Aparelhos deste perfil");
  console.log("reaproveita a tabela AparelhoBonus já existente. Nenhuma venda, ponto já lançado ou premiação");
  console.log("já fechada foi alterada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
