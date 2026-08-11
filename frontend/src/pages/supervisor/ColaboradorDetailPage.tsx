import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { INDICATOR_LABELS } from "../../lib/types";
import { fmtBRL, fmtNum } from "../../lib/format";
import type { PainelColaborador } from "../../lib/premiacao-types";

interface SaleItem {
  id: string;
  indicator: string;
  label: string;
  quantity: number;
  pointsTotal: number;
  valorReais: number | null;
  status: string;
  ativo: boolean;
}
interface Sale {
  id: string;
  clienteNome: string;
  clienteCnpj: string;
  cancelado: boolean;
  createdAt: string;
  items: SaleItem[];
}
interface DetailResponse {
  colaborador: { id: string; name: string; email: string };
  painel: PainelColaborador;
  sales: Sale[];
}

function maskCnpjDisplay(digits: string) {
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

// Cada frente tem sua própria régua de faixas, então somar os pontos das 3
// frentes de pontuação não faz sentido — mostramos lançado/ativado separado
// por frente (Aparelhos é por valor em R$, não pontos).
function FrenteCard({
  icon,
  label,
  lancado,
  ativado,
  isValor,
}: {
  icon: string;
  label: string;
  lancado: number;
  ativado: number;
  isValor?: boolean;
}) {
  const fmt = isValor ? fmtBRL : (n: number) => `${fmtNum(n)} pts`;
  return (
    <div className="card p-4">
      <div className="text-[.65rem] uppercase tracking-wide text-ink-dim mb-1">
        {icon} {label}
      </div>
      <div className="text-xl font-extrabold text-good">{fmt(ativado)}</div>
      <div className="text-xs text-ink-dim mt-0.5">de {fmt(lancado)} lançado</div>
    </div>
  );
}

export default function SupervisorColaboradorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<DetailResponse>(`/api/supervisor/colaboradores/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar colaborador."));
  }, [id]);

  const vendasFiltradas = useMemo(() => {
    if (!data) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return data.sales;
    return data.sales.filter(
      (s) => s.clienteNome.toLowerCase().includes(q) || s.clienteCnpj.includes(q.replace(/\D/g, "") || q)
    );
  }, [data, busca]);

  if (error) return <p className="text-sm text-accent-3">{error}</p>;
  if (!data) return null;

  const { painel } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/supervisor"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent-2 hover:text-accent mb-2"
        >
          ← Voltar para visão geral da equipe
        </Link>
        <h1 className="text-xl font-bold">{data.colaborador.name}</h1>
        <p className="text-sm text-ink-dim">{data.colaborador.email} · somente leitura</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FrenteCard icon="📱" label="RENOV. MV" lancado={painel.lancado.ptsMV} ativado={painel.ativado.ptsMV} />
        <FrenteCard icon="🔄" label="RENOV. FB/AVA" lancado={painel.lancado.ptsFBAVA} ativado={painel.ativado.ptsFBAVA} />
        <FrenteCard icon="🚀" label="ALTAS" lancado={painel.lancado.ptsAltas} ativado={painel.ativado.ptsAltas} />
        <FrenteCard
          icon="💰"
          label="Aparelhos"
          lancado={painel.lancado.valorAparelhos}
          ativado={painel.ativado.valorAparelhos}
          isValor
        />
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-bold">Clientes e produtos vendidos</h2>
          {data.sales.length > 0 && (
            <input
              className="input py-1.5 text-sm max-w-xs"
              placeholder="Buscar por cliente ou CNPJ..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          )}
        </div>

        <div className="flex flex-col">
          {vendasFiltradas.map((sale, idx) => {
            const itensAtivos = sale.items.filter((i) => i.ativo).length;
            const expanded = expandedId === sale.id;
            return (
              <div key={sale.id} className={idx > 0 ? "border-t border-white/5" : undefined}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(expanded ? null : sale.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setExpandedId(expanded ? null : sale.id);
                  }}
                  className="w-full flex flex-wrap items-center gap-3 py-3 text-left hover:bg-white/[.03] transition cursor-pointer"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: sale.cancelado
                        ? "var(--accent-3)"
                        : itensAtivos > 0
                        ? "var(--good, #22c55e)"
                        : "var(--ink-dim)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{sale.clienteNome}</div>
                    <div className="text-xs text-ink-dim truncate">
                      CNPJ {maskCnpjDisplay(sale.clienteCnpj)} · {new Date(sale.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                      {sale.items.length} {sale.items.length === 1 ? "produto" : "produtos"}
                    </div>
                  </div>
                  <span
                    className="text-[.65rem] font-bold px-2 py-1 rounded-full shrink-0"
                    style={
                      sale.cancelado
                        ? { background: "rgba(255,77,109,.14)", color: "var(--accent-3)" }
                        : itensAtivos === sale.items.length
                        ? { background: "rgba(34,197,94,.14)", color: "var(--good, #22c55e)" }
                        : itensAtivos > 0
                        ? { background: "rgba(236,26,114,.14)", color: "var(--accent)" }
                        : { background: "rgba(255,255,255,.06)", color: "var(--ink-dim)" }
                    }
                  >
                    {sale.cancelado
                      ? "Cancelada"
                      : itensAtivos === sale.items.length
                      ? "Todos ativos"
                      : itensAtivos > 0
                      ? `${itensAtivos}/${sale.items.length} ativos`
                      : "Pendente"}
                  </span>
                  <span className="text-ink-dim shrink-0">{expanded ? "▲" : "▼"}</span>
                </div>

                {expanded && (
                  <ul className="text-xs text-ink-dim flex flex-col gap-1 pb-3">
                    {sale.items.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[.02] px-2.5 py-1.5">
                        <span>
                          <span className="font-semibold text-ink">
                            {INDICATOR_LABELS[i.indicator as keyof typeof INDICATOR_LABELS] ?? i.indicator}
                          </span>{" "}
                          — {i.label}
                          {i.indicator === "APARELHOS"
                            ? ` · ${fmtBRL(i.valorReais ?? 0)}`
                            : ` x${fmtNum(i.quantity)} · ${i.pointsTotal} pts`}
                        </span>
                        <span className={i.ativo ? "text-good font-semibold shrink-0" : "shrink-0"}>
                          {i.ativo ? "Ativo" : i.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {data.sales.length === 0 && <p className="text-sm text-ink-dim py-2">Nenhuma venda registrada.</p>}
          {data.sales.length > 0 && vendasFiltradas.length === 0 && (
            <p className="text-sm text-ink-dim py-2">Nenhum cliente encontrado para essa busca.</p>
          )}
        </div>
      </div>
    </div>
  );
}
