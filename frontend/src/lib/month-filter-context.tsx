import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// O colaborador registra vendas mês a mês. Esse contexto guarda qual mês
// está selecionado (compartilhado entre "Meu painel" e "Minhas vendas") e
// persiste em localStorage para lembrar a última escolha entre sessões.

export const MESES_COMPLETO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const STORAGE_KEY = "flexpremia_colab_mes_selecionado";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function firstDayOfMonthStr(y: number, m: number): string {
  return `${y}-${pad2(m + 1)}-01`;
}

function lastDayOfMonthStr(y: number, m: number): string {
  const d = new Date(y, m + 1, 0).getDate();
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export interface MonthFilterValue {
  year: number;
  month: number; // 0-11
  from: string;
  to: string;
  label: string;
  isMesAtual: boolean;
  setMonth: (year: number, month: number) => void;
  irParaMesAtual: () => void;
  /** Data (ISO, com hora) a usar ao registrar uma venda nova, para que ela caia dentro do mês selecionado. */
  dataReferenciaVenda: () => string;
}

const MonthFilterContext = createContext<MonthFilterValue | null>(null);

function lerMesSalvo(): { year: number; month: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const [y, m] = saved.split("-").map(Number);
      if (y && m) return { year: y, month: m - 1 };
    }
  } catch {
    // localStorage indisponível — segue com o mês atual
  }
  const hoje = new Date();
  return { year: hoje.getFullYear(), month: hoje.getMonth() };
}

export function MonthFilterProvider({ children }: { children: ReactNode }) {
  const [ym, setYm] = useState(lerMesSalvo);

  function setMonth(year: number, month: number) {
    setYm({ year, month });
    try {
      localStorage.setItem(STORAGE_KEY, `${year}-${pad2(month + 1)}`);
    } catch {
      // ignora falha ao persistir
    }
  }

  function irParaMesAtual() {
    const hoje = new Date();
    setMonth(hoje.getFullYear(), hoje.getMonth());
  }

  // Ao registrar uma venda nova estando num mês diferente do atual, a data
  // salva precisa cair dentro do mês selecionado (senão a venda não
  // aparece depois quando o colaborador olhar aquele mês). Preserva o
  // dia-do-mês e horário reais sempre que possível, só troca mês/ano.
  function dataReferenciaVenda(): string {
    const hoje = new Date();
    if (hoje.getFullYear() === ym.year && hoje.getMonth() === ym.month) {
      return hoje.toISOString();
    }
    const diasNoMes = new Date(ym.year, ym.month + 1, 0).getDate();
    const dia = Math.min(hoje.getDate(), diasNoMes);
    const data = new Date(
      ym.year,
      ym.month,
      dia,
      hoje.getHours(),
      hoje.getMinutes(),
      hoje.getSeconds()
    );
    return data.toISOString();
  }

  const value = useMemo<MonthFilterValue>(() => {
    const hoje = new Date();
    return {
      year: ym.year,
      month: ym.month,
      from: firstDayOfMonthStr(ym.year, ym.month),
      to: lastDayOfMonthStr(ym.year, ym.month),
      label: `${MESES_COMPLETO[ym.month]} de ${ym.year}`,
      isMesAtual: hoje.getFullYear() === ym.year && hoje.getMonth() === ym.month,
      setMonth,
      irParaMesAtual,
      dataReferenciaVenda,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym]);

  return <MonthFilterContext.Provider value={value}>{children}</MonthFilterContext.Provider>;
}

export function useMonthFilter(): MonthFilterValue {
  const ctx = useContext(MonthFilterContext);
  if (!ctx) throw new Error("useMonthFilter precisa estar dentro de um MonthFilterProvider.");
  return ctx;
}
