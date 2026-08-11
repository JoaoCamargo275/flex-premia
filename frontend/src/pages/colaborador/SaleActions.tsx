import { useState } from "react";
import { api } from "../../lib/api";
import { SALE_STATUS_SUGESTOES } from "../../lib/types";

// Ações de UM PRODUTO da venda — cada item tem seu próprio status e flag de
// ativação, já que produtos da mesma venda costumam ativar em datas
// diferentes (ver backend: SaleItem.status / SaleItem.ativo).
export function SaleItemActions({
  saleId,
  itemId,
  status,
  ativo,
  cancelado,
  onChanged,
}: {
  saleId: string;
  itemId: string;
  status: string;
  ativo: boolean;
  cancelado: boolean;
  onChanged: () => void;
}) {
  const [statusTexto, setStatusTexto] = useState(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const datalistId = `status-sugestoes-${itemId}`;

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setPending(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar produto.");
    } finally {
      setPending(false);
    }
  }

  const statusMudou = statusTexto.trim() !== status.trim() && statusTexto.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <input
          list={datalistId}
          className="input py-1 text-xs flex-1"
          value={statusTexto}
          disabled={pending || cancelado}
          onChange={(e) => setStatusTexto(e.target.value)}
          placeholder="Situação deste produto..."
        />
        <datalist id={datalistId}>
          {SALE_STATUS_SUGESTOES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {statusMudou && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => api.patch(`/api/sales/${saleId}/items/${itemId}/status`, { status: statusTexto.trim() }))}
            className="text-xs font-bold text-accent shrink-0"
          >
            Salvar
          </button>
        )}
      </div>

      <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={ativo}
          disabled={pending || cancelado}
          onChange={(e) => run(() => api.patch(`/api/sales/${saleId}/items/${itemId}/ativo`, { ativo: e.target.checked }))}
        />
        Ativo
      </label>

      {error && <p className="text-xs text-accent-3 w-full">{error}</p>}
    </div>
  );
}

// Ações da venda como um todo: cancelar (zera a contagem de todos os
// produtos) e excluir (só permitido se nada ainda saiu do estado pendente).
export function SaleFooterActions({
  saleId,
  cancelado,
  podeExcluir,
  onChanged,
}: {
  saleId: string;
  cancelado: boolean;
  podeExcluir: boolean;
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
      <label className="flex items-center gap-2 text-sm cursor-pointer text-accent-3">
        <input
          type="checkbox"
          checked={cancelado}
          disabled={pending}
          onChange={(e) => {
            if (e.target.checked && !confirm("Marcar esta venda inteira como cancelada? Todos os produtos param de contar pontos.")) return;
            run(() => api.patch(`/api/sales/${saleId}/cancelado`, { cancelado: e.target.checked }));
          }}
        />
        Cancelar venda inteira
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
