/**
 * Script ADITIVO/SEGURO — atualiza o catálogo de ALTAS (PJ) com os novos
 * planos de Móvel (linha nova), Móvel Portin (portabilidade) e Internet
 * Fixa, SEM apagar nada que já existe no banco (vendas antigas continuam
 * batendo com o catálogo antigo, mesmo depois de rodar este script).
 *
 * Como funciona: em vez de DELETAR os planos antigos (o que quebraria a
 * referência das vendas já registradas, que apontam pro catalogItemId),
 * cada plano antigo substituído é marcado como active=false — ele some do
 * catálogo de novas vendas (getCatalogData só lista active=true), mas
 * continua existindo no banco pras vendas antigas que já o referenciam.
 *
 * - Móvel (linha nova) e Móvel Portin (portabilidade): os 7 planos antigos
 *   de cada categoria são desativados e entram os 5 novos planos (valores e
 *   pontuação do print enviado).
 * - Internet Fixa: só o plano de 1GB é substituído (novo valor R$149,99 e
 *   nova pontuação) — os demais (400MB, 500MB, 600MB, 700MB, 2GB, 10GB)
 *   ficam exatamente como estão.
 * - Internet Fixa (Combo): categoria nova, só ADITIVA — 4 planos novos
 *   (500MG, 600MG, 700MG, 1GB) com valores/pontuação de combo, diferentes
 *   dos planos avulsos acima.
 *
 * Idempotente: pode rodar mais de uma vez sem duplicar nem desativar de
 * novo o que já foi aplicado.
 *
 * Rodar (dentro da pasta backend):
 *   npm run db:update-catalogo-2026-10
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface NovoItem {
  label: string;
  pts: number;
  price: number;
}

async function proximaOrdem(): Promise<number> {
  const max = await prisma.catalogItem.aggregate({ _max: { order: true } });
  return (max._max.order ?? -1) + 1;
}

// Substitui TODOS os planos ativos de uma categoria pelos novos — usado
// quando a categoria inteira trocou de tabela (Móvel / Móvel Portin).
// Desativa só o que não bate exatamente (label+pontos+preço) com um dos
// novos planos, e só cria o que ainda não existe ativo — por isso pode
// rodar de novo sem duplicar nem reverter nada.
async function substituirCategoriaInteira(
  indicator: string,
  categoryId: string,
  categoryName: string,
  categoryIcon: string,
  novosItens: NovoItem[]
): Promise<{ criados: number; desativados: number; ignorados: number }> {
  let ordem = await proximaOrdem();
  let criados = 0;
  let desativados = 0;
  let ignorados = 0;

  const ativos = await prisma.catalogItem.findMany({ where: { indicator, categoryId, active: true } });
  for (const item of ativos) {
    const bateComNovo = novosItens.some(
      (n) => n.label === item.label && n.pts === item.points && n.price === item.price
    );
    if (!bateComNovo) {
      await prisma.catalogItem.update({ where: { id: item.id }, data: { active: false } });
      desativados++;
    }
  }

  for (const n of novosItens) {
    const jaAtivo = await prisma.catalogItem.findFirst({
      where: { indicator, categoryId, label: n.label, points: n.pts, price: n.price, active: true },
    });
    if (jaAtivo) {
      ignorados++;
      continue;
    }
    await prisma.catalogItem.create({
      data: {
        indicator,
        categoryId,
        categoryName,
        categoryIcon,
        label: n.label,
        points: n.pts,
        price: n.price,
        order: ordem++,
        active: true,
      },
    });
    criados++;
  }

  return { criados, desativados, ignorados };
}

// Substitui só UM plano específico dentro de uma categoria (o resto da
// categoria fica intocado) — usado pro 1GB da Internet Fixa.
async function substituirItemUnico(params: {
  indicator: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  labelAntigo: string;
  novo: NovoItem;
}): Promise<{ criado: boolean; desativado: boolean }> {
  const { indicator, categoryId, categoryName, categoryIcon, labelAntigo, novo } = params;

  const jaAplicado = await prisma.catalogItem.findFirst({
    where: { indicator, categoryId, label: novo.label, points: novo.pts, price: novo.price, active: true },
  });
  const antigo = await prisma.catalogItem.findFirst({
    where: { indicator, categoryId, label: labelAntigo, active: true },
  });

  if (jaAplicado) {
    // já rodou antes — só garante que o plano antigo (se ainda ativo e for
    // um registro diferente do novo) fica desativado.
    if (antigo && antigo.id !== jaAplicado.id) {
      await prisma.catalogItem.update({ where: { id: antigo.id }, data: { active: false } });
      return { criado: false, desativado: true };
    }
    return { criado: false, desativado: false };
  }

  if (antigo) {
    await prisma.catalogItem.update({ where: { id: antigo.id }, data: { active: false } });
  }

  const ordem = await proximaOrdem();
  await prisma.catalogItem.create({
    data: {
      indicator,
      categoryId,
      categoryName,
      categoryIcon,
      label: novo.label,
      points: novo.pts,
      price: novo.price,
      order: ordem,
      active: true,
    },
  });

  return { criado: true, desativado: !!antigo };
}

// Adiciona planos novos numa categoria SEM mexer no que já existe (nem
// desativar) — usado pra categoria nova "Internet Fixa (Combo)".
async function adicionarItens(
  indicator: string,
  categoryId: string,
  categoryName: string,
  categoryIcon: string,
  novosItens: NovoItem[]
): Promise<{ criados: number; ignorados: number }> {
  let ordem = await proximaOrdem();
  let criados = 0;
  let ignorados = 0;

  for (const n of novosItens) {
    const existente = await prisma.catalogItem.findFirst({
      where: { indicator, categoryId, label: n.label, points: n.pts, price: n.price },
    });
    if (existente) {
      ignorados++;
      continue;
    }
    await prisma.catalogItem.create({
      data: {
        indicator,
        categoryId,
        categoryName,
        categoryIcon,
        label: n.label,
        points: n.pts,
        price: n.price,
        order: ordem++,
        active: true,
      },
    });
    criados++;
  }

  return { criados, ignorados };
}

// Novos planos de Móvel (linha nova) — print "NOVOS PLANOS".
const MOVEL_NOVOS: NovoItem[] = [
  { label: "10GB", pts: 10, price: 30.0 },
  { label: "25GB", pts: 14, price: 40.0 },
  { label: "60GB", pts: 17, price: 50.0 },
  { label: "80GB", pts: 19, price: 55.0 },
  { label: "100GB", pts: 35, price: 100.0 },
];

// Novos planos de Móvel Portin (portabilidade) — print "NOVOS PLANOS".
const MOVEL_PORTIN_NOVOS: NovoItem[] = [
  { label: "10GB", pts: 12, price: 30.0 },
  { label: "25GB", pts: 17, price: 40.0 },
  { label: "60GB", pts: 21, price: 50.0 },
  { label: "80GB", pts: 23, price: 55.0 },
  { label: "100GB", pts: 43, price: 100.0 },
];

// Novo valor/pontuação só do plano de 1GB (avulso) da Internet Fixa.
const FIXA_1GB_NOVO: NovoItem = { label: "1GB", pts: 52, price: 149.99 };

// Planos novos de Internet Fixa em combo — categoria nova, só soma aos que
// já existem (400MB/500MB/600MB/700MB/2GB/10GB continuam do jeito que estão).
const FIXA_COMBO_NOVOS: NovoItem[] = [
  { label: "500MG", pts: 28, price: 80.0 },
  { label: "600MG", pts: 28, price: 80.0 },
  { label: "700MG", pts: 33, price: 95.0 },
  { label: "1GB", pts: 35, price: 100.0 },
];

async function main() {
  console.log("Atualizando Móvel (linha nova)...");
  const resMovel = await substituirCategoriaInteira(
    "ALTAS",
    "movel",
    "Móvel (linha nova)",
    "📶",
    MOVEL_NOVOS
  );
  console.log(
    `  ${resMovel.criados} plano(s) novo(s) criado(s), ${resMovel.desativados} plano(s) antigo(s) desativado(s), ${resMovel.ignorados} já estavam aplicados.`
  );

  console.log("Atualizando Móvel Portin (portabilidade)...");
  const resPortin = await substituirCategoriaInteira(
    "ALTAS",
    "movelportin",
    "Móvel Portin (portabilidade)",
    "🔀",
    MOVEL_PORTIN_NOVOS
  );
  console.log(
    `  ${resPortin.criados} plano(s) novo(s) criado(s), ${resPortin.desativados} plano(s) antigo(s) desativado(s), ${resPortin.ignorados} já estavam aplicados.`
  );

  console.log("Atualizando o plano de 1GB da Internet Fixa (avulso)...");
  const resFixa1gb = await substituirItemUnico({
    indicator: "ALTAS",
    categoryId: "fixa",
    categoryName: "Internet Fixa (planos)",
    categoryIcon: "🌐",
    labelAntigo: "1GB",
    novo: FIXA_1GB_NOVO,
  });
  console.log(
    `  ${resFixa1gb.criado ? "Novo plano de 1GB criado" : "Plano de 1GB já estava atualizado"}${
      resFixa1gb.desativado ? " (plano antigo de 1GB desativado)." : "."
    }`
  );

  console.log("Adicionando planos novos de Internet Fixa (Combo)...");
  const resCombo = await adicionarItens(
    "ALTAS",
    "fixa_combo",
    "Internet Fixa (Combo)",
    "🌐",
    FIXA_COMBO_NOVOS
  );
  console.log(`  ${resCombo.criados} plano(s) novo(s) criado(s), ${resCombo.ignorados} já existiam (ignorados).`);

  console.log("Concluído. Nada foi apagado — catálogo antigo, vendas e usuários permanecem intactos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
