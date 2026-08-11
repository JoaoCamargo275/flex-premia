import { useState } from "react";
import { api } from "../../lib/api";
import { SALE_STATUS_SUGESTOES } from "../../lib/types";

export function SaleActions({
  saleId,
  status,
  ativo,
  cancelado,
  podeExcluir,
  onChanged,
}: {
  saleId: string;
  status: string;
  ativo: boolean;
  cancelado: boolean;
  podeExcluir: boolean;
  onChanged: () => void;
}) {
  const [statusTexto, setStatusTexto] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar venda.");
    } finally {
      setPending(false);
    }
  }

  const statusMudou = statusTexto.trim() !== status.trim() && statusTexto.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
      <div className="flex items-center gap-2 flex-1 min-w-[220px]">
        <label className="text-xs text-ink-dim shrink-0">Status</label>
        <input
          list="status-sugestoes"
          className="input py-1.5 text-sm flex-1"
          value={statusTexto}
          disabled={pending || cancelado}
          onChange={(e) => setStatusTexto(e.target.value)}
          placeholder="Descreva a situação da venda..."
        />
        <datalist id="status-sugestoes">
          {SALE_STATUS_SUGESTOES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {statusMudou && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => api.patch(`/api/sales/${saleId}/status`, { status: statusTexto.trim() }))}
            className="text-xs font-bold text-accent shrink-0"
          >
            Salvar
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={ativo}
          disabled={pending || cancelado}
          onChange={(e) => run(() => api.patch(`/api/sales/${saleId}/ativo`, { ativo: e.target.checked }))}
        />
        Ativo
      </label>

      <label className="flex items-center gap-2 text-sm cursor-pointer text-accent-3">
        <input
          type="checkbox"
          checked={cancelado}
          disabled={pending}
          onChange={(e) => {
            if (e.target.checked && !confirm("Marcar esta venda como cancelada? Ela para de contar pontos.")) return;
            run(() => api.patch(`/api/sales/${saleId}/cancelado`, { cancelado: e.target.checked }));
          }}
        />
        Cancelada
      </label>

      {podeExcluir && (
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Excluir esta venda pendente?")) run(() => api.delete(`/api/sales/${saleId}`));
          }}
          className="text-xs text-accent-3 font-semibold ml-auto"
        >
          Excluir
        </button>
      )}

      {error && <p className="text-xs text-accent-3 w-full">{error}</p>}
    </div>
  );
}
