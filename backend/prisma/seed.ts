/**
 * Seed do catálogo de produtos/pontos e das tabelas de faixas, extraídos
 * diretamente das constantes do simulador original (index.html):
 * RENOV_MV, RENOV_FB, RENOV_AVA_DADOS, RENOV_AVA_VOZ, ALTAS_CATEGORIES,
 * FAIXAS_MV, FAIXAS_FBAVA, FAIXAS_ALTAS, APARELHO_FAIXAS, APARELHO_BONUS.
 * Os valores não foram alterados — apenas reestruturados em linhas de tabela.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const RENOV_MV = [
  { label: "UP", pts: 10 },
  { label: "Padrão", pts: 7 },
  { label: "Down", pts: 4 },
];

const RENOV_FB = [
  { label: "UP", pts: 20 },
  { label: "Padrão", pts: 14 },
];
const RENOV_AVA_DADOS = [
  { label: "UP", pts: 100 },
  { label: "Padrão", pts: 70 },
];
const RENOV_AVA_VOZ = [
  { label: "UP", pts: 90 },
  { label: "Padrão", pts: 63 },
];

const ALTAS_CATEGORIES = [
  { id: "movel", name: "Móvel (linha nova)", icon: "📶", items: [
    { label: "6GB", pts: 14, price: 39.99 },
    { label: "15GB", pts: 19, price: 54.99 },
    { label: "20GB", pts: 21, price: 59.99 },
    { label: "30GB", pts: 25, price: 69.99 },
    { label: "40GB", pts: 28, price: 79.99 },
    { label: "50GB", pts: 32, price: 89.99 },
    { label: "100GB", pts: 35, price: 99.99 },
  ]},
  { id: "movelportin", name: "Móvel Portin (portabilidade)", icon: "🔀", items: [
    { label: "6GB", pts: 17, price: 39.99 },
    { label: "15GB", pts: 23, price: 54.99 },
    { label: "20GB", pts: 26, price: 59.99 },
    { label: "30GB", pts: 30, price: 69.99 },
    { label: "40GB", pts: 34, price: 79.99 },
    { label: "50GB", pts: 38, price: 89.99 },
    { label: "100GB", pts: 43, price: 99.99 },
  ]},
  { id: "fixa", name: "Internet Fixa (planos)", icon: "🌐", items: [
    { label: "400MB", pts: 28, price: 79.99 },
    { label: "500MB", pts: 32, price: 89.99 },
    { label: "600MB", pts: 33, price: 94.99 },
    { label: "700MB", pts: 35, price: 99.99 },
    { label: "1GB", pts: 70, price: 199.99 },
    { label: "2GB", pts: 140, price: 399.99 },
    { label: "10GB", pts: 700, price: 1999.99 },
  ]},
  { id: "dados", name: "Dados (plano avulso)", icon: "📡", items: [
    { label: "10GB", pts: 7, price: 49.99 },
    { label: "40GB", pts: 9, price: 69.99 },
    { label: "100GB", pts: 13, price: 99.99 },
    { label: "300GB", pts: 20, price: 149.99 },
    { label: "500GB", pts: 33, price: 249.99 },
  ]},
  { id: "tv", name: "TV", icon: "📺", items: [
    { label: "Essencial", pts: 27, price: 124.99 },
    { label: "Avançado", pts: 37, price: 169.99 },
    { label: "Completo", pts: 64, price: 294.99 },
  ]},
  { id: "fixo", name: "Telefonia Fixa", icon: "☎️", items: [
    { label: "Voz Ilimitado BR", pts: 6, price: 30.0 },
    { label: "Link dedicado", pts: 175, price: 500.0 },
  ]},
  { id: "sip", name: "SIP", icon: "🔌", items: [
    { label: "SIP", pts: 158, price: 450.0 },
  ]},
  { id: "vvn", name: "VVN", icon: "🎧", items: [
    { label: "1 a 4", pts: 19, price: 55.0 },
    { label: "5 a 8", pts: 17, price: 50.0 },
    { label: "9 a 20", pts: 16, price: 45.0 },
  ]},
  { id: "ms365", name: "Microsoft 365", icon: "💠", items: [
    { label: "Basic", pts: 7, price: 35.0 },
    { label: "Aplicativos", pts: 16, price: 88.33 },
    { label: "Standard", pts: 17, price: 90.61 },
  ]},
  { id: "gworkspace", name: "Google Workspace", icon: "🧮", items: [
    { label: "Starter", pts: 9, price: 49.0 },
    { label: "Standard", pts: 18, price: 98.0 },
    { label: "Plus", pts: 29, price: 154.0 },
  ]},
  { id: "antivirus", name: "Antivírus", icon: "🛡️", items: [
    { label: "1x1", pts: 2, price: 9.99 },
    { label: "1x5", pts: 4, price: 19.99 },
    { label: "1x10", pts: 7, price: 35.0 },
  ]},
  { id: "mdm", name: "MDM", icon: "🖥️", items: [
    { label: "Gestão de Dispositivos", pts: 1, price: 6.9 },
  ]},
  { id: "valesaude", name: "Vale Saúde", icon: "➕", items: [
    { label: "Sempre", pts: 3, price: 15.9 },
  ]},
  { id: "travel", name: "Travel", icon: "✈️", items: [
    { label: "Américas", pts: 3, price: 14.99 },
    { label: "Europa", pts: 5, price: 24.99 },
    { label: "Mundo", pts: 7, price: 34.99 },
  ]},
];

const FAIXAS_MV = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 60%", pctFinal: null },
  { faixa: 1, pts: 300, valor: 300, aparelhos: 6000, metaPct: "60%", pctFinal: 0.2 },
  { faixa: 2, pts: 400, valor: 600, aparelhos: 8000, metaPct: "80%", pctFinal: 0.3 },
  { faixa: 3, pts: 500, valor: 1000, aparelhos: 10000, metaPct: "100%", pctFinal: 0.4 },
  { faixa: 4, pts: 600, valor: 1400, aparelhos: 12000, metaPct: "120%", pctFinal: 0.47 },
  { faixa: 5, pts: 750, valor: 2000, aparelhos: 15000, metaPct: "150%", pctFinal: 0.53 },
  { faixa: 6, pts: 1000, valor: 3200, aparelhos: 20000, metaPct: "200%", pctFinal: 0.64 },
];
const FAIXAS_FBAVA = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 60%", pctFinal: null },
  { faixa: 1, pts: 90, valor: 75, aparelhos: 0, metaPct: "60%", pctFinal: 0.17 },
  { faixa: 2, pts: 120, valor: 150, aparelhos: 0, metaPct: "80%", pctFinal: 0.25 },
  { faixa: 3, pts: 150, valor: 250, aparelhos: 0, metaPct: "100%", pctFinal: 0.33 },
  { faixa: 4, pts: 180, valor: 350, aparelhos: 0, metaPct: "120%", pctFinal: 0.39 },
  { faixa: 5, pts: 225, valor: 500, aparelhos: 0, metaPct: "150%", pctFinal: 0.44 },
  { faixa: 6, pts: 300, valor: 800, aparelhos: 0, metaPct: "200%", pctFinal: 0.53 },
];
const FAIXAS_ALTAS = [
  { faixa: 0, pts: 0, valor: 0, aparelhos: 0, metaPct: "< 60%", pctFinal: null },
  { faixa: 1, pts: 300, valor: 480, aparelhos: 6000, metaPct: "60%", pctFinal: 0.32 },
  { faixa: 2, pts: 400, valor: 960, aparelhos: 8000, metaPct: "80%", pctFinal: 0.48 },
  { faixa: 3, pts: 500, valor: 1600, aparelhos: 10000, metaPct: "100%", pctFinal: 0.64 },
  { faixa: 4, pts: 600, valor: 2240, aparelhos: 12000, metaPct: "120%", pctFinal: 0.75 },
  { faixa: 5, pts: 750, valor: 3200, aparelhos: 15000, metaPct: "150%", pctFinal: 0.85 },
  { faixa: 6, pts: 1000, valor: 5120, aparelhos: 20000, metaPct: "200%", pctFinal: 1.02 },
];

const APARELHO_FAIXAS = [
  { faixa: 0, valor: 0, metaPct: "< 60%" },
  { faixa: 1, valor: 6000, metaPct: "60%" },
  { faixa: 2, valor: 8000, metaPct: "80%" },
  { faixa: 3, valor: 10000, metaPct: "100%" },
  { faixa: 4, valor: 12000, metaPct: "120%" },
  { faixa: 5, valor: 15000, metaPct: "150%" },
  { faixa: 6, valor: 20000, metaPct: "200%" },
];

const APARELHO_BONUS = [
  { faixa: 0, valor: 0, mult: 0 },
  { faixa: 1, valor: 10000, mult: 0.005 },
  { faixa: 2, valor: 15000, mult: 0.0075 },
  { faixa: 3, valor: 20000, mult: 0.01 },
  { faixa: 4, valor: 25000, mult: 0.0125 },
  { faixa: 5, valor: 30000, mult: 0.015 },
  { faixa: 6, valor: 50000, mult: 0.02 },
];

async function main() {
  console.log("Limpando catálogo/faixas existentes...");
  await prisma.saleItem.deleteMany();
  await prisma.saleStatusHistory.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.catalogItem.deleteMany();
  await prisma.faixaTable.deleteMany();
  await prisma.aparelhoFaixa.deleteMany();
  await prisma.aparelhoBonus.deleteMany();

  console.log("Semeando catálogo...");
  let order = 0;
  for (const item of RENOV_MV) {
    await prisma.catalogItem.create({
      data: { indicator: "RENOV_MV", label: item.label, points: item.pts, order: order++ },
    });
  }
  for (const item of RENOV_FB) {
    await prisma.catalogItem.create({
      data: { indicator: "RENOV_FB", label: item.label, points: item.pts, order: order++ },
    });
  }
  for (const item of RENOV_AVA_DADOS) {
    await prisma.catalogItem.create({
      data: { indicator: "RENOV_AVA_DADOS", label: item.label, points: item.pts, order: order++ },
    });
  }
  for (const item of RENOV_AVA_VOZ) {
    await prisma.catalogItem.create({
      data: { indicator: "RENOV_AVA_VOZ", label: item.label, points: item.pts, order: order++ },
    });
  }
  for (const cat of ALTAS_CATEGORIES) {
    for (const item of cat.items) {
      await prisma.catalogItem.create({
        data: {
          indicator: "ALTAS",
          categoryId: cat.id,
          categoryName: cat.name,
          categoryIcon: cat.icon,
          label: item.label,
          points: item.pts,
          price: item.price,
          order: order++,
        },
      });
    }
  }

  console.log("Semeando tabelas de faixas...");
  for (const f of FAIXAS_MV) {
    await prisma.faixaTable.create({
      data: { indicator: "RENOV_MV", faixa: f.faixa, pts: f.pts, valor: f.valor, aparelhos: f.aparelhos, metaPct: f.metaPct, pctFinal: f.pctFinal },
    });
  }
  for (const f of FAIXAS_FBAVA) {
    await prisma.faixaTable.create({
      data: { indicator: "RENOV_FBAVA", faixa: f.faixa, pts: f.pts, valor: f.valor, aparelhos: f.aparelhos, metaPct: f.metaPct, pctFinal: f.pctFinal },
    });
  }
  for (const f of FAIXAS_ALTAS) {
    await prisma.faixaTable.create({
      data: { indicator: "ALTAS", faixa: f.faixa, pts: f.pts, valor: f.valor, aparelhos: f.aparelhos, metaPct: f.metaPct, pctFinal: f.pctFinal },
    });
  }
  for (const f of APARELHO_FAIXAS) {
    await prisma.aparelhoFaixa.create({ data: { faixa: f.faixa, valor: f.valor, metaPct: f.metaPct } });
  }
  for (const f of APARELHO_BONUS) {
    await prisma.aparelhoBonus.create({ data: { faixa: f.faixa, valor: f.valor, mult: f.mult } });
  }

  console.log("Criando usuários iniciais...");
  const masterPassword = await bcrypt.hash("Trocar@123", 10);

  const master1 = await prisma.user.upsert({
    where: { email: "master1@flexpremia.local" },
    update: {},
    create: {
      name: "Master 1",
      email: "master1@flexpremia.local",
      passwordHash: masterPassword,
      role: "MASTER",
      mustChangePassword: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "master2@flexpremia.local" },
    update: {},
    create: {
      name: "Master 2",
      email: "master2@flexpremia.local",
      passwordHash: masterPassword,
      role: "MASTER",
      mustChangePassword: true,
      createdById: master1.id,
    },
  });

  // Equipe + supervisor + colaborador de exemplo, para facilitar testes locais.
  const supervisorPassword = await bcrypt.hash("Trocar@123", 10);
  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor1@flexpremia.local" },
    update: {},
    create: {
      name: "Supervisor Exemplo",
      email: "supervisor1@flexpremia.local",
      passwordHash: supervisorPassword,
      role: "SUPERVISOR",
      mustChangePassword: true,
      createdById: master1.id,
    },
  });

  const team = await prisma.team.upsert({
    where: { supervisorId: supervisor.id },
    update: {},
    create: { name: "Equipe Exemplo", supervisorId: supervisor.id },
  });

  const colabPassword = await bcrypt.hash("Trocar@123", 10);
  await prisma.user.upsert({
    where: { email: "colaborador1@flexpremia.local" },
    update: {},
    create: {
      name: "Colaborador Exemplo",
      email: "colaborador1@flexpremia.local",
      passwordHash: colabPassword,
      role: "COLABORADOR",
      teamId: team.id,
      mustChangePassword: true,
      createdById: supervisor.id,
    },
  });

  console.log("Seed concluído.");
  console.log("Logins de teste (senha para todos: Trocar@123):");
  console.log("  master1@flexpremia.local / master2@flexpremia.local (MASTER)");
  console.log("  supervisor1@flexpremia.local (SUPERVISOR)");
  console.log("  colaborador1@flexpremia.local (COLABORADOR)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
