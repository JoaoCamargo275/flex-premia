import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/middleware";
import { isValidCnpj, onlyDigits } from "../lib/cnpj";
import type { Indicator } from "../lib/types";
import { getPainelColaborador } from "../lib/aggregate";
import { parsePeriod } from "../lib/period";

export const salesRouter = Router();

salesRouter.use(requireAuth, requireRole("COLABORADOR"));

interface CartItemInput {
  catalogItemId?: string;
  indicator: Indicator;
  label: string;
  quantity: number;
  observacao?: string;
}

// Dentro de ALTAS existem várias categorias com planos de nome parecido
// (ex.: "400MB" aparece tanto em Internet Fixa quanto poderia se confundir
// com outros). Prefixamos o rótulo salvo com a categoria para não perder
// essa informação depois, nas telas de acompanhamento.
const ALTAS_CATEGORY_PREFIX: Record<string, string> = {
  movel: "Móvel",
  movelportin: "Portin",
  fixa: "FB",
  dados: "Dados",
  tv: "TV",
  fixo: "Fixo",
  sip: "SIP",
  vvn: "VVN",
  ms365: "MS365",
  gworkspace: "Google WS",
  antivirus: "Antivírus",
  mdm: "MDM",
  valesaude: "Vale Saúde",
  travel: "Travel",
};

// O colaborador registra as vendas mês a mês — o calendariozinho ao lado do
// badge "COLABORADOR" (no topo) permite ver o painel e a lista de vendas de
// um mês específico, filtrando por data de lançamento (createdAt).
salesRouter.get("/painel", async (req: AuthedRequest, res) => {
  const period = parsePeriod(req.query);
  const painel = await getPainelColaborador(req.user!.sub, period);
  res.json(painel);
});

salesRouter.get("/", async (req: AuthedRequest, res) => {
  const period = parsePeriod(req.query);
  const sales = await prisma.sale.findMany({
    where: {
      colaboradorId: req.user!.sub,
      ...(period.from || period.to
        ? { createdAt: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) } }
        : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
});

salesRouter.post("/", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const input = req.body as {
      clienteNome: string;
      clienteCnpj: string;
      observacao?: string;
      items: CartItemInput[];
      dataVenda?: string;
    };

    const clienteNome = (input.clienteNome || "").trim();
    const clienteCnpj = onlyDigits(input.clienteCnpj || "");

    if (!clienteNome) throw new Error("Informe o nome do cliente.");
    if (!isValidCnpj(clienteCnpj)) throw new Error("CNPJ inválido.");
    if (!input.items?.length) throw new Error("Adicione ao menos um item na venda.");

    // O colaborador pode estar registrando retroativamente num mês passado
    // (calendariozinho do topo) — nesse caso o front manda a data desse mês
    // em dataVenda; sem isso, cai no padrão do schema (agora, no momento
    // da criação).
    let createdAt: Date | undefined;
    if (input.dataVenda) {
      const parsed = new Date(input.dataVenda);
      if (Number.isNaN(parsed.getTime())) throw new Error("Data da venda inválida.");
      createdAt = parsed;
    }

    const catalogIds = input.items.map((i) => i.catalogItemId).filter((v): v is string => !!v);
    const catalogItems = catalogIds.length
      ? await prisma.catalogItem.findMany({ where: { id: { in: catalogIds } } })
      : [];
    const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));

    const itemsData = input.items.map((item) => {
      if (item.indicator === "APARELHOS") {
        const valor = Number(item.quantity) || 0;
        if (valor <= 0) throw new Error("Informe um valor válido para o aparelho.");
        const nomeAparelho = (item.label || "").trim();
        if (!nomeAparelho) throw new Error("Informe o aparelho vendido.");
        return {
          indicator: "APARELHOS",
          label: nomeAparelho,
          quantity: 1,
          pointsUnit: 0,
          pointsTotal: 0,
          valorReais: valor,
          observacao: item.observacao?.trim() || null,
          status: "Pendente",
        };
      }
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) throw new Error(`Quantidade inválida para ${item.label}.`);
      const catalogItem = item.catalogItemId ? catalogMap.get(item.catalogItemId) : undefined;
      const pointsUnit = catalogItem ? catalogItem.points : 0;
      let label = catalogItem ? catalogItem.label : item.label;
      if (item.indicator === "ALTAS" && catalogItem?.categoryId) {
        const prefixo = ALTAS_CATEGORY_PREFIX[catalogItem.categoryId];
        if (prefixo) label = `${prefixo} ${label}`;
      }
      return {
        indicator: item.indicator,
        catalogItemId: item.catalogItemId,
        label,
        quantity: qty,
        pointsUnit,
        pointsTotal: Math.round(qty * pointsUnit),
        valorReais: null,
        status: "Pendente",
      };
    });

    const sale = await prisma.sale.create({
      data: {
        colaboradorId: user.sub,
        clienteNome,
        clienteCnpj,
        ...(createdAt ? { createdAt } : {}),
        items: { create: itemsData },
      },
    });

    res.status(201).json({ id: sale.id });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao registrar venda." });
  }
});

