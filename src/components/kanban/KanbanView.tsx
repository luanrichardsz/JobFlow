import React, { useState, useMemo } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  Plus,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  MODALITY_CONFIG,
  formatDatePT,
} from '../../utils/formatters';
import { ApplicationStatus, JobApplication } from '../../types';

interface KanbanColumnDef {
  id: string;
  title: string;
  statuses: ApplicationStatus[];
  color: string;
  defaultStatus: ApplicationStatus;
}

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'candidatado',
    title: 'Candidatado',
    statuses: ['candidatado'],
    color: '#6b6e74',
    defaultStatus: 'candidatado',
  },
  {
    id: 'em_analise',
    title: 'Em análise',
    statuses: ['em_analise'],
    color: '#a1a4aa',
    defaultStatus: 'em_analise',
  },
  {
    id: 'entrevista',
    title: 'Entrevista',
    statuses: ['entrevista'],
    color: '#e5a93b',
    defaultStatus: 'entrevista',
  },
  {
    id: 'teste_tecnico',
    title: 'Teste técnico',
    statuses: ['teste_tecnico'],
    color: '#e5a93b',
    defaultStatus: 'teste_tecnico',
  },
  {
    id: 'proposta',
    title: 'Proposta',
    statuses: ['proposta'],
    color: '#3FBF8A',
    defaultStatus: 'proposta',
  },
  {
    id: 'finalizado',
    title: 'Finalizado',
    statuses: ['aprovado', 'reprovado', 'desistencia'],
    color: '#6b6e74',
    defaultStatus: 'aprovado',
  },
  {
    id: 'sem_resposta',
    title: 'Sem resposta',
    statuses: ['sem_resposta'],
    color: '#6b6e74',
    defaultStatus: 'sem_resposta',
  },
];

const NEXT_STAGE_MAP: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  candidatado: 'em_analise',
  em_analise: 'entrevista',
  entrevista: 'teste_tecnico',
  teste_tecnico: 'proposta',
  proposta: 'aprovado',
};

