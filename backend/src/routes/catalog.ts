import { Router } from "express";
import { getCatalogData } from "../lib/catalog";
import { getFaixaTables } from "../lib/aggregate";
import { requireAuth } from "../auth/middleware";

export const catalogRouter = Router();

catalogRouter.get("/", requireAuth, async (_req, res) => {
  const data = await getCatalogData();
  res.json(data);
});

// Tabelas de faixas (pontos necessários por faixa) — usadas no "Meu painel"
// do colaborador para explicar como a pontuação vira faixa/premiação.
catalogRouter.get("/faixas", requireAuth, async (_req, res) => {
  const data = await getFaixaTables();
  res.json(data);
});