// Cada PRODUTO da venda tem seu próprio status/ativação — dois itens da
// mesma venda costumam ativar em datas diferentes. O status é texto livre
// digitado pelo colaborador (ex: "Aguardando instalação dia 15"...).
salesRouter.patch("/:saleId/items/:itemId/status", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const novoStatus = String(req.body?.status ?? "").trim();
    if (!novoStatus) throw new Error("Informe o status do produto.");
    if (novoStatus.length > 160) throw new Error("Status muito longo (máx. 160 caracteres).");

    const item = await prisma.saleItem.findUnique({
      where: { id: req.params.itemId as string },
      include: { sale: true },
    });
    if (!item || item.saleId !== req.params.saleId || item.sale.colaboradorId !== user.sub) {
      throw new Error("Item não encontrado.");
    }
    if (item.sale.cancelado) throw new Error("Venda cancelada não pode ser alterada.");

    await prisma.$transaction([
      prisma.saleItem.update({
        where: { id: item.id },
        data: { status: novoStatus },
      }),
      prisma.saleItemStatusHistory.create({
        data: {
          saleItemId: item.id,
          statusAnterior: item.status,
          statusNovo: novoStatus,
          alteradoPorId: user.sub,
        },
      }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao atualizar produto." });
  }
});

salesRouter.patch("/:saleId/items/:itemId/ativo", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const ativo = Boolean(req.body?.ativo);

    const item = await prisma.saleItem.findUnique({
      where: { id: req.params.itemId as string },
      include: { sale: true },
    });
    if (!item || item.saleId !== req.params.saleId || item.sale.colaboradorId !== user.sub) {
      throw new Error("Item não encontrado.");
    }
    if (item.sale.cancelado) throw new Error("Venda cancelada não pode ser ativada.");

    // Por padrão a data de ativação é "agora", mas o colaborador pode
    // informar o dia real em que o produto foi ativado (ex.: ativação
    // retroativa) — mesma ideia da data da venda em "Nova venda".
    let dataAtivacao: Date | null = ativo ? new Date() : null;
    if (ativo && typeof req.body?.dataAtivacao === "string" && req.body.dataAtivacao) {
      const parsed = new Date(req.body.dataAtivacao);
      if (Number.isNaN(parsed.getTime())) throw new Error("Data de ativação inválida.");
      dataAtivacao = parsed;
    }

    await prisma.saleItem.update({
      where: { id: item.id },
      data: { ativo, dataAtivacao },
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao atualizar produto." });
  }
});

// Corrige a quantidade (ou, no caso de Aparelhos, o valor em R$) de um
// produto que já está na venda — cobre o caso de "digitei errado". Só
// mexe em itens que ainda não foram marcados como ativos, pra não alterar
// silenciosamente um produto que já está contando oficialmente pra faixa.
salesRouter.patch("/:saleId/items/:itemId/quantidade", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const novaQuantidade = Number(req.body?.quantity);
    if (!novaQuantidade || novaQuantidade <= 0) throw new Error("Quantidade inválida.");

    const item = await prisma.saleItem.findUnique({
      where: { id: req.params.itemId as string },
      include: { sale: true },
    });
    if (!item || item.saleId !== req.params.saleId || item.sale.colaboradorId !== user.sub) {
      throw new Error("Item não encontrado.");
    }
    if (item.sale.cancelado) throw new Error("Venda cancelada não pode ser alterada.");
    if (item.ativo) throw new Error("Este produto já está ativo e não pode mais ser editado.");

    const data =
      item.indicator === "APARELHOS"
        ? { valorReais: novaQuantidade }
        : { quantity: novaQuantidade, pointsTotal: Math.round(novaQuantidade * item.pointsUnit) };

    await prisma.saleItem.update({ where: { id: item.id }, data });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao atualizar quantidade." });
  }
});

