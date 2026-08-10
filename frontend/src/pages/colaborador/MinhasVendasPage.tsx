import { useCallback, useEffect, useState } from "react";
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
}
interface Sale {
  id: string;
  clienteNome: string;
  clienteCnpj: string;
  status: string;
  ativo: boolean;
  createdAt: string;
  items: SaleItem[];
}

export default function MinhasVendasPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<Sale[]>("/api/sales")
      .then(setSales)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar vendas."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Minhas vendas</h1>
        <p className="text-sm text-ink-dim">
          Acompanhe o status de cada venda e marque como <b>Ativo</b> quando ela for efetivamente
          ativada — só assim ela conta pontos para sua faixa e premiação.
        </p>
      </div>

      {error && <p className="text-sm text-accent-3">{error}</p>}

      <div className="flex flex-col gap-3">
        {sales?.length === 0 && <p className="text-sm text-ink-dim">Nenhuma venda registrada ainda.</p>}
        {sales?.map((sale) => {
          const pontosTotal = sale.items.reduce((acc, i) => acc + i.pointsTotal, 0);
          const valorAparelhos = sale.items.reduce((acc, i) => acc + (i.valorReais ?? 0), 0);
          return (
            <div
              key={sale.id}
              className="card p-4 flex flex-col gap-3"
              style={sale.ativo ? { border: "1px solid rgba(34,197,94,.5)", background: "rgba(34,197,94,.06)" } : undefined}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-bold">{sale.clienteNome}</div>
                  <div className="text-xs text-ink-dim">
                    CNPJ {sale.clienteCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")} ·{" "}
                    {new Date(sale.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="text-right">
                  {pontosTotal > 0 && <div className="font-bold text-accent-2">{fmtNum(pontosTotal)} pts</div>}
                  {valorAparelhos > 0 && <div className="font-bold text-accent-2">{fmtBRL(valorAparelhos)}</div>}
                  {sale.ativo && <div className="text-xs font-bold text-good">✓ Ativo</div>}
                </div>
              </div>

              <ul className="text-sm text-ink-dim flex flex-col gap-0.5">
                {sale.items.map((item) => (
                  <li key={item.id}>
                    {INDICATOR_LABELS[item.indicator as keyof typeof INDICATOR_LABELS]} — {item.label}
                    {item.indicator === "APARELHOS" ? ` · ${fmtBRL(item.valorReais ?? 0)}` : ` x${item.quantity} · ${item.pointsTotal} pts`}
                  </li>
                ))}
              </ul>

              <SaleActions
                saleId={sale.id}
                status={sale.status as never}
                ativo={sale.ativo}
                onChanged={load}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
