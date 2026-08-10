import { useState } from "react";
import { api } from "../../lib/api";
import { SALE_STATUSES, SALE_STATUS_LABELS, type SaleStatus } from "../../lib/types";

export function SaleActions({
  saleId,
  status,
  ativo,
  onChanged,
}: {
  saleId: string;
  status: SaleStatus;
  ativo: boolean;
  onChanged: () => void;
}) {
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

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
      <div className="flex items-center gap-2">
        <label className="text-xs text-ink-dim">Status</label>
        <select
          className="input py-1.5 text-sm"
          value={status}
          disabled={pending}
          onChange={(e) => run(() => api.patch(`/api/sales/${saleId}/status`, { status: e.target.value as SaleStatus }))}
        >
          {SALE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SALE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={ativo}
          disabled={pending}
          onChange={(e) => run(() => api.patch(`/api/sales/${saleId}/ativo`, { ativo: e.target.checked }))}
        />
        Ativo
      </label>

      {status === "PENDENTE" && (
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
