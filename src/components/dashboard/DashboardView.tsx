import React, { useState, useMemo } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  Briefcase,
  Clock,
  CalendarCheck2,
  TrendingUp,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  AlertCircle,
  Building,
} from 'lucide-react';
import {
  STATUS_CONFIG,
  MODALITY_CONFIG,
  formatDatePT,
  formatRelativeTime,
} from '../../utils/formatters';
import { ApplicationStatus, JobApplication } from '../../types';

const PIPELINE_STAGES: { label: string; statuses: ApplicationStatus[]; bar: string }[] = [
  { label: 'Candidatado', statuses: ['candidatado'], bar: 'bg-[#6b6e74]' },
  { label: 'Em análise', statuses: ['em_analise'], bar: 'bg-[#a1a4aa]' },
  { label: 'Entrevista', statuses: ['entrevista'], bar: 'bg-[#e5a93b]' },
  { label: 'Teste técnico', statuses: ['teste_tecnico'], bar: 'bg-[#e5a93b]' },
  { label: 'Proposta ou aprovado', statuses: ['proposta', 'aprovado'], bar: 'bg-[#3FBF8A]' },
  { label: 'Sem resposta', statuses: ['sem_resposta'], bar: 'bg-[#4a4d52]' },
  { label: 'Finalizado (reprov./desist.)', statuses: ['reprovado', 'desistencia'], bar: 'bg-[#e5484d]/70' },
];

