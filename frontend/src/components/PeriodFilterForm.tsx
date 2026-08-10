import { useSearchParams } from "react-router-dom";
import { useState } from "react";

export function PeriodFilterForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function apply() {
    const next = new URLSearchParams(searchParams);
    if (from) next.set("from", from);
    else next.delete("from");
    if (to) next.set("to", to);
    else next.delete("to");
    setSearchParams(next);
  }

  function clear() {
    setFrom("");
    setTo("");
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
  }

  return (
    <div className="card p-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">De</label>
        <input type="date" className="input py-1.5" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">Até</label>
        <input type="date" className="input py-1.5" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <button onClick={apply} className="btn-grad py-1.5 text-sm">
        Filtrar
      </button>
      <button onClick={clear} className="text-sm text-ink-dim underline">
        Limpar
      </button>
    </div>
  );
}
