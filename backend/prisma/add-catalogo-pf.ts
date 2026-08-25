/**
 * Script ADITIVO — adiciona o catálogo de ALTAS_PF (Pessoa Física), a tabela
 * de faixas de ALTAS_PF, e os novos produtos de ALTAS (PJ) (Exchange Online
 * dentro de Microsoft 365, e a nova categoria "Seguro de Celular"), SEM
 * apagar nada que já existe no banco (catálogo antigo, faixas antigas,
 * vendas, usuários...).
 *
 * Ao contrário de seed.ts (que apaga tudo antes de recriar — só serve para
 * banco de teste/local), este script é seguro para rodar em produção: ele
 * verifica se cada item já existe antes de criar, então pode ser rodado
 * mais de uma vez sem duplicar nada.
 *
 * Rodar (dentro da pasta backend):
 *   npm run db:add-altas-pf
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALTAS_PF_CATEGORIES = [
  { id: "pf_fixa", name: "FIXA", icon: "🌐", items: [
    { label: "500 Mega", pts: 29, price: 100.0 },
    { label: "600 Mega", pts: 29, price: 100.0 },
    { label: "700 Mega", pts: 46, price: 150.0 },
    { label: "1 Giga", pts: 93, price: 300.0 },
    { label: "2 Giga", pts: 124, price: 400.0 },
    { label: "10 Giga", pts: 624, price: 2000.0 },
    { label: "Telefone Fixo", pts: 14, price: 47.0 },
  ]},
  { id: "pf_tv500600", name: "TV > 500/600MB", icon: "📺", items: [
    { label: "Amazon Prime", pts: 4, price: 13.9 },
    { label: "Globoplay", pts: 7, price: 22.9 },
    { label: "Disney+", pts: 13, price: 43.9 },
    { label: "Netflix Padrão", pts: 13, price: 44.9 },
    { label: "Netflix Premium", pts: 18, price: 59.9 },
    { label: "Inicial", pts: 13, price: 45.0 },
    { label: "Estendido", pts: 19, price: 65.0 },
    { label: "Avançado", pts: 49, price: 170.0 },
    { label: "Completo", pts: 85, price: 295.0 },
  ]},
  { id: "pf_tv700", name: "TV > 700MG+", icon: "📺", items: [
    { label: "Amazon Prime – Fibra Gamer Incluso", pts: 6, price: 20.0 },
    { label: "Globoplay", pts: 3, price: 10.0 },
    { label: "Disney+", pts: 7, price: 25.0 },
    { label: "Netflix Padrão", pts: 9, price: 30.0 },
    { label: "Netflix Premium", pts: 12, price: 40.0 },
    { label: "Inicial", pts: 13, price: 45.0 },
    { label: "Estendido", pts: 19, price: 65.0 },
    { label: "Avançado", pts: 49, price: 170.0 },
    { label: "Completo", pts: 85, price: 295.0 },
  ]},
  { id: "pf_pos", name: "PÓS", icon: "📱", items: [
    { label: "Inicial", pts: 27, price: 99.0 },
    { label: "Família 2", pts: 61, price: 220.0 },
    { label: "Família 3", pts: 80, price: 290.0 },
    { label: "Família 4", pts: 102, price: 370.0 },
    { label: "Família 5", pts: 127, price: 460.0 },
  ]},
  { id: "pf_controle", name: "CONTROLE", icon: "📱", items: [
    { label: "10 GB", pts: 13, price: 49.0 },
    { label: "11 GB", pts: 14, price: 54.0 },
    { label: "15 GB", pts: 17, price: 62.0 },
  ]},
];

const FAIXAS_ALTAS_PF = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 60%", pctFinal: null },
  { faixa: 1, pts: 300, valor: 300, aparelhos: 0, metaPct: "60%", pctFinal: 0.2 },
  { faixa: 2, pts: 400, valor: 600, aparelhos: 0, metaPct: "80%", pctFinal: 0.3 },
  { faixa: 3, pts: 500, valor: 1000, aparelhos: 0, metaPct: "100%", pctFinal: 0.4 },
  { faixa: 4, pts: 600, valor: 1400, aparelhos: 0, metaPct: "120%", pctFinal: 0.47 },
  { faixa: 5, pts: 750, valor: 2000, aparelhos: 0, metaPct: "150%", pctFinal: 0.53 },
  { faixa: 6, pts: 1000, valor: 3200, aparelhos: 0, metaPct: "200%", pctFinal: 0.64 },
];

// Novos produtos de ALTAS (PJ) — entram na categoria "ms365" já existente.
const MS365_NOVOS_ITENS = [
  { label: "Exchange Online — Kiosk (2GB)", pts: 3, price: 18.0 },
  { label: "Exchange Online — Plano 1 (50GB)", pts: 7, price: 36.0 },
  { label: "Exchange Online — Plano 2 (100GB)", pts: 13, price: 71.0 },
];

// Novos produtos de ALTAS (PJ) — categoria nova "Seguro de Celular".
const SEGURO_CATEGORIA = {
  id: "seguro",
  name: "Seguro de Celular",
  icon: "🛡️",
  items: [
    { label: "R+FSeQ — Até R$ 500", pts: 0, price: 3.39 },
    { label: "R+FSeQ — Até R$ 1.000", pts: 1, price: 6.79 },
    { label: "R+FSeQ — Até R$ 2.000", pts: 2, price: 13.59 },
    { label: "R+FSeQ — Até R$ 3.000", pts: 4, price: 22.66 },
    { label: "R+FSeQ — Até R$ 5.000", pts: 7, price: 36.26 },
    { label: "R+FSeQ — Até R$ 8.000", pts: 9, price: 47.59 },
    { label: "R+FSeQ — Até R$ 10.000", pts: 13, price: 64.79 },
    { label: "R+FSeQ — Até R$ 15.000", pts: 24, price: 120.1 },
    { label: "R+FSeQ+DANOS — Até R$ 500", pts: 0, price: 5.6 },
    { label: "R+FSeQ+DANOS — Até R$ 1.000", pts: 2, price: 11.21 },
    { label: "R+FSeQ+DANOS — Até R$ 2.000", pts: 4, price: 22.43 },
    { label: "R+FSeQ+DANOS — Até R$ 3.000", pts: 7, price: 37.39 },
    { label: "R+FSeQ+DANOS — Até R$ 5.000", pts: 12, price: 59.82 },
    { label: "R+FSeQ+DANOS — Até R$ 8.000", pts: 15, price: 78.53 },
    { label: "R+FSeQ+DANOS — Até R$ 10.000", pts: 21, price: 106.91 },
    { label: "R+FSeQ+DANOS — Até R$ 15.000", pts: 39, price: 198.16 },
  ],
};

async function proximaOrdem(): Promise<number> {
  const max = await prisma.catalogItem.aggregate({ _max: { order: true } });
  return (max._max.order ?? -1) + 1;
}

async function criarItemSeNaoExiste(params: {
  indicator: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  label: string;
  points: number;
  price: number | null;
  order: number;
}): Promise<boolean> {
  const existente = await prisma.catalogItem.findFirst({
    where: { indicator: params.indicator, categoryId: params.categoryId, label: params.label },
  });
  if (existente) return false;
  await prisma.catalogItem.create({ data: params });
  return true;
}

async function main() {
  let criados = 0;
  let ignorados = 0;
  let ordem = await proximaOrdem();

  console.log("Adicionando catálogo ALTAS_PF (Pessoa Física)...");
  for (const cat of ALTAS_PF_CATEGORIES) {
    for (const item of cat.items) {
      const foiCriado = await criarItemSeNaoExiste({
        indicator: "ALTAS_PF",
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        label: item.label,
        points: item.pts,
        price: item.price,
        order: ordem,
      });
      if (foiCriado) {
        ordem++;
        criados++;
      } else {
        ignorados++;
      }
    }
  }

  console.log("Adicionando novos produtos em ALTAS (PJ) — Microsoft 365 / Exchange Online...");
  const ms365 = await prisma.catalogItem.findFirst({ where: { indicator: "ALTAS", categoryId: "ms365" } });
  for (const item of MS365_NOVOS_ITENS) {
    const foiCriado = await criarItemSeNaoExiste({
      indicator: "ALTAS",
      categoryId: "ms365",
      categoryName: ms365?.categoryName ?? "Microsoft 365",
      categoryIcon: ms365?.categoryIcon ?? "💠",
      label: item.label,
      points: item.pts,
      price: item.price,
      order: ordem,
    });
    if (foiCriado) {
      ordem++;
      criados++;
    } else {
      ignorados++;
    }
  }

  console.log("Adicionando novos produtos em ALTAS (PJ) — Seguro de Celular...");
  for (const item of SEGURO_CATEGORIA.items) {
    const foiCriado = await criarItemSeNaoExiste({
      indicator: "ALTAS",
      categoryId: SEGURO_CATEGORIA.id,
      categoryName: SEGURO_CATEGORIA.name,
      categoryIcon: SEGURO_CATEGORIA.icon,
      label: item.label,
      points: item.pts,
      price: item.price,
      order: ordem,
    });
    if (foiCriado) {
      ordem++;
      criados++;
    } else {
      ignorados++;
    }
  }

  console.log("Adicionando/atualizando tabela de faixas ALTAS_PF...");
  for (const f of FAIXAS_ALTAS_PF) {
    await prisma.faixaTable.upsert({
      where: { indicator_faixa: { indicator: "ALTAS_PF", faixa: f.faixa } },
      update: { pts: f.pts, valor: f.valor, aparelhos: f.aparelhos, metaPct: f.metaPct, pctFinal: f.pctFinal },
      create: { indicator: "ALTAS_PF", faixa: f.faixa, pts: f.pts, valor: f.valor, aparelhos: f.aparelhos, metaPct: f.metaPct, pctFinal: f.pctFinal },
    });
  }

  console.log(`Concluído: ${criados} produto(s) novo(s) criado(s), ${ignorados} já existiam (ignorados). Faixas ALTAS_PF criadas/atualizadas: ${FAIXAS_ALTAS_PF.length}.`);
  console.log("Nada foi apagado — catálogo antigo, vendas e usuários permanecem intactos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
