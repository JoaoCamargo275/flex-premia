import { useSearchParams } from "react-router-dom";
import { useState } from "react";

// A régua de premiação é apurada por mês, então o filtro trabalha em
// granularidade de mês (input type="month" abre o seletor de calendário
// nativo do navegador, mês a mês) — por baixo, ainda mandamos pro backend
// o primeiro e o último dia do mês escolhido (from/to como data completa).
function monthFromDateStr(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 7);
}

function firstDayOfMonth(monthStr: string): string {
  return `${monthStr}-01`;
}

function lastDayOfMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthStr}-${String(last).padStart(2, "0")}`;
}

function monthStrFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PeriodFilterForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [fromMonth, setFromMonth] = useState(monthFromDateStr(searchParams.get("from")));
  const [toMonth, setToMonth] = useState(monthFromDateStr(searchParams.get("to")));

  function applyRange(from: string, to: string) {
    const next = new URLSearchParams(searchParams);
    if (from) next.set("from", firstDayOfMonth(from));
    else next.delete("from");
    if (to) next.set("to", lastDayOfMonth(to));
    else next.delete("to");
    setSearchParams(next);
  }

  function apply() {
    applyRange(fromMonth, toMonth);
  }

  function selecionarMesAtual() {
    const m = monthStrFromDate(new Date());
    setFromMonth(m);
    setToMonth(m);
    applyRange(m, m);
  }

  function selecionarMesPassado() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const m = monthStrFromDate(d);
    setFromMonth(m);
    setToMonth(m);
    applyRange(m, m);
  }

  function clear() {
    setFromMonth("");
    setToMonth("");
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
  }

  return (
    <div className="card p-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">De (mês)</label>
        <input
          type="month"
          className="input py-1.5"
          value={fromMonth}
          onChange={(e) => setFromMonth(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-ink-dim">Até (mês)</label>
        <input type="month" className="input py-1.5" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
      </div>
      <button onClick={apply} className="btn-grad py-1.5 text-sm">
        Filtrar
      </button>
      <button onClick={selecionarMesAtual} className="text-sm text-accent-2 underline">
        Mês atual
      </button>
      <button onClick={selecionarMesPassado} className="text-sm text-accent-2 underline">
        Mês passado
      </button>
      <button onClick={clear} className="text-sm text-ink-dim underline">
        Limpar
      </button>
    </div>
  );
}