export const KanbanView: React.FC = () => {
  const {
    applications,
    updateStatus,
    setSelectedApplicationId,
    setIsNewApplicationModalOpen,
  } = useJobContext();

  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile active stage tab: defaults to the first column with items, or 'candidatado'
  const [mobileStageId, setMobileStageId] = useState<string>(() => {
    const firstWithItems = KANBAN_COLUMNS.find((col) =>
      applications.some((a) => col.statuses.includes(a.status))
    );
    return firstWithItems ? firstWithItems.id : 'candidatado';
  });

  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase();
    return applications.filter(
      (app) =>
        app.company.toLowerCase().includes(q) ||
        app.role.toLowerCase().includes(q) ||
        app.technologies.some((t) => t.toLowerCase().includes(q))
    );
  }, [applications, searchQuery]);

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAppId(appId);
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setActiveDropColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setActiveDropColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, column: KanbanColumnDef) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    setActiveDropColumn(null);
    setDraggedAppId(null);

    if (!appId) return;

    const currentApp = applications.find((a) => a.id === appId);
    if (!currentApp) return;

    if (column.statuses.includes(currentApp.status)) {
      return;
    }

    updateStatus(appId, column.defaultStatus, `Movido para "${column.title}" no Kanban.`);
  };

  const formatShortDate = (dateStr: string) => {
    const full = formatDatePT(dateStr);
    // Remove the year (e.g. "05 Nov 2026" -> "05 Nov") so it never truncates to "05..."
    return full.replace(/\s+\d{4}$/, '');
  };

  const renderKanbanCard = (app: JobApplication, isMobile = false) => {
    const statusCfg = STATUS_CONFIG[app.status];
    const priorityCfg = PRIORITY_CONFIG[app.priority];
    const modalityCfg = MODALITY_CONFIG[app.modality];
    const isDragging = draggedAppId === app.id;

    return (
      <div
        key={app.id}
        draggable={!isMobile}
        onDragStart={(e) => !isMobile && handleDragStart(e, app.id)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedApplicationId(app.id)}
        className={`p-2.5 rounded-lg border transition-colors min-w-0 flex flex-col justify-between bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900 hover:border-neutral-500 ${
          !isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
      >
        <div>
          {/* Top bar: Avatar on left, Modality + Priority on right */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div
              className="w-5 h-5 rounded flex items-center justify-center font-semibold text-[11px] shrink-0"
              style={{
                backgroundColor: (app.companyLogoColor || '#a1a4aa') + '24',
                color: app.companyLogoColor || '#a1a4aa',
              }}
            >
              {app.company.substring(0, 2).toUpperCase()}
            </div>

            <div className="flex items-center gap-1 min-w-0">
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded ${modalityCfg.bg} ${modalityCfg.text} truncate`}
              >
                {modalityCfg.label}
              </span>
              <span
                className={`text-[11px] tabular-nums px-1 py-0.2 rounded border ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border} shrink-0`}
                title={`Prioridade ${priorityCfg.label}`}
              >
                {priorityCfg.indicator}
              </span>
            </div>
          </div>

          {/* Company Name: full width of the card, up to 2 lines so it doesn't get cut */}
          <h3
            className="font-semibold text-xs leading-snug text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 line-clamp-2 break-words mb-1"
            title={app.company}
          >
            {app.company}
          </h3>

          {/* Role */}
          <p
            className="text-[11px] leading-snug text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 line-clamp-2 mb-2"
            title={app.role}
          >
            {app.role}
          </p>
        </div>

        <div>
          {/* Quick Status Selector */}
          <div
            className="mb-2"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <select
              value={app.status}
              aria-label={`Alterar fase de ${app.company}`}
              onChange={(e) => {
                const nextStatus = e.target.value as ApplicationStatus;
                if (nextStatus !== app.status) {
                  updateStatus(
                    app.id,
                    nextStatus,
                    `Fase alterada para "${STATUS_CONFIG[nextStatus].label}" no Kanban.`
                  );
                }
              }}
              className={`w-full px-1.5 py-1 rounded text-[11px] font-medium border cursor-pointer outline-hidden ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
            >
              <option value="candidatado" className="bg-[#16181b] text-[#f4f5f6]">
                Candidatado
              </option>
              <option value="em_analise" className="bg-[#16181b] text-[#f4f5f6]">
                Em análise
              </option>
              <option value="entrevista" className="bg-[#16181b] text-[#f4f5f6]">
                Entrevista
              </option>
              <option value="teste_tecnico" className="bg-[#16181b] text-[#f4f5f6]">
                Teste técnico
              </option>
              <option value="proposta" className="bg-[#16181b] text-[#f4f5f6]">
                Proposta
              </option>
              <option value="aprovado" className="bg-[#16181b] text-[#f4f5f6]">
                Aprovado
              </option>
              <option value="reprovado" className="bg-[#16181b] text-[#f4f5f6]">
                Reprovado
              </option>
              <option value="sem_resposta" className="bg-[#16181b] text-[#f4f5f6]">
                Sem resposta
              </option>
              <option value="desistencia" className="bg-[#16181b] text-[#f4f5f6]">
                Desistência
              </option>
            </select>
          </div>

          {/* Tech tags (full width row) */}
          {app.technologies.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-2 overflow-hidden">
              {app.technologies.slice(0, 2).map((tech) => (
                <span
                  key={tech}
                  className="text-[11px] tabular-nums px-1.5 py-0.2 rounded bg-neutral-500/10 text-neutral-400 truncate max-w-full"
                >
                  {tech}
                </span>
              ))}
              {app.technologies.length > 2 && (
                <span className="text-[11px] tabular-nums text-neutral-500">
                  +{app.technologies.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Footer date */}
          <div className="flex items-center justify-between gap-1 text-[11px] tabular-nums text-neutral-500 pt-1.5 border-t border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-100">
            <span title={`Última atualização: ${formatDatePT(app.updatedDate)}`} className="shrink-0">
              {formatShortDate(app.updatedDate)}
            </span>
            <span className="text-[11px] text-neutral-400 truncate">
              {app.activityHistory.length} {app.activityHistory.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const activeMobileColIndex = KANBAN_COLUMNS.findIndex((c) => c.id === mobileStageId);
  const activeMobileCol = KANBAN_COLUMNS[activeMobileColIndex] || KANBAN_COLUMNS[0];
  const activeMobileApps = filteredApplications.filter((a) =>
    activeMobileCol.statuses.includes(a.status)
  );

  return (
    <div className="space-y-4 max-w-full pb-12">
      {/* View Header + Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Kanban de candidaturas
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
            Arraste os cards entre as colunas para atualizar a fase do processo seletivo.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar no Kanban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900 placeholder:text-neutral-500 focus:outline-hidden focus:border-[#5a5d63]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-200"
                aria-label="Limpar busca"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsNewApplicationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova vaga</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MOBILE VIEW (< 768px): Stage Pills Bar + 2-by-2 / Vertical List
          ===================================================================== */}
      <div className="md:hidden space-y-3">
        {/* Stage Tabs / Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1">
          {KANBAN_COLUMNS.map((col) => {
            const count = filteredApplications.filter((a) =>
              col.statuses.includes(a.status)
            ).length;
            const isSelected = col.id === activeMobileCol.id;

            return (
              <button
                key={col.id}
                onClick={() => setMobileStageId(col.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-[#2a2c30] border-[#5a5d63] text-white'
                    : 'bg-[#16181b] border-[#25272b] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: col.color }}
                />
                <span>{col.title}</span>
                <span
                  className={`text-xs tabular-nums px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/15 text-white'
                      : 'bg-white/5 text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Mobile Stage Panel */}
        <div className="rounded-xl border border-[#25272b] bg-[#0b0c0e] dark:border-[#25272b] dark:bg-[#0b0c0e] light:border-neutral-200 light:bg-neutral-50 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-200 bg-[#16181b]/50">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeMobileCol.color }}
              />
              <h2 className="text-xs font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
                {activeMobileCol.title}
              </h2>
              <span className="text-xs tabular-nums px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-400">
                {activeMobileApps.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activeMobileColIndex <= 0}
                onClick={() =>
                  activeMobileColIndex > 0 &&
                  setMobileStageId(KANBAN_COLUMNS[activeMobileColIndex - 1].id)
                }
                className="p-1 rounded border border-[#25272b] text-neutral-400 hover:text-white disabled:opacity-30"
                aria-label="Etapa anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={activeMobileColIndex >= KANBAN_COLUMNS.length - 1}
                onClick={() =>
                  activeMobileColIndex < KANBAN_COLUMNS.length - 1 &&
                  setMobileStageId(KANBAN_COLUMNS[activeMobileColIndex + 1].id)
                }
                className="p-1 rounded border border-[#25272b] text-neutral-400 hover:text-white disabled:opacity-30"
                aria-label="Próxima etapa"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-2.5">
            {activeMobileApps.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 italic">
                Nenhuma vaga nesta etapa
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {activeMobileApps.map((app) => renderKanbanCard(app, true))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          DESKTOP VIEW (>= 768px):
          Fixed side-by-side columns (no section scroll), 2-by-2 cards inside
          ===================================================================== */}
      <div className="hidden md:flex gap-2.5 pt-1 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colApps = filteredApplications.filter((a) =>
            col.statuses.includes(a.status)
          );
          const isDropActive = activeDropColumn === col.id;
          const hasCards = colApps.length > 0;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
              className={`min-w-0 rounded-xl flex flex-col border transition-colors duration-150 ${
                hasCards ? 'flex-[1.35]' : 'flex-[0.75]'
              } ${
                isDropActive
                  ? 'border-[#5a5d63] bg-white/[0.06]'
                  : 'border-[#25272b] bg-[#0b0c0e] dark:border-[#25272b] dark:bg-[#0b0c0e] light:border-neutral-200 light:bg-neutral-50'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-200">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-xs font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 truncate">
                    {col.title}
                  </span>
                  <span className="text-xs tabular-nums px-1.5 py-0.2 rounded-full bg-white/10 dark:bg-white/10 light:bg-neutral-200 text-neutral-400 shrink-0">
                    {colApps.length}
                  </span>
                </div>

                <button
                  onClick={() => setIsNewApplicationModalOpen(true)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-white/5 shrink-0"
                  title={`Adicionar vaga em ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards Body (No internal scroll, 2-by-2 Grid) */}
              <div className="p-2">
                {colApps.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 italic">
                    Nenhuma vaga nesta etapa
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {colApps.map((app) => renderKanbanCard(app, false))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
