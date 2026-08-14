import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/middleware";
import { getTeamOverview, getEvolutionSeries } from "../lib/team-overview";
import { getPainelColaborador } from "../lib/aggregate";
import { parsePeriod } from "../lib/period";
import { gerarSenhaTemporaria } from "../lib/temp-password";

export const supervisorRouter = Router();

supervisorRouter.use(requireAuth, requireRole("SUPERVISOR"));

supervisorRouter.get("/overview", async (req: AuthedRequest, res) => {
  const period = parsePeriod(req.query);
  const team = await prisma.team.findUnique({
    where: { supervisorId: req.user!.sub },
    include: { members: { where: { role: "COLABORADOR" } } },
  });
  const memberIds = team?.members.map((m) => m.id) ?? [];
  const overview = await getTeamOverview(memberIds, period);
  res.json({ team: team ? { id: team.id, name: team.name } : null, overview });
});

supervisorRouter.get("/colaboradores/:id", async (req: AuthedRequest, res) => {
  const team = await prisma.team.findUnique({ where: { supervisorId: req.user!.sub } });
  const colaborador = await prisma.user.findUnique({ where: { id: (req.params.id as string) } });

  if (!team || !colaborador || colaborador.teamId !== team.id) {
    res.status(404).json({ error: "Colaborador não encontrado." });
    return;
  }

  const period = parsePeriod(req.query);
  const periodWhere =
    period.from || period.to
      ? { createdAt: { ...(period.from ? { gte: period.from } : {}), ...(period.to ? { lte: period.to } : {}) } }
      : {};

  const [painel, sales, evolution] = await Promise.all([
    getPainelColaborador(colaborador.id, period),
    prisma.sale.findMany({
      where: { colaboradorId: colaborador.id, ...periodWhere },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getEvolutionSeries([colaborador.id], period),
  ]);

  res.json({
    colaborador: { id: colaborador.id, name: colaborador.name, email: colaborador.email },
    painel,
    sales,
    evolution,
  });
});

supervisorRouter.get("/colaboradores", async (req: AuthedRequest, res) => {
  const team = await prisma.team.findUnique({
    where: { supervisorId: req.user!.sub },
    include: { members: { where: { role: "COLABORADOR" }, orderBy: { name: "asc" } } },
  });
  res.json({
    team: team ? { id: team.id, name: team.name } : null,
    colaboradores:
      team?.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        passwordResetRequested: m.passwordResetRequested,
      })) ?? [],
  });
});

// Reseta a senha de um colaborador da própria equipe — usado quando a
// pessoa esqueceu a senha (pediu na tela de login) ou pede diretamente pro
// Supervisor. Devolve a senha temporária UMA vez, pro Supervisor repassar
// por fora (WhatsApp, presencial etc.) — ela não fica salva em texto puro.
supervisorRouter.post("/colaboradores/:id/resetar-senha", async (req: AuthedRequest, res) => {
  try {
    const team = await prisma.team.findUnique({ where: { supervisorId: req.user!.sub } });
    const colaborador = await prisma.user.findUnique({ where: { id: (req.params.id as string) } });
    if (!team || !colaborador || colaborador.teamId !== team.id) {
      res.status(404).json({ error: "Colaborador não encontrado." });
      return;
    }

    const novaSenha = gerarSenhaTemporaria();
    const passwordHash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({
      where: { id: colaborador.id },
      data: { passwordHash, mustChangePassword: true, passwordResetRequested: false, passwordResetRequestedAt: null },
    });

    res.json({ ok: true, novaSenha });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao resetar senha." });
  }
});

supervisorRouter.post("/colaboradores", async (req: AuthedRequest, res) => {
  try {
    const supervisor = req.user!;
    const { name, email: rawEmail, password } = req.body as { name: string; email: string; password: string };

    const team = await prisma.team.findUnique({ where: { supervisorId: supervisor.sub } });
    if (!team) throw new Error("Sua equipe ainda não foi configurada. Peça a um Master para criá-la.");
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
        role: "COLABORADOR",
        teamId: team.id,
        createdById: supervisor.sub,
        mustChangePassword: true,
      },
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Erro ao criar colaborador." });
  }
});