export const DashboardView: React.FC = () => {
  const {
    applications,
    events,
    setSelectedApplicationId,
    setEditingApplicationId,
    setIsNewApplicationModalOpen,
    deleteApplication,
    updateStatus,
    setActiveView,
    toggleEventCompleted,
  } = useJobContext();

  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<number | null>(null);
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState<string | null>(null);

  // Filter applications by period
  const filteredApps = useMemo(() => {
    if (periodFilter === 'all') return applications;
    const now = new Date();
    const days = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return applications.filter((app) => new Date(app.appliedDate + 'T12:00:00') >= cutoff);
  }, [applications, periodFilter]);

  // KPIs
  const totalApplications = filteredApps.length;
  const inProgress = filteredApps.filter(
    (a) =>
      a.status === 'candidatado' ||
      a.status === 'em_analise' ||
      a.status === 'entrevista' ||
      a.status === 'teste_tecnico' ||
      a.status === 'proposta'
  ).length;

  const scheduledInterviews = events.filter((e) => e.type === 'entrevista' && !e.completed).length;

  // Response rate: percentage of applications that are NOT 'candidatado' or 'sem_resposta'
  const respondedApps = filteredApps.filter(
    (a) => a.status !== 'candidatado' && a.status !== 'sem_resposta'
  ).length;
  const responseRate = totalApplications > 0 ? Math.round((respondedApps / totalApplications) * 100) : 0;

  // Status distribution for donut chart
  const statusCounts = useMemo(() => {
    const counts: Record<ApplicationStatus, number> = {
      candidatado: 0,
      em_analise: 0,
      entrevista: 0,
      teste_tecnico: 0,
      proposta: 0,
      aprovado: 0,
      reprovado: 0,
      sem_resposta: 0,
      desistencia: 0,
    };
    filteredApps.forEach((app) => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    return counts;
  }, [filteredApps]);

  // Recent applications (first 6)
  const recentApps = useMemo(() => {
    return [...applications]
      .sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime())
      .slice(0, 6);
  }, [applications]);

  // Upcoming activities (pending events)
  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => !e.completed)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [events]);

  // Applications sent per week, last 6 weeks ending today
  const weeklyData = useMemo(() => {
    const today = new Date();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return Array.from({ length: 6 }, (_, i) => {
      const end = new Date(today.getTime() - (5 - i) * 7 * 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      const count = applications.filter((app) => {
        const d = new Date(app.appliedDate + 'T12:00:00');
        return d > start && d <= end;
      }).length;
      const s0 = new Date(start.getTime() + 86400000);
      return { label: `${String(s0.getDate()).padStart(2, '0')} ${months[s0.getMonth()]}`, count };
    });
  }, [applications]);
  const weeklyMax = Math.max(1, ...weeklyData.map((w) => w.count));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Visão geral
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
            Acompanhe suas candidaturas e a evolução dos seus processos seletivos.
          </p>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-lg border bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-neutral-100 light:border-neutral-200 self-start sm:self-auto shrink-0">
          {(
            [
              { key: '7d', label: '7 dias' },
              { key: '30d', label: '30 dias' },
              { key: '90d', label: '90 dias' },
              { key: 'all', label: 'Tudo' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setPeriodFilter(item.key)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                periodFilter === item.key
                  ? 'bg-[#2a2c30] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 dark:text-[#a1a4aa] dark:hover:text-[#f4f5f6] light:text-neutral-600 light:hover:text-neutral-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs: one container split by hairlines, label over value, captions computed from the rows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-[#16181b] overflow-hidden gap-px">
        {[
          {
            label: 'Candidaturas',
            value: String(totalApplications),
            caption: periodFilter === 'all' ? 'Desde o início' : `Nos últimos ${periodFilter.replace('d', '')} dias`,
          },
          {
            label: 'Em andamento',
            value: String(inProgress),
            caption: `${Math.round((inProgress / (totalApplications || 1)) * 100)}% das candidaturas`,
          },
          {
            label: 'Entrevistas marcadas',
            value: String(scheduledInterviews),
            caption: scheduledInterviews === 0 ? 'Nenhuma pendente' : 'Ainda não realizadas',
          },
          {
            label: 'Taxa de resposta',
            value: `${responseRate}%`,
            caption: `${respondedApps} responderam · ${statusCounts.sem_resposta} sem resposta`,
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

      {/* Charts, computed from the applications themselves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Weekly submissions: the current week carries the one data hue */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#16181b] flex flex-col">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold text-[#f4f5f6]">Candidaturas enviadas por semana</h2>
            <span className="text-xs text-[#8a8d93] tabular-nums">
              {weeklyData.reduce((sum, w) => sum + w.count, 0)} nas últimas 6 semanas
            </span>
          </div>
          <div className="mt-6 flex-1 min-h-[180px] grid grid-cols-6 gap-3 items-end">
            {weeklyData.map((w, i) => {
              const isCurrent = i === weeklyData.length - 1;
              const h = Math.round((w.count / weeklyMax) * 100);
              return (
                <div key={w.label} className="h-full flex flex-col justify-end items-center gap-2">
                  <span className={`text-[13px] tabular-nums ${isCurrent ? 'text-[#f4f5f6]' : 'text-[#a1a4aa]'}`}>
                    {w.count}
                  </span>
                  <div
                    className={`w-full max-w-14 rounded-md ${isCurrent ? 'bg-[#3FBF8A]' : 'bg-[#2e3034]'}`}
                    style={{ height: w.count === 0 ? '2px' : `${Math.max(h, 4)}%` }}
                    title={`${w.count} candidatura(s) na semana de ${w.label}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-[#25272b] grid grid-cols-6 gap-3 text-xs text-[#8a8d93] tabular-nums text-center">
            {weeklyData.map((w, i) => (
              <span key={w.label} className="whitespace-nowrap">{i === weeklyData.length - 1 ? 'Atual' : w.label}</span>
            ))}
          </div>
        </div>

        {/* The pipeline: where every application stands, at its true ratio */}
        <div className="p-5 rounded-2xl bg-[#16181b] flex flex-col">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold text-[#f4f5f6]">Funil</h2>
            <span className="text-xs text-[#8a8d93] tabular-nums">{totalApplications} candidaturas</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {PIPELINE_STAGES.map((stage) => {
              const count = stage.statuses.reduce((sum, st) => sum + statusCounts[st], 0);
              const pct = totalApplications ? (count / totalApplications) * 100 : 0;
              return (
                <li key={stage.label}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className={count === 0 ? 'text-[#6b6e74]' : 'text-[#c8cace]'}>{stage.label}</span>
                    <span className={`tabular-nums ${count === 0 ? 'text-[#6b6e74]' : 'text-[#f4f5f6]'}`}>{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#202226] overflow-hidden">
                    <div className={`h-full rounded-full ${stage.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Grid Split: Candidaturas Recentes (2/3) + Próximas Atividades (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seção "Candidaturas recentes" */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
                Candidaturas recentes
              </h2>
              <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-500">
                Oportunidades com movimentação mais recente
              </p>
            </div>
            <button
              onClick={() => setActiveView('applications')}
              className="text-xs font-medium text-[#f4f5f6] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Ver todas ({applications.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentApps.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#16181b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#f4f5f6]">
                  Nenhuma candidatura registrada ainda
                </p>
                <p className="text-xs text-[#a1a4aa] mt-0.5">
                  Cadastre sua primeira vaga para acompanhar o funil e as entrevistas.
                </p>
              </div>
              <button
                onClick={() => setIsNewApplicationModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors self-start sm:self-auto shrink-0"
              >
                + Nova candidatura
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentApps.map((app) => {
              const statusCfg = STATUS_CONFIG[app.status];
              const modalityCfg = MODALITY_CONFIG[app.modality];
              const isMenuOpen = activeMenuJobId === app.id;

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedApplicationId(app.id)}
                  className="group relative p-4 rounded-2xl transition-colors duration-150 cursor-pointer bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 hover:bg-[#1c1f24]"
                >
                  {/* Card Header: Avatar, Company, Role, Menu */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs shrink-0"
                        style={{ backgroundColor: (app.companyLogoColor || '#a1a4aa') + '24', color: app.companyLogoColor || '#a1a4aa' }}
                      >
                        {app.company.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-xs text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 truncate group-hover:underline transition-colors">
                          {app.company}
                        </h3>
                        <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 truncate">
                          {app.role}
                        </p>
                      </div>
                    </div>

                    {/* Action menu button */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuJobId(isMenuOpen ? null : app.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                        aria-label="Opções da candidatura"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-44 rounded-lg border shadow-lg py-1 z-20 bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900">
                          <button
                            onClick={() => {
                              setSelectedApplicationId(app.id);
                              setActiveMenuJobId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingApplicationId(app.id);
                              setActiveMenuJobId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-white/5"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          {app.status !== 'sem_resposta' && (
                            <button
                              onClick={() => {
                                updateStatus(
                                  app.id,
                                  'sem_resposta',
                                  'Marcado como "Sem resposta" pela Visão geral.'
                                );
                                setActiveMenuJobId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-neutral-300 hover:bg-white/5"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Marcar sem resposta</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              deleteApplication(app.id);
                              setActiveMenuJobId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left text-[#e5484d] hover:bg-white/5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges: Status and Modality */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>

                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${modalityCfg.bg} ${modalityCfg.text}`}
                    >
                      {modalityCfg.label}
                    </span>
                  </div>

                  {/* Tech tags preview (Anti-slop: subtle clean inline tags) */}
                  <div className="flex items-center gap-1 mt-2.5 overflow-hidden">
                    {app.technologies.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="text-xs tabular-nums px-1.5 py-0.2 rounded bg-neutral-500/10 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-300 light:text-neutral-600 truncate"
                      >
                        {tech}
                      </span>
                    ))}
                    {app.technologies.length > 3 && (
                      <span className="text-xs text-neutral-500 tabular-nums">
                        +{app.technologies.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Metadata line: applied date & updated date */}
                  <div className="flex items-center justify-between text-xs tabular-nums text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-500 mt-3 pt-2.5 border-t border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-100">
                    <span>Inscrito: {formatDatePT(app.appliedDate)}</span>
                    <span>Atualizado: {formatRelativeTime(app.updatedDate)}</span>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>

        {/* Seção "Próximas atividades" */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
                Próximas atividades
              </h2>
              <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-500">
                Entrevistas, testes e acompanhamentos
              </p>
            </div>
            <button
              onClick={() => setActiveView('calendar')}
              className="text-xs font-medium text-[#f4f5f6] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Agenda</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">
                Nenhuma atividade pendente. Você está em dia!
              </div>
            ) : (
              upcomingEvents.map((evt) => {
                const isInterview = evt.type === 'entrevista';
                const isTest = evt.type === 'teste_tecnico';

                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-lg border-[#25272b]/80 dark:border-[#25272b]/80 light:border-neutral-200 bg-[#202226] dark:bg-[#202226] light:bg-neutral-50 hover:border-neutral-500/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isInterview
                                ? 'bg-[#3FBF8A]'
                                : isTest
                                ? 'bg-[#e5a93b]'
                                : 'bg-[#3FBF8A]'
                            }`}
                          />
                          <h4 className="text-xs font-medium text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 truncate">
                            {evt.title}
                          </h4>
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5 truncate">
                          {evt.company} · {evt.role}
                        </p>
                      </div>

                      {/* Quick check complete */}
                      <button
                        onClick={() => toggleEventCompleted(evt.id)}
                        className="p-1 rounded text-neutral-400 hover:text-[#3FBF8A] hover:bg-white/5 transition-colors shrink-0"
                        title="Marcar como concluída"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs tabular-nums text-neutral-400 dark:text-[#a1a4aa] mt-2 pt-2 border-t border-[#25272b]/40 dark:border-[#25272b]/40 light:border-neutral-200">
                      <span>
                        {formatDatePT(evt.date)} às {evt.time}
                      </span>
                      {evt.meetingUrl && (
                        <a
                          href={evt.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#f4f5f6] hover:underline"
                        >
                          <span>Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <button
              onClick={() => setActiveView('calendar')}
              className="w-full py-2 rounded-md border border-dashed border-[#25272b] dark:border-[#25272b] light:border-neutral-300 text-xs text-neutral-400 hover:text-neutral-200 dark:text-[#a1a4aa] hover:border-[#5a5d63] transition-colors"
            >
              + Adicionar evento na agenda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
