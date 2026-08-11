import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/middleware";
import { getTeamOverview } from "../lib/team-overview";
import { getPainelColaborador, getProdutosPorFrente } from "../lib/aggregate";
import { parsePeriod } from "../lib/period";
import type { Role } from "../lib/types";

export const masterRouter = Router();

masterRouter.use(requireAuth, requireRole("MASTER"));

masterRouter.get("/overview", async (req: AuthedRequest, res) => {
  const period = parsePeriod(req.query);
  const teamId = typeof req.query.teamId === "string" ? req.query.teamId : undefined;

  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
  const colaboradores = await prisma.user.findMany({
    where: { role: "COLABORADOR", ...(teamId ? { teamId } : {}) },
  });
  const memberIds = colaboradores.map((c) => c.id);
  const overview = await getTeamOverview(memberIds, period);

  res.json({ teams: teams.map((t) => ({ id: t.id, name: t.name })), overview });
});

masterRouter.get("/colaboradores/:id", async (req: AuthedRequest, res) => {
  const colaborador = await prisma.user.findUnique({ where: { id: (req.params.id as string) }, include: { team: true } });
  if (!colaborador || colaborador.role !== "COLABORADOR") {
    res.status(404).json({ error: "Colaborador não encontrado." });
    return;
  }

  const [painel, produtos] = await Promise.all([
    getPainelColaborador(colaborador.id),
    getProdutosPorFrente(colaborador.id),
  ]);
  const sales = await prisma.sale.findMany({
    where: { colaboradorId: colaborador.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json({
    colaborador: {
      id: colaborador.id,
      name: colaborador.name,
      email: colaborador.email,
      teamName: colaborador.team?.name ?? null,
    },
    painel,
    produtos,
    sales,
  });
});

masterRouter.get("/usuarios", async (_req, res) => {
  const [teams, users] = await Promise.all([
    prisma.team.findMany({ include: { supervisor: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ include: { team: true }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
  ]);

  res.json({
    teams: teams.map((t) => ({ id: t.id, name: t.name, supervisorId: t.supervisorId, supervisorName: t.supervisor?.name ?? null })),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      teamId: u.teamId,
      teamName: u.team?.name ?? null,
    })),
  });
});

masterRouter.post("/usuarios", async (req: AuthedRequest, res) => {
  try {
    const master = req.user!;
    const { name, email: rawEmail, password, role, teamId } = req.body as {
      name: string;
      email: string;
      password: string;
      role: Role;
      teamId?: string | null;
    };

    if (!password || password.length < 8) throw new Error("A senha deve ter ao menos 8 caracteres.");
    const email = rawEmail.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Já existe um usuário com este e-mail.");

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        passwordHash,
        role,
        teamId: role === "COLABORADOR" ? teamId ?? null : null,
        createdById: master.sub,
        mustChangePassword: true,
      },
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao criar usuário." });
  }
});

masterRouter.patch("/usuarios/:id", async (req: AuthedRequest, res) => {
  try {
    const { active, teamId } = req.body as { active?: boolean; teamId?: string | null };
    const data: { active?: boolean; teamId?: string | null } = {};
    if (typeof active === "boolean") data.active = active;
    if (teamId !== undefined) {
      const user = await prisma.user.findUnique({ where: { id: (req.params.id as string) } });
      if (!user || user.role !== "COLABORADOR") throw new Error("Só é possível mover colaboradores entre equipes.");
      data.teamId = teamId;
    }
    await prisma.user.update({ where: { id: (req.params.id as string) }, data });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao atualizar usuário." });
  }
});

masterRouter.post("/equipes", async (req: AuthedRequest, res) => {
  try {
    const { name, supervisorId } = req.body as { name: string; supervisorId?: string | null };
    await prisma.team.create({ data: { name: name.trim(), supervisorId: supervisorId || null } });
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao criar equipe." });
  }
});

masterRouter.post("/atestados", async (req: AuthedRequest, res) => {
  try {
    const master = req.user!;
    const { userId, yearMonth, faltouInjustificada } = req.body as {
      userId: string;
      yearMonth: string;
      faltouInjustificada: boolean;
    };
    await prisma.attendanceFlag.upsert({
      where: { userId_yearMonth: { userId, yearMonth } },
      update: { faltouInjustificada, setById: master.sub },
      create: { userId, yearMonth, faltouInjustificada, setById: master.sub },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao registrar falta." });
  }
});
