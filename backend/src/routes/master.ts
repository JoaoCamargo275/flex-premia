import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/middleware";
import { getTeamOverview } from "../lib/team-overview";
import { getPainelColaborador, getProdutosPorFrente } from "../lib/aggregate";
import { parsePeriod } from "../lib/period";
import { gerarSenhaTemporaria } from "../lib/temp-password";
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
      passwordResetRequested: u.passwordResetRequested,
    })),
  });
});

// Reseta a senha de qualquer usuário (Master também pode resetar Supervisor,
// não só Colaborador) — mesmo mecanismo do Supervisor: gera uma senha
// temporária, devolve ela uma vez só, e obriga a troca no próximo login.
masterRouter.post("/usuarios/:id/resetar-senha", async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: (req.params.id as string) } });
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const novaSenha = gerarSenhaTemporaria();
    const passwordHash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true, passwordResetRequested: false, passwordResetRequestedAt: null },
    });

    res.json({ ok: true, novaSenha });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao resetar senha." });
  }
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

// Exclui um usuário (Master, Supervisor ou Colaborador) permanentemente —
// usado principalmente pra limpar contas de teste. Antes de apagar a linha,
// desfaz tudo que aponta pra esse usuário e teria uma FK obrigatória: some
// com o histórico de status que ele mudou, com as faltas ligadas a ele, some
// com o vínculo de "criado por" nos usuários que ele criou, desvincula a
// equipe da qual ele é supervisor, e apaga as vendas dele (se for
// colaborador — os itens de cada venda vão junto, por cascade do schema).
masterRouter.delete("/usuarios/:id", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id as string;
    if (id === req.user!.sub) throw new Error("Você não pode excluir a própria conta.");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("Usuário não encontrado.");

    await prisma.$transaction([
      prisma.saleItemStatusHistory.deleteMany({ where: { alteradoPorId: id } }),
      prisma.attendanceFlag.deleteMany({ where: { OR: [{ userId: id }, { setById: id }] } }),
      prisma.user.updateMany({ where: { createdById: id }, data: { createdById: null } }),
      prisma.team.updateMany({ where: { supervisorId: id }, data: { supervisorId: null } }),
      prisma.sale.deleteMany({ where: { colaboradorId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao excluir usuário." });
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

// Exclui uma equipe — os colaboradores que estavam nela não são apagados,
// só ficam sem equipe (teamId = null), pra decidir depois se realoca ou
// exclui cada um.
masterRouter.delete("/equipes/:id", async (req: AuthedRequest, res) => {
  try {
    const id = req.params.id as string;
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) throw new Error("Equipe não encontrada.");

    await prisma.$transaction([
      prisma.user.updateMany({ where: { teamId: id }, data: { teamId: null } }),
      prisma.team.delete({ where: { id } }),
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao excluir equipe." });
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
