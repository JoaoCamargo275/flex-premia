import { Router } from "express";
import { getCatalogData } from "../lib/catalog";
import { requireAuth } from "../auth/middleware";

export const catalogRouter = Router();

catalogRouter.get("/", requireAuth, async (_req, res) => {
  const data = await getCatalogData();
  res.json(data);
});
