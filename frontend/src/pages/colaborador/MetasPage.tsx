import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { api } from "../../lib/api";
import { fmtBRL, fmtNum } from "../../lib/format";
import { useMonthFilter } from "../../lib/month-filter-context";
import {
  FRENTES_META,
  FRENTE_META_LABEL,
  FRENTE_META_EMOJI,
  isValorFrenteMeta,
  type FrenteMeta,
  type MetasResumo,
  type ProgressoFrente,
} from "../../lib/metas-types";

const COR_FRENTE: Record<FrenteMeta, string> = {
  mv: "#ec1a72",
  altas: "#8b3dff",
  aparelhos: "#c026d3",
};

function fmtFrente(frente: FrenteMeta, n: number): string {
  return isValorFrenteMeta(frente) ? fmtBRL(n) : `${fmtNum(n)} pts`;
}

function ProgressoLinha({ titulo, atual, meta, frente }: { titulo: string; atual: number; meta: number; frente: FrenteMeta }) {
  const temMeta = meta > 0;
  const pct = temMeta ? Math.min(100, (atual / meta) * 100) : 0;
  const bateu = temMeta && atual >= meta;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-ink-dim">{titulo}</span>
        <span className={bateu ? "text-good font-bold" : "font-semibold"}>
          {fmtFrente(frente, atual)}
          {temMeta && <span className="text-ink-dim font-normal"> de {fmtFrente(frente, meta)}</span>}
          {bateu && " ✅"}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
        {temMeta ? (
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: bateu ? "var(--good)" : "var(--grad)",
              transition: "width .5s cubic-bezier(.4,0,.2,1)",
            }}
          />
        ) : (
          <div className="h-full flex items-center px-2">
            <span className="text-[.6rem] text-ink-dim">meta não definida ainda</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CardFrente({
  frente,
  progresso,
  serie,
}: {
  frente: FrenteMeta;
  progresso: ProgressoFrente;
  serie: { dia: string; valor: number }[];
}) {
  const cor = COR_FRENTE[frente];
  const fmt = (n: number) => fmtFrente(frente, n);
  return (
    <div className="card p-4 flex flex-col gap-4" style={{ borderTop: `3px solid ${cor}` }}>
      <h3 className="text-sm font-bold flex items-center gap-2">
        <span>{FRENTE_META_EMOJI[frente]}</span>
        {FRENTE_META_LABEL[frente]}
      </h3>

      <div className="flex flex-col gap-3">
        <ProgressoLinha titulo="Hoje" atual={progresso.hoje} meta={progresso.meta.metaDiaria} frente={frente} />
        <ProgressoLinha titulo="Esta semana (seg. a sex.)" atual={progresso.semana} meta={progresso.meta.metaSemanal} frente={frente} />
        <ProgressoLinha titulo="Este mês" atual={progresso.mes} meta={progresso.meta.metaMensal} frente={frente} />
      </div>

      <div className="rounded-xl bg-white/[.02] p-3">
        <h4 className="text-[.65rem] font-bold uppercase tracking-wide text-ink-dim mb-2">Ritmo diário no mês</h4>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--ink-dim)" fontSize={10} interval="preserveStartEnd" />
              <YAxis
                stroke="var(--ink-dim)"
                fontSize={10}
                allowDecimals={false}
                width={isValorFrenteMeta(frente) ? 52 : 30}
                tickFormatter={(v: number) => (isValorFrenteMeta(frente) ? fmtBRL(v) : String(v))}
              />
              <Tooltip
                contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)" }}
                formatter={(value) => fmt(typeof value === "number" ? value : Number(value) || 0)}
              />
              {progresso.meta.metaDiaria > 0 && (
                <ReferenceLine
                  y={progresso.meta.metaDiaria}
                  stroke="var(--ink-dim)"
                  strokeDasharray="4 4"
                  label={{ value: "meta diária", position: "insideTopRight", fill: "var(--ink-dim)", fontSize: 10 }}
                />
              )}
              <Line type="monotone" dataKey="valor" name={FRENTE_META_LABEL[frente]} stroke={cor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function MetasPage() {
  const { from, to, label, isMesAtual } = useMonthFilter();
  const [resumo, setResumo] = useState<MetasResumo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResumo(null);
    api
      .get<MetasResumo>(`/api/sales/metas?from=${from}&to=${to}`)
      .then(setResumo)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar metas."));
  }, [from, to]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Metas</h1>
        <p className="text-sm text-ink-dim">
          Acompanhamento de <b>{label}</b>
          {isMesAtual && " (mês atual)"} — "Hoje" e "esta semana" são sempre em relação a agora; o mês segue o
          calendariozinho ao lado de "Colaborador", lá em cima. Metas são definidas pelo seu Supervisor.
        </p>
      </div>

      {error && <p className="text-sm text-accent-3">{error}</p>}

      {resumo && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FRENTES_META.map((frente) => (
            <CardFrente key={frente} frente={frente} progresso={resumo.frentes[frente]} serie={resumo.series[frente]} />
          ))}
        </div>
      )}
    </div>
  );
}
