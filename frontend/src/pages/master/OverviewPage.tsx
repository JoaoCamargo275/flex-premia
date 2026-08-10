import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, downloadFile } from "../../lib/api";
import { TeamDashboard } from "../../components/TeamDashboard";
import { PeriodFilterForm } from "../../components/PeriodFilterForm";
import type { TeamOverview } from "../../lib/premiacao-types";

interface OverviewResponse {
  teams: { id: string; name: string }[];
  overview: TeamOverview;
}

export default function MasterOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();
    api
      .get<OverviewResponse>(`/api/master/overview${qs ? `?${qs}` : ""}`)
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

  function handleTeamChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) next.set("teamId", e.target.value);
    else next.delete("teamId");
    setSearchParams(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Visão geral — todas as equipes</h1>
          <p className="text-sm text-ink-dim">Consolidado global, com filtro por equipe.</p>
        </div>
        <button onClick={exportCsv} className="btn-grad text-sm">
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <PeriodFilterForm />
        <div className="card p-3 flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-ink-dim">Equipe</label>
            <select value={searchParams.get("teamId") ?? ""} onChange={handleTeamChange} className="input py-1.5">
              <option value="">Todas as equipes</option>
              {data?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-accent-3">{error}</p>}
      {data && <TeamDashboard overview={data.overview} detailBasePath="/master/colaboradores" />}
    </div>
  );
}
