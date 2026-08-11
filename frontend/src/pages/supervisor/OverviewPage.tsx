import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, downloadFile } from "../../lib/api";
import { TeamDashboard } from "../../components/TeamDashboard";
import { PeriodFilterForm } from "../../components/PeriodFilterForm";
import type { TeamOverview } from "../../lib/premiacao-types";

interface OverviewResponse {
  team: { id: string; name: string } | null;
  overview: TeamOverview;
}

export default function SupervisorOverviewPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();
    api
      .get<OverviewResponse>(`/api/supervisor/overview${qs ? `?${qs}` : ""}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar dashboard."));
  }, [searchParams]);

  async function exportCsv() {
    try {
      await downloadFile(`/api/export/team-csv?${searchParams.toString()}`, "vendas-flexpremia.csv");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao exportar.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Visão geral da equipe</h1>
          <p className="text-sm text-ink-dim">{data?.team?.name ?? "Equipe"} — acompanhamento somente leitura.</p>
        </div>
        <button onClick={exportCsv} className="btn-grad text-sm">
          Exportar CSV
        </button>
      </div>
      <PeriodFilterForm />
      {error && <p className="text-sm text-accent-3">{error}</p>}
      {data && !data.team && (
        <div className="card p-4 text-sm text-ink-dim">
          Sua equipe ainda não foi configurada. Peça a um Master para vincular sua equipe.
        </div>
      )}
      {data && <TeamDashboard overview={data.overview} detailBasePath="/supervisor/colaboradores" hidePremiacao />}
    </div>
  );
}
