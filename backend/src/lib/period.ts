import type { PeriodFilter } from "./aggregate";

export function parsePeriod(query: { from?: unknown; to?: unknown }): PeriodFilter {
  const from = typeof query.from === "string" && query.from ? new Date(`${query.from}T00:00:00`) : undefined;
  const to = typeof query.to === "string" && query.to ? new Date(`${query.to}T23:59:59`) : undefined;
  return { from, to };
}
