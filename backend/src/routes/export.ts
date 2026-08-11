import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/middleware";
import { parsePeriod } from "../lib/period";
import { INDICATOR_LABELS } from "../lib/types";

export const exportRouter = Router();

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

exportRouter.get("/team-csv", requireAuth, requireRole("SUPERVISOR", "MASTER"), async (req: AuthedRequest, res) => {
  const period = parsePeriod(req.query);
  const teamIdParam = typeof req.query.teamId === "string" ? req.query.teamId : undefined;

  let memberIds: string[] = [];

  if (req.user!.role === "SUPERVISOR") {
    const team = await prisma.team.findUnique({
      where: { supervisorId: req.user!.sub },
      include: { members: { where: { role: "COLABORADOR" } } },
    });
    memberIds = team?.members.map((m) => m.id) ?? [];
  } else {
    const users = await prisma.user.findMany({
      where: { role: "COLABORADOR", ...(teamIdParam ? { teamId: teamIdParam } : {}) },
    });
    memberIds = users.map((u) => u.id);
  }

  const sales = await prisma.sale.findMany({
    where: {
      colaboradorId: { in: memberIds },
      ...(period.from || period.to
        ? { createdAt: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) } }
        : {}),
    },
    include: { items: true, colaborador: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Colaborador",
    "Cliente",
    "CNPJ",
    "Data",
    "Status do item",
    "Item ativo",
    "Venda cancelada",
    "Data de ativação do item",
    "Indicador",
    "Item",
    "Observação do item",
    "Quantidade",
    "Pontos",
    "Valor (R$)",
  ];

  const rows: string[] = [header.join(";")];
  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push(
        [
          sale.colaborador.name,
          sale.clienteNome,
          sale.clienteCnpj,
          sale.createdAt.toISOString(),
          item.status,
          item.ativo ? "Sim" : "Não",
          sale.cancelado ? "Sim" : "Não",
          item.dataAtivacao ? item.dataAtivacao.toISOString() : "",
          INDICATOR_LABELS[item.indicator as keyof typeof INDICATOR_LABELS] ?? item.indicator,
          item.label,
          item.observacao ?? "",
          String(item.quantity),
          String(item.pointsTotal),
          item.valorReais != null ? String(item.valorReais) : "",
        ]
          .map((v) => csvEscape(String(v)))
          .join(";")
      );
    }
  }

  const csv = "﻿" + rows.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="vendas-flexpremia.csv"');
  res.send(csv);
});
