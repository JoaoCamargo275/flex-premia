import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../auth/jwt";
import { requireAuth, type AuthedRequest } from "../auth/middleware";
import type { Role } from "../lib/types";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    res.status(400).json({ error: "Informe e-mail e senha." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    res.status(401).json({ error: "E-mail ou senha inválidos." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "E-mail ou senha inválidos." });
    return;
  }

  const token = signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    teamId: user.teamId,
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

// Não há envio de e-mail configurado no sistema — o "esqueci minha senha"
// só registra o pedido pra que o Supervisor/Master vejam no painel deles e
// resetem a senha manualmente, passando a nova senha temporária por fora.
// Resposta é sempre genérica (não revela se o e-mail existe ou não).
authRouter.post("/solicitar-reset-senha", async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.active) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetRequested: true, passwordResetRequestedAt: new Date() },
      });
    }
  }

  res.json({
    ok: true,
    message:
      "Se esse e-mail estiver cadastrado, seu Supervisor (ou o Master, se você for Supervisor) foi avisado e vai te passar uma nova senha em breve.",
  });
});