// Remove um único produto da venda (ex.: foi adicionado por engano) —
// mesma trava de segurança: não deixa remover um item já ativo.
salesRouter.delete("/:saleId/items/:itemId", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const item = await prisma.saleItem.findUnique({
      where: { id: req.params.itemId as string },
      include: { sale: true },
    });
    if (!item || item.saleId !== req.params.saleId || item.sale.colaboradorId !== user.sub) {
      throw new Error("Item não encontrado.");
    }
    if (item.sale.cancelado) throw new Error("Venda cancelada não pode ser alterada.");
    if (item.ativo) throw new Error("Este produto já está ativo e não pode mais ser removido.");

    const totalItens = await prisma.saleItem.count({ where: { saleId: item.saleId } });
    if (totalItens <= 1) throw new Error("A venda precisa ter ao menos um produto — exclua a venda inteira em vez disso.");

    await prisma.saleItem.delete({ where: { id: item.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao remover produto." });
  }
});

// Adiciona um ou mais produtos novos a uma venda (cliente) já existente —
// pra não precisar recriar tudo do zero quando esquece de incluir um item.
salesRouter.post("/:saleId/items", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const input = req.body as { items: CartItemInput[] };
    if (!input.items?.length) throw new Error("Adicione ao menos um item.");

    const sale = await prisma.sale.findUnique({ where: { id: req.params.saleId as string } });
    if (!sale || sale.colaboradorId !== user.sub) throw new Error("Venda não encontrada.");
    if (sale.cancelado) throw new Error("Venda cancelada não pode ser alterada.");

    const catalogIds = input.items.map((i) => i.catalogItemId).filter((v): v is string => !!v);
    const catalogItems = catalogIds.length
      ? await prisma.catalogItem.findMany({ where: { id: { in: catalogIds } } })
      : [];
    const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));

    const itemsData = input.items.map((item) => {
      if (item.indicator === "APARELHOS") {
        const valor = Number(item.quantity) || 0;
        if (valor <= 0) throw new Error("Informe um valor válido para o aparelho.");
        const nomeAparelho = (item.label || "").trim();
        if (!nomeAparelho) throw new Error("Informe o aparelho vendido.");
        return {
          saleId: sale.id,
          indicator: "APARELHOS",
          label: nomeAparelho,
          quantity: 1,
          pointsUnit: 0,
          pointsTotal: 0,
          valorReais: valor,
          observacao: item.observacao?.trim() || null,
          status: "Pendente",
        };
      }
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) throw new Error(`Quantidade inválida para ${item.label}.`);
      const catalogItem = item.catalogItemId ? catalogMap.get(item.catalogItemId) : undefined;
      const pointsUnit = catalogItem ? catalogItem.points : 0;
      let label = catalogItem ? catalogItem.label : item.label;
      if (item.indicator === "ALTAS" && catalogItem?.categoryId) {
        const prefixo = ALTAS_CATEGORY_PREFIX[catalogItem.categoryId];
        if (prefixo) label = `${prefixo} ${label}`;
      }
      return {
        saleId: sale.id,
        indicator: item.indicator,
        catalogItemId: item.catalogItemId,
        label,
        quantity: qty,
        pointsUnit,
        pointsTotal: Math.round(qty * pointsUnit),
        valorReais: null,
        status: "Pendente",
      };
    });

    await prisma.$transaction(itemsData.map((data) => prisma.saleItem.create({ data })));

    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao adicionar produto." });
  }
});

// Cancelar/reabrir uma venda inteira — os pontos param de contar (via
// aggregate.ts: cancelado=false na soma) independentemente do status ou
// ativação de cada produto. Cancelar desativa todos os itens da venda.
salesRouter.patch("/:id/cancelado", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const cancelado = Boolean(req.body?.cancelado);

    const sale = await prisma.sale.findUnique({ where: { id: (req.params.id as string) } });
    if (!sale || sale.colaboradorId !== user.sub) throw new Error("Venda não encontrada.");

    await prisma.$transaction([
      prisma.sale.update({
        where: { id: (req.params.id as string) },
        data: { cancelado },
      }),
      ...(cancelado
        ? [
            prisma.saleItem.updateMany({
              where: { saleId: req.params.id as string },
              data: { ativo: false, dataAtivacao: null },
            }),
          ]
        : []),
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao atualizar venda." });
  }
});

// Decisão de projeto: só é permitido excluir vendas em que nenhum produto
// já saiu do estado inicial (nenhum item ativo e todos com status
// "Pendente" — o texto padrão de criação), e que não estejam canceladas.
salesRouter.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const sale = await prisma.sale.findUnique({
      where: { id: (req.params.id as string) },
      include: { items: true },
    });
    if (!sale || sale.colaboradorId !== user.sub) throw new Error("Venda não encontrada.");
    const algumProgresso = sale.items.some((i) => i.ativo || i.status.trim().toLowerCase() !== "pendente");
    if (sale.cancelado || algumProgresso) {
      throw new Error("Só é possível excluir vendas em que nenhum produto ainda saiu do estado pendente.");
    }

    await prisma.sale.delete({ where: { id: (req.params.id as string) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao excluir venda." });
  }
});
