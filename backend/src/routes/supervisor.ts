import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/middleware";
import { getTeamOverview } from "../lib/team-overview";
import { getPainelColaborador, getProdutosPorFrente } from "../lib/aggregate";
import { parsePeriod } from "../lib/period";

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
    colaborador: { id: colaborador.id, name: colaborador.name, email: colaborador.email },
    painel,
    produtos,
    sales,
  });
});

supervisorRouter.get("/colaboradores", async (req: AuthedRequest, res) => {
  const team = await prisma.team.findUnique({
    where: { supervisorId: req.user!.sub },
    include: { members: { where: { role: "COLABORADOR" }, orderBy: { name: "asc" } } },
  });
  res.json({
    team: team ? { id: team.id, name: team.name } : null,
    colaboradores: team?.members.map((m) => ({ id: m.id, name: m.name, email: m.email })) ?? [],
  });
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
