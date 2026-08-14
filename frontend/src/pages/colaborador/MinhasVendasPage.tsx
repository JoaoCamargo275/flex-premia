import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { api } from "../../lib/api";
import { fmtBRL, fmtNum } from "../../lib/format";
import { INDICATOR_LABELS } from "../../lib/types";
import { useMonthFilter } from "../../lib/month-filter-context";
import { SaleItemActions, SaleFooterActions, EditQuantityInline, RemoveItemButton, AddProductForm } from "./SaleActions";

interface SaleItem {
  id: string;
  indicator: string;
  label: string;
  quantity: number;
  pointsTotal: number;
  valorReais: number | null;
  observacao: string | null;
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

function maskCnpjDisplay(digits: string) {
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

export default function MinhasVendasPage() {
  const { from, to, label, isMesAtual } = useMonthFilter();
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copiarCnpj(e: MouseEvent, sale: Sale) {
    e.stopPropagation();
    const texto = maskCnpjDisplay(sale.clienteCnpj);
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiedId(sale.id);
        setTimeout(() => setCopiedId((cur) => (cur === sale.id ? null : cur)), 1500);
      })
      .catch(() => setError("Não foi possível copiar o CNPJ."));
  }

  const load = useCallback(() => {
    api
      .get<Sale[]>(`/api/sales?from=${from}&to=${to}`)
      .then(setSales)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar vendas."));
  }, [from, to]);

  useEffect(() => {
    setSales(null);
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
          Exibindo vendas de <b>{label}</b>
          {isMesAtual && " (mês atual)"} — use o calendariozinho ao lado de "Colaborador", lá em cima, para ver
          outros meses. Cada produto tem seu próprio status e flag de <b>Ativo</b> — marque um produto como
          ativo assim que ele for efetivamente ativado, só assim ele conta pontos para sua faixa e premiação.
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
          const itensAtivos = sale.items.filter((i) => i.ativo).length;
          const todosAtivos = itensAtivos > 0 && itensAtivos === sale.items.length;
          const algumAtivo = itensAtivos > 0;
          const podeExcluir =
            !sale.cancelado && sale.items.every((i) => !i.ativo && i.status.trim().toLowerCase() === "pendente");

          return (
            <div key={sale.id} className={idx > 0 ? "border-t border-white/5" : undefined}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(expanded ? null : sale.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setExpandedId(expanded ? null : sale.id);
                }}
                className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-white/[.03] transition cursor-pointer"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: sale.cancelado ? "var(--accent-3)" : algumAtivo ? "var(--good, #22c55e)" : "var(--ink-dim)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{sale.clienteNome}</div>
                  <div className="text-xs text-ink-dim truncate flex items-center gap-1.5">
                    <span>
                      CNPJ {maskCnpjDisplay(sale.clienteCnpj)} · {new Date(sale.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => copiarCnpj(e, sale)}
                      className="shrink-0 text-[.7rem] font-bold px-1.5 py-0.5 rounded-md hover:bg-white/[.08] transition"
                      style={{ color: copiedId === sale.id ? "var(--good, #22c55e)" : "var(--accent-2)" }}
                      title="Copiar CNPJ"
                    >
                      {copiedId === sale.id ? "Copiado ✓" : "Copiar"}
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {pontosTotal > 0 && <div className="font-bold text-accent-2 text-sm">{fmtNum(pontosTotal)} pts</div>}
                  {valorAparelhos > 0 && <div className="font-bold text-accent-2 text-sm">{fmtBRL(valorAparelhos)}</div>}
                </div>
                <span
                  className="text-[.65rem] font-bold px-2 py-1 rounded-full shrink-0"
                  style={
                    sale.cancelado
                      ? { background: "rgba(255,77,109,.14)", color: "var(--accent-3)" }
                      : todosAtivos
                      ? { background: "rgba(34,197,94,.14)", color: "var(--good, #22c55e)" }
                      : algumAtivo
                      ? { background: "rgba(236,26,114,.14)", color: "var(--accent)" }
                      : { background: "rgba(255,255,255,.06)", color: "var(--ink-dim)" }
                  }
                >
                  {sale.cancelado
                    ? "Cancelada"
                    : todosAtivos
                    ? "Todos ativos"
                    : algumAtivo
                    ? `${itensAtivos}/${sale.items.length} ativos`
                    : "Pendente"}
                </span>
                <span className="text-ink-dim shrink-0">{expanded ? "▲" : "▼"}</span>
              </div>

              {expanded && (
                <div className="px-4 pb-4 flex flex-col gap-3">
                  <ul className="flex flex-col gap-2">
                    {sale.items.map((item) => (
                      <li key={item.id} className="rounded-lg bg-white/[.02] p-2.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm text-ink-dim">
                            <span className="font-semibold text-ink">
                              {INDICATOR_LABELS[item.indicator as keyof typeof INDICATOR_LABELS] ?? item.indicator}
                            </span>{" "}
                            — {item.label}
                            {item.indicator === "APARELHOS"
                              ? ` · ${fmtBRL(item.valorReais ?? 0)}`
                              : ` x${item.quantity} · ${item.pointsTotal} pts`}
                            {item.observacao && <span className="italic"> — "{item.observacao}"</span>}
                          </span>
                          <span
                            className="text-[.62rem] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={
                              item.ativo
                                ? { background: "rgba(34,197,94,.14)", color: "var(--good, #22c55e)" }
                                : { background: "rgba(255,255,255,.06)", color: "var(--ink-dim)" }
                            }
                          >
                            {item.ativo ? "Ativo" : item.status}
                          </span>
                        </div>
                        <SaleItemActions
                          saleId={sale.id}
                          itemId={item.id}
                          status={item.status}
                          ativo={item.ativo}
                          cancelado={sale.cancelado}
                          onChanged={load}
                        />
                        {!sale.cancelado && (
                          <div className="flex items-center gap-3 pt-0.5">
                            <EditQuantityInline
                              saleId={sale.id}
                              itemId={item.id}
                              indicator={item.indicator}
                              quantity={item.quantity}
                              valorReais={item.valorReais}
                              ativo={item.ativo}
                              onChanged={load}
                            />
                            <RemoveItemButton
                              saleId={sale.id}
                              itemId={item.id}
                              ativo={item.ativo}
                              onChanged={load}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {!sale.cancelado && <AddProductForm saleId={sale.id} onChanged={load} />}

                  <SaleFooterActions saleId={sale.id} cancelado={sale.cancelado} podeExcluir={podeExcluir} onChanged={load} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
