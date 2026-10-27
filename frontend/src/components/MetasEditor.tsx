import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { DateCalendarPicker } from "./PeriodFilterForm";
import {
  FRENTE_META_LABEL,
  FRENTE_META_EMOJI,
  isValorFrenteMeta,
  type FrenteMeta,
  type MetaValores,
  type MetasPorFrente,
} from "../lib/metas-types";

type MetasForm = Partial<Record<FrenteMeta, { metaDiaria: string; metaSemanal: string; metaMensal: string }>>;

function metasParaForm(metas: MetasPorFrente, frentes: FrenteMeta[]): MetasForm {
  const form: MetasForm = {};
  for (const f of frentes) {
    form[f] = {
      metaDiaria: metas[f].metaDiaria ? String(metas[f].metaDiaria) : "",
      metaSemanal: metas[f].metaSemanal ? String(metas[f].metaSemanal) : "",
      metaMensal: metas[f].metaMensal ? String(metas[f].metaMensal) : "",
    };
  }
  return form;
}

function formParaValores(form: MetasForm, frentes: FrenteMeta[]): Partial<Record<FrenteMeta, MetaValores>> {
  const out: Partial<Record<FrenteMeta, MetaValores>> = {};
  for (const f of frentes) {
    const v = form[f];
    if (!v) continue;
    out[f] = {
      metaDiaria: Number(v.metaDiaria.replace(",", ".")) || 0,
      metaSemanal: Number(v.metaSemanal.replace(",", ".")) || 0,
      metaMensal: Number(v.metaMensal.replace(",", ".")) || 0,
    };
  }
  return out;
}

function CampoMeta({
  label,
  value,
  onChange,
  isValor,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isValor?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[.65rem] uppercase tracking-wide text-ink-dim">{label}</label>
      <div className="relative">
        {isValor && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-dim">R$</span>}
        <input
          className="input py-1.5 text-sm w-full"
          style={isValor ? { paddingLeft: "1.9rem" } : undefined}
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export function MetasEditor({ colaboradorId }: { colaboradorId: string }) {
  const [form, setForm] = useState<MetasForm | null>(null);
  const [frentes, setFrentes] = useState<FrenteMeta[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [vigenteDesde, setVigenteDesde] = useState("");

  useEffect(() => {
    setForm(null);
    api
      .get<{ metas: MetasPorFrente; frentesVisiveis: FrenteMeta[] }>(`/api/supervisor/colaboradores/${colaboradorId}/metas`)
      .then((d) => {
        setFrentes(d.frentesVisiveis);
        setForm(metasParaForm(d.metas, d.frentesVisiveis));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar metas."));
  }, [colaboradorId]);

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    setError(null);
    setOk(false);
    try {
      const resp = await api.put<{ metas: MetasPorFrente; frentesVisiveis: FrenteMeta[] }>(
        `/api/supervisor/colaboradores/${colaboradorId}/metas`,
        formParaValores(form, frentes)
      );
      setForm(metasParaForm(resp.metas, frentes));
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar metas.");
    } finally {
      setSalvando(false);
    }
  }

  const tituloFrentes = frentes.map((f) => FRENTE_META_LABEL[f]).join(", ");

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
        <div>
          <h2 className="text-sm font-bold">🎯 Metas{tituloFrentes ? ` — ${tituloFrentes}` : ""}</h2>
          <p className="text-xs text-ink-dim mt-1 max-w-2xl">
            Defina as metas diária, semanal (segunda a sexta) e mensal deste colaborador em cada frente. O valor fica
            valendo até você editar de novo — não precisa refazer todo mês. O colaborador acompanha o andamento na
            aba "Metas" do próprio painel dele.
          </p>
        </div>
        <DateCalendarPicker label="Aplicada a partir de" value={vigenteDesde} onChange={setVigenteDesde} />
      </div>

      {!form && !error && <p className="text-sm text-ink-dim mt-3">Carregando...</p>}
      {error && <p className="text-sm text-accent-3 mt-3">{error}</p>}
      {form && frentes.length === 0 && (
        <p className="text-sm text-ink-dim mt-3">O perfil deste colaborador ainda não tem meta configurada.</p>
      )}

      {form && frentes.length > 0 && (
        <>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {frentes.map((frente) => (
              <div key={frente} className="rounded-xl bg-white/[.02] p-3 flex flex-col gap-3">
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <span>{FRENTE_META_EMOJI[frente]}</span>
                  {FRENTE_META_LABEL[frente]}
                </h3>
                <CampoMeta
                  label="Meta diária"
                  value={form[frente]?.metaDiaria ?? ""}
                  onChange={(v) => setForm({ ...form, [frente]: { ...form[frente]!, metaDiaria: v } })}
                  isValor={isValorFrenteMeta(frente)}
                />
                <CampoMeta
                  label="Meta semanal"
                  value={form[frente]?.metaSemanal ?? ""}
                  onChange={(v) => setForm({ ...form, [frente]: { ...form[frente]!, metaSemanal: v } })}
                  isValor={isValorFrenteMeta(frente)}
                />
                <CampoMeta
                  label="Meta mensal"
                  value={form[frente]?.metaMensal ?? ""}
                  onChange={(v) => setForm({ ...form, [frente]: { ...form[frente]!, metaMensal: v } })}
                  isValor={isValorFrenteMeta(frente)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button onClick={salvar} disabled={salvando} className="btn-grad text-sm py-1.5 disabled:opacity-60">
              {salvando ? "Salvando..." : "Salvar metas"}
            </button>
            {ok && <span className="text-xs font-semibold text-good">✅ Metas salvas.</span>}
          </div>
        </>
      )}
    </div>
  );
}
