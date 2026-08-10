import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { catalogRouter } from "./routes/catalog";
import { salesRouter } from "./routes/sales";
import { supervisorRouter } from "./routes/supervisor";
import { masterRouter } from "./routes/master";
import { exportRouter } from "./routes/export";

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "flexpremia-backend" });
});
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/sales", salesRouter);
app.use("/api/supervisor", supervisorRouter);
app.use("/api/master", masterRouter);
app.use("/api/export", exportRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`FlexPremia backend rodando em http://localhost:${PORT}`);
});
