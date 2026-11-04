import React, { useState } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  Plus,
  MoreVertical,
  Calendar,
  Building2,
  ChevronRight,
  GripVertical,
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
    statuses: ['aprovado', 'reprovado', 'sem_resposta', 'desistencia'],
    color: '#6b6e74',
    defaultStatus: 'aprovado',
  },
];

export const KanbanView: React.FC = () => {
  const {
    applications,
    updateStatus,
    setSelectedApplicationId,
    setIsNewApplicationModalOpen,
  } = useJobContext();

  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
    setDraggedAppId(appId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  const handleDrop = (e: React.DragEvent, column: KanbanColumnDef) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    setActiveDropColumn(null);
    setDraggedAppId(null);

    if (!appId) return;

    const currentApp = applications.find((a) => a.id === appId);
    if (!currentApp) return;

    // Check if the current status is already in this column
    if (column.statuses.includes(currentApp.status)) {
      return;
    }

    // Update status to column's default status
    updateStatus(appId, column.defaultStatus, `Movido para "${column.title}" no Kanban.`);
  };

  return (
    <div className="space-y-4 max-w-full pb-12 overflow-x-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Kanban de candidaturas
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
            Arraste os cards entre as colunas para atualizar a fase do processo seletivo.
          </p>
        </div>

        <button
          onClick={() => setIsNewApplicationModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova vaga</span>
        </button>
      </div>

      {/* Columns Container */}
      <div className="flex gap-3.5 min-w-[1240px] pt-1">
        {KANBAN_COLUMNS.map((col) => {
          const colApps = applications.filter((a) => col.statuses.includes(a.status));
          const isDropActive = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
              className={`flex-1 min-w-[210px] max-w-[260px] rounded-xl flex flex-col max-h-[calc(100vh-170px)] border transition-colors ${
                isDropActive
                  ? 'border-[#5a5d63] bg-white/[0.06]'
                  : 'border-[#25272b] bg-[#0b0c0e] dark:border-[#25272b] dark:bg-[#0b0c0e] light:border-neutral-200 light:bg-neutral-50'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-200">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-xs font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
                    {col.title}
                  </span>
                  <span className="text-xs tabular-nums px-1.5 py-0.2 rounded-full bg-white/10 dark:bg-white/10 light:bg-neutral-200 text-neutral-400">
                    {colApps.length}
                  </span>
                </div>

                <button
                  onClick={() => setIsNewApplicationModalOpen(true)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                  title={`Adicionar vaga em ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards Scrollable Body */}
              <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                {colApps.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 italic">
                    Nenhuma vaga nesta etapa
                  </div>
                ) : (
                  colApps.map((app) => {
                    const priorityCfg = PRIORITY_CONFIG[app.priority];
                    const modalityCfg = MODALITY_CONFIG[app.modality];
                    const isDragging = draggedAppId === app.id;

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => setSelectedApplicationId(app.id)}
                        className={`p-3 rounded-lg border transition-colors cursor-grab active:cursor-grabbing bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900 hover:border-neutral-500 ${
                          isDragging ? 'opacity-40 scale-95' : 'opacity-100'
                        }`}
                      >
                        {/* Top: Company Avatar, Name, Priority */}
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center font-semibold text-xs shrink-0"
                              style={{ backgroundColor: (app.companyLogoColor || '#a1a4aa') + '24', color: app.companyLogoColor || '#a1a4aa' }}
                            >
                              {app.company.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-xs truncate">
                              {app.company}
                            </span>
                          </div>

                          <span
                            className={`text-xs tabular-nums px-1 py-0.2 rounded border ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border} shrink-0`}
                          >
                            {priorityCfg.indicator}
                          </span>
                        </div>

                        {/* Role */}
                        <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 line-clamp-2 mb-2">
                          {app.role}
                        </p>

                        {/* Modality & Tags */}
                        <div className="flex items-center gap-1 mb-2 overflow-hidden">
                          <span
                            className={`text-xs px-1 py-0.2 rounded ${modalityCfg.bg} ${modalityCfg.text} shrink-0`}
                          >
                            {modalityCfg.label}
                          </span>
                          {app.technologies.slice(0, 2).map((tech) => (
                            <span
                              key={tech}
                              className="text-xs tabular-nums px-1 py-0.2 rounded bg-neutral-500/10 text-neutral-400 truncate"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>

                        {/* Footer date */}
                        <div className="flex items-center justify-between text-xs tabular-nums text-neutral-500 pt-2 border-t border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-100">
                          <span>{formatDatePT(app.appliedDate)}</span>
                          <span className="text-xs text-neutral-400">
                            {app.activityHistory.length} eventos
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
