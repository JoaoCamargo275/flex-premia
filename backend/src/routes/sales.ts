import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/middleware";
import { isValidCnpj, onlyDigits } from "../lib/cnpj";
import { SALE_STATUSES, type Indicator, type SaleStatus } from "../lib/types";
import { getPainelColaborador } from "../lib/aggregate";

export const salesRouter = Router();

salesRouter.use(requireAuth, requireRole("COLABORADOR"));

interface CartItemInput {
  catalogItemId?: string;
  indicator: Indicator;
  label: string;
  quantity: number;
}

salesRouter.get("/painel", async (req: AuthedRequest, res) => {
  const painel = await getPainelColaborador(req.user!.sub);
  res.json(painel);
});

salesRouter.get("/", async (req: AuthedRequest, res) => {
  const sales = await prisma.sale.findMany({
    where: { colaboradorId: req.user!.sub },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
});

salesRouter.post("/", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const input = req.body as { clienteNome: string; clienteCnpj: string; observacao?: string; items: CartItemInput[] };

    const clienteNome = (input.clienteNome || "").trim();
    const clienteCnpj = onlyDigits(input.clienteCnpj || "");

    if (!clienteNome) throw new Error("Informe o nome do cliente.");
    if (!isValidCnpj(clienteCnpj)) throw new Error("CNPJ inválido.");
    if (!input.items?.length) throw new Error("Adicione ao menos um item na venda.");

    const catalogIds = input.items.map((i) => i.catalogItemId).filter((v): v is string => !!v);
    const catalogItems = catalogIds.length
      ? await prisma.catalogItem.findMany({ where: { id: { in: catalogIds } } })
      : [];
    const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));

    const itemsData = input.items.map((item) => {
      if (item.indicator === "APARELHOS") {
        const valor = Number(item.quantity) || 0;
        if (valor <= 0) throw new Error("Informe um valor válido para Aparelhos.");
        return {
          indicator: "APARELHOS",
          label: "Valor vendido em aparelhos",
          quantity: 1,
          pointsUnit: 0,
          pointsTotal: 0,
          valorReais: valor,
        };
      }
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) throw new Error(`Quantidade inválida para ${item.label}.`);
      const catalogItem = item.catalogItemId ? catalogMap.get(item.catalogItemId) : undefined;
      const pointsUnit = catalogItem ? catalogItem.points : 0;
      return {
        indicator: item.indicator,
        catalogItemId: item.catalogItemId,
        label: catalogItem ? catalogItem.label : item.label,
        quantity: qty,
        pointsUnit,
        pointsTotal: Math.round(qty * pointsUnit),
        valorReais: null,
      };
    });

    const sale = await prisma.sale.create({
      data: {
        colaboradorId: user.sub,
        clienteNome,
        clienteCnpj,
        status: "PENDENTE",
        items: { create: itemsData },
        statusHistory: {
          create: { statusAnterior: null, statusNovo: "PENDENTE", alteradoPorId: user.sub },
        },
      },
    });

    res.status(201).json({ id: sale.id });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao registrar venda." });
  }
});

salesRouter.patch("/:id/status", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const novoStatus = req.body?.status as SaleStatus;
    if (!SALE_STATUSES.includes(novoStatus)) throw new Error("Status inválido.");

    const sale = await prisma.sale.findUnique({ where: { id: (req.params.id as string) } });
    if (!sale || sale.colaboradorId !== user.sub) throw new Error("Venda não encontrada.");

    await prisma.$transaction([
      prisma.sale.update({
        where: { id: (req.params.id as string) },
        data: {
          status: novoStatus,
          ...(novoStatus !== "ATIVADA" ? { ativo: false, dataAtivacao: null } : {}),
        },
      }),
      prisma.saleStatusHistory.create({
        data: {
          saleId: (req.params.id as string),
          statusAnterior: sale.status,
          statusNovo: novoStatus,
          alteradoPorId: user.sub,
        },
      }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao atualizar venda." });
  }
});

salesRouter.patch("/:id/ativo", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const ativo = Boolean(req.body?.ativo);

    const sale = await prisma.sale.findUnique({ where: { id: (req.params.id as string) } });
    if (!sale || sale.colaboradorId !== user.sub) throw new Error("Venda não encontrada.");
    if (sale.status === "CANCELADA") throw new Error("Venda cancelada não pode ser ativada.");

    const novoStatus = ativo ? "ATIVADA" : sale.status === "ATIVADA" ? "EM_ANDAMENTO" : sale.status;

    await prisma.$transaction([
      prisma.sale.update({
        where: { id: (req.params.id as string) },
        data: { ativo, dataAtivacao: ativo ? new Date() : null, status: novoStatus },
      }),
      prisma.saleStatusHistory.create({
        data: { saleId: (req.params.id as string), statusAnterior: sale.status, statusNovo: novoStatus, alteradoPorId: user.sub },
      }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao atualizar venda." });
  }
});

// Decisão de projeto: só é permitido excluir vendas ainda PENDENTES.
salesRouter.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    const user = req.user!;
    const sale = await prisma.sale.findUnique({ where: { id: (req.params.id as string) } });
    if (!sale || sale.colaboradorId !== user.sub) throw new Error("Venda não encontrada.");
    if (sale.status !== "PENDENTE") throw new Error("Só é possível excluir vendas ainda pendentes.");

    await prisma.sale.delete({ where: { id: (req.params.id as string) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao excluir venda." });
  }
});
