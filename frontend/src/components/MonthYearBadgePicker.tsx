import { useEffect, useRef, useState } from "react";
import { MESES_COMPLETO, useMonthFilter } from "../lib/month-filter-context";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Calendariozinho compacto que fica ao lado do badge "COLABORADOR" no topo —
// deixa o colaborador trocar de mês pra fazer/ver os registros mensais das
// vendas, sem precisar navegar até uma página separada de filtro.
export function MonthYearBadgePicker() {
  const { year, month, label, isMesAtual, setMonth, irParaMesAtual } = useMonthFilter();
  const [open, setOpen] = useState(false);
  const [anoVisivel, setAnoVisivel] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setAnoVisivel(year);
          setOpen((o) => !o);
        }}
        className="text-xs font-bold uppercase tracking-wide ml-2 border border-line rounded-full px-2.5 py-1 flex items-center gap-1.5 hover:bg-white/5 transition"
        style={{ color: "var(--accent-2)" }}
        title="Selecionar mês dos registros"
      >
        <span>📅</span>
        <span className="normal-case">{label}</span>
        {!isMesAtual && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 card p-3 w-64 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setAnoVisivel((a) => a - 1)}
              className="px-2 py-1 rounded hover:bg-white/10 text-sm font-bold"
            >
              ◀
            </button>
            <span className="font-bold text-sm">{anoVisivel}</span>
            <button
              type="button"
              onClick={() => setAnoVisivel((a) => a + 1)}
              className="px-2 py-1 rounded hover:bg-white/10 text-sm font-bold"
            >
              ▶
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MESES_ABREV.map((label, idx) => {
              const isSelected = anoVisivel === year && idx === month;
              return (
                <button
                  key={label}
                  type="button"
                  title={MESES_COMPLETO[idx]}
                  onClick={() => {
                    setMonth(anoVisivel, idx);
                    setOpen(false);
                  }}
                  className="text-xs font-semibold py-2 rounded-lg transition"
                  style={
                    isSelected
                      ? { background: "var(--grad)", color: "#fff" }
                      : { background: "rgba(255,255,255,.04)", color: "var(--ink)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          {!isMesAtual && (
            <button
              type="button"
              onClick={() => {
                irParaMesAtual();
                setOpen(false);
              }}
              className="mt-2 text-xs text-accent-2 underline"
            >
              Voltar para o mês atual
            </button>
          )}
        </div>
      )}
    </div>
  );
}
