import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { fmtBRL, fmtNum } from "../../lib/format";
import { INDICATOR_LABELS } from "../../lib/types";
import { SaleActions } from "./SaleActions";

interface SaleItem {
  id: string;
  indicator: string;
  label: string;
  quantity: number;
  pointsTotal: number;
  valorReais: number | null;
  observacao: string | null;
}
interface Sale {
  id: string;
  clienteNome: string;
  clienteCnpj: string;
  status: string;
  ativo: boolean;
  cancelado: boolean;
  createdAt: string;
  items: SaleItem[];
}

function maskCnpjDisplay(digits: string) {
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export default function MinhasVendasPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<Sale[]>("/api/sales")
      .then(setSales)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar vendas."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtradas = useMemo(() => {
    if (!sales) return null;
    const q = busca.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) => s.clienteNome.toLowerCase().includes(q) || s.clienteCnpj.includes(q.replace(/\D/g, "") || q)
    );
  }, [sales, busca]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Minhas vendas</h1>
        <p className="text-sm text-ink-dim">
          Acompanhe o status de cada venda e marque como <b>Ativo</b> quando ela for efetivamente
          ativada — só assim ela conta pontos para sua faixa e premiação.
        </p>
      </div>

      {sales && sales.length > 0 && (
        <input
          className="input max-w-sm"
          placeholder="Buscar por cliente ou CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      )}

      {error && <p className="text-sm text-accent-3">{error}</p>}

      <div className="card overflow-hidden">
        {filtradas?.length === 0 && (
          <p className="text-sm text-ink-dim p-4">
            {sales?.length === 0 ? "Nenhuma venda registrada ainda." : "Nenhuma venda encontrada para essa busca."}
          </p>
        )}

        {filtradas?.map((sale, idx) => {
          const pontosTotal = sale.items.reduce((acc, i) => acc + i.pointsTotal, 0);
          const valorAparelhos = sale.items.reduce((acc, i) => acc + (i.valorReais ?? 0), 0);
          const expanded = expandedId === sale.id;
          const podeExcluir = !sale.ativo && !sale.cancelado && sale.status.trim().toLowerCase() === "pendente";

          return (
            <div key={sale.id} className={idx > 0 ? "border-t border-white/5" : undefined}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : sale.id)}
                className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-white/[.03] transition"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: sale.cancelado ? "var(--accent-3)" : sale.ativo ? "var(--good, #22c55e)" : "var(--ink-dim)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{sale.clienteNome}</div>
                  <div className="text-xs text-ink-dim truncate">
                    CNPJ {maskCnpjDisplay(sale.clienteCnpj)} · {new Date(sale.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="text-xs text-ink-dim hidden sm:block max-w-[200px] truncate">{sale.status}</div>
                <div className="text-right shrink-0">
                  {pontosTotal > 0 && <div className="font-bold text-accent-2 text-sm">{fmtNum(pontosTotal)} pts</div>}
                  {valorAparelhos > 0 && <div className="font-bold text-accent-2 text-sm">{fmtBRL(valorAparelhos)}</div>}
                </div>
                <span
                  className="text-[.65rem] font-bold px-2 py-1 rounded-full shrink-0"
                  style={
                    sale.cancelado
                      ? { background: "rgba(255,77,109,.14)", color: "var(--accent-3)" }
                      : sale.ativo
                      ? { background: "rgba(34,197,94,.14)", color: "var(--good, #22c55e)" }
                      : { background: "rgba(255,255,255,.06)", color: "var(--ink-dim)" }
                  }
                >
                  {sale.cancelado ? "Cancelada" : sale.ativo ? "Ativo" : "Pendente"}
                </span>
                <span className="text-ink-dim shrink-0">{expanded ? "▲" : "▼"}</span>
              </button>

              {expanded && (
                <div className="px-4 pb-4 flex flex-col gap-3">
                  <ul className="text-sm text-ink-dim flex flex-col gap-0.5">
                    {sale.items.map((item) => (
                      <li key={item.id}>
                        {INDICATOR_LABELS[item.indicator as keyof typeof INDICATOR_LABELS] ?? item.indicator} —{" "}
                        {item.label}
                        {item.indicator === "APARELHOS"
                          ? ` · ${fmtBRL(item.valorReais ?? 0)}`
                          : ` x${item.quantity} · ${item.pointsTotal} pts`}
                        {item.observacao && <span className="italic"> — "{item.observacao}"</span>}
                      </li>
                    ))}
                  </ul>

                  <SaleActions
                    saleId={sale.id}
                    status={sale.status}
                    ativo={sale.ativo}
                    cancelado={sale.cancelado}
                    podeExcluir={podeExcluir}
                    onChanged={load}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
