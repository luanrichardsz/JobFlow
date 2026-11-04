import React, { useMemo } from 'react';
import { useJobContext } from '../../context/JobContext';

export const StatsView: React.FC = () => {
  const { applications } = useJobContext();

  const total = applications.length;

  // Conversion metrics computed directly from applications
  const stageStats = useMemo(() => {
    const applied = total;
    let inReview = 0;
    let interview = 0;
    let test = 0;
    let offer = 0;
    let hired = 0;
    let rejected = 0;
    let ghosted = 0;

    applications.forEach((app) => {
      if (app.status === 'em_analise') inReview++;
      if (app.status === 'entrevista') interview++;
      if (app.status === 'teste_tecnico') test++;
      if (app.status === 'proposta') offer++;
      if (app.status === 'aprovado') hired++;
      if (app.status === 'reprovado') rejected++;
      if (app.status === 'sem_resposta') ghosted++;
    });

    const reachedInterview = applications.filter((a) =>
      ['entrevista', 'teste_tecnico', 'proposta', 'aprovado'].includes(a.status)
    ).length;

    const reachedTest = applications.filter((a) =>
      ['teste_tecnico', 'proposta', 'aprovado'].includes(a.status)
    ).length;

    const reachedOffer = applications.filter((a) =>
      ['proposta', 'aprovado'].includes(a.status)
    ).length;

    const respondedCount = applications.filter(
      (a) => a.status !== 'candidatado' && a.status !== 'sem_resposta'
    ).length;

    const responseRate = total > 0 ? Math.round((respondedCount / total) * 100) : 0;
    const interviewConversion = total > 0 ? Math.round((reachedInterview / total) * 100) : 0;
    const offerConversion = reachedInterview > 0 ? Math.round((reachedOffer / reachedInterview) * 100) : 0;

    return {
      applied,
      inReview,
      reachedInterview,
      reachedTest,
      reachedOffer,
      hired,
      rejected,
      ghosted,
      respondedCount,
      responseRate,
      interviewConversion,
      offerConversion,
    };
  }, [applications, total]);

  // Platform distribution
  const platformStats = useMemo(() => {
    const map: Record<string, number> = {};
    applications.forEach((a) => {
      map[a.platform] = (map[a.platform] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [applications]);

  // Modality distribution
  const modalityStats = useMemo(() => {
    const map: Record<string, number> = {
      remoto: 0,
      hibrido: 0,
      presencial: 0,
    };
    applications.forEach((a) => {
      map[a.modality] = (map[a.modality] || 0) + 1;
    });
    return map;
  }, [applications]);

  // Monthly breakdown computed from appliedDate
  const monthlyStats = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const buckets: Record<string, { label: string; count: number; sortKey: string }> = {};
    applications.forEach((a) => {
      const [y, m] = a.appliedDate.split('-');
      if (!y || !m) return;
      const key = `${y}-${m}`;
      const mIdx = parseInt(m, 10) - 1;
      if (!buckets[key]) {
        buckets[key] = {
          label: `${monthNames[mIdx] || m} ${y}`,
          count: 0,
          sortKey: key,
        };
      }
      buckets[key].count += 1;
    });
    return Object.values(buckets).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [applications]);

  const monthlyMax = Math.max(1, ...monthlyStats.map((m) => m.count));
  const monthlyAvg =
    monthlyStats.length > 0
      ? (total / monthlyStats.length).toFixed(1).replace('.0', '')
      : '0';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f5f6]">
          Estatísticas
        </h1>
        <p className="text-xs sm:text-sm text-[#a1a4aa] mt-0.5">
          Taxas de conversão e distribuição das {total} candidaturas registradas.
        </p>
      </div>

      {/* KPI Metrics: one divided container, no icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-[#16181b] overflow-hidden gap-px">
        {[
          {
            label: 'Taxa de resposta',
            value: `${stageStats.responseRate}%`,
            caption: `${stageStats.respondedCount} de ${total} responderam`,
          },
          {
            label: 'Conversão para entrevista',
            value: `${stageStats.interviewConversion}%`,
            caption: `${stageStats.reachedInterview} de ${total} chegaram à entrevista`,
          },
          {
            label: 'Ofertas por entrevista',
            value: `${stageStats.offerConversion}%`,
            caption: `${stageStats.reachedOffer} de ${stageStats.reachedInterview} entrevistas`,
          },
          {
            label: 'Encerradas sem oferta',
            value: String(stageStats.rejected + stageStats.ghosted),
            caption: `${stageStats.rejected} reprovações · ${stageStats.ghosted} sem retorno`,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="p-5 bg-[#16181b] outline outline-1 outline-[#0b0c0e]">
            <span className="block text-[13px] text-[#a1a4aa]">{kpi.label}</span>
            <span className="block mt-1.5 text-[26px] leading-8 font-medium tabular-nums text-[#f4f5f6]">
              {kpi.value}
            </span>
            <span className="block mt-1 text-xs text-[#8a8d93]">{kpi.caption}</span>
          </div>
        ))}
      </div>

      {/* Funil de Recrutamento */}
      <div className="p-6 rounded-2xl bg-[#16181b] space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-[#f4f5f6]">
            Progressão no funil
          </h2>
          <span className="text-xs text-[#8a8d93] tabular-nums">
            Acumulado por etapa atingida
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {[
            {
              step: 'Candidaturas enviadas',
              count: stageStats.applied,
              pct: total > 0 ? 100 : 0,
              color: 'bg-[#6b6e74]',
            },
            {
              step: 'Triagem ou resposta recebida',
              count: stageStats.applied - stageStats.ghosted,
              pct: Math.round(((stageStats.applied - stageStats.ghosted) / (stageStats.applied || 1)) * 100),
              color: 'bg-[#a1a4aa]',
            },
            {
              step: 'Entrevista realizada',
              count: stageStats.reachedInterview,
              pct: Math.round((stageStats.reachedInterview / (stageStats.applied || 1)) * 100),
              color: 'bg-[#a1a4aa]',
            },
            {
              step: 'Teste técnico',
              count: stageStats.reachedTest,
              pct: Math.round((stageStats.reachedTest / (stageStats.applied || 1)) * 100),
              color: 'bg-[#e5a93b]',
            },
            {
              step: 'Proposta ou aprovação',
              count: stageStats.reachedOffer,
              pct: Math.round((stageStats.reachedOffer / (stageStats.applied || 1)) * 100),
              color: 'bg-[#3FBF8A]',
            },
          ].map((item) => (
            <div key={item.step} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#c8cace]">{item.step}</span>
                <span className="tabular-nums text-[#f4f5f6]">
                  {item.count} <span className="text-[#8a8d93]">({item.pct}%)</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#202226] overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Candidaturas por Mês + Plataformas + Modalidades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Total candidaturas por mês */}
        <div className="p-5 rounded-2xl bg-[#16181b] flex flex-col justify-between">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#f4f5f6]">
              Por mês de envio
            </h3>
            <span className="text-xs text-[#8a8d93] tabular-nums">
              Média {monthlyAvg}/mês
            </span>
          </div>

          <div className="my-6 flex-1 min-h-[150px] flex items-end gap-4">
            {monthlyStats.map((item, i) => {
              const isLatest = i === monthlyStats.length - 1;
              const h = Math.round((item.count / monthlyMax) * 100);
              return (
                <div key={item.sortKey} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                  <span className={`text-xs tabular-nums ${isLatest ? 'text-[#f4f5f6]' : 'text-[#a1a4aa]'}`}>
                    {item.count}
                  </span>
                  <div
                    className={`w-full max-w-14 rounded-md ${isLatest ? 'bg-[#3FBF8A]' : 'bg-[#2e3034]'}`}
                    style={{ height: `${Math.max(h, 6)}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#25272b] flex gap-4 text-xs text-[#8a8d93] tabular-nums text-center">
            {monthlyStats.map((item) => (
              <span key={item.sortKey} className="flex-1">{item.label}</span>
            ))}
          </div>
        </div>

        {/* Distribuição por Plataforma */}
        <div className="p-5 rounded-2xl bg-[#16181b] space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#f4f5f6]">
              Por plataforma
            </h3>
            <span className="text-xs text-[#8a8d93] tabular-nums">
              {platformStats.length} origens
            </span>
          </div>

          <div className="space-y-3">
            {platformStats.map(([platform, count], idx) => {
              const pct = Math.round((count / (total || 1)) * 100);
              return (
                <div key={platform} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#c8cace]">{platform}</span>
                    <span className="tabular-nums text-[#f4f5f6]">
                      {count} <span className="text-[#8a8d93]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#202226] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${idx === 0 ? 'bg-[#3FBF8A]' : 'bg-[#6b6e74]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição por Modalidade */}
        <div className="p-5 rounded-2xl bg-[#16181b] space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#f4f5f6]">
                Por modalidade
              </h3>
              <span className="text-xs text-[#8a8d93] tabular-nums">
                {total} vagas
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: 'Remoto',
                  count: modalityStats.remoto,
                  pct: Math.round((modalityStats.remoto / (total || 1)) * 100),
                  bar: 'bg-[#3FBF8A]',
                },
                {
                  label: 'Híbrido',
                  count: modalityStats.hibrido,
                  pct: Math.round((modalityStats.hibrido / (total || 1)) * 100),
                  bar: 'bg-[#6b6e74]',
                },
                {
                  label: 'Presencial',
                  count: modalityStats.presencial,
                  pct: Math.round((modalityStats.presencial / (total || 1)) * 100),
                  bar: 'bg-[#3a3d42]',
                },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#c8cace]">{m.label}</span>
                    <span className="tabular-nums text-[#f4f5f6]">
                      {m.count} <span className="text-[#8a8d93]">({m.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#202226] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.bar}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#202226] text-xs text-[#a1a4aa] leading-relaxed">
            {modalityStats.remoto} de {total} candidaturas ({Math.round((modalityStats.remoto / (total || 1)) * 100)}%) são para trabalho remoto.
          </div>
        </div>
      </div>
    </div>
  );
};
