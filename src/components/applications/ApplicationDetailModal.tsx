import React, { useState } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  X,
  ExternalLink,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  DollarSign,
  FileText,
  Tag,
  CheckCircle2,
  Send,
  PlusCircle,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import {
  STATUS_CONFIG,
  MODALITY_CONFIG,
  PRIORITY_CONFIG,
  formatDatePT,
} from '../../utils/formatters';
import { ApplicationStatus } from '../../types';

export const ApplicationDetailModal: React.FC = () => {
  const {
    selectedApplicationId,
    setSelectedApplicationId,
    setEditingApplicationId,
    deleteApplication,
    applications,
    updateStatus,
    addActivityToApplication,
  } = useJobContext();

  const app = applications.find((a) => a.id === selectedApplicationId);

  // Status update state
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('em_analise');
  const [statusNote, setStatusNote] = useState('');

  // Personal note state
  const [personalNoteText, setPersonalNoteText] = useState('');

  if (!app) return null;

  const statusCfg = STATUS_CONFIG[app.status];
  const modalityCfg = MODALITY_CONFIG[app.modality];
  const priorityCfg = PRIORITY_CONFIG[app.priority];

  const handleStatusChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStatus(app.id, newStatus, statusNote.trim() || undefined);
    setStatusNote('');
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalNoteText.trim()) return;

    addActivityToApplication(app.id, {
      title: 'Anotação registrada',
      description: personalNoteText.trim(),
      type: 'note',
    });
    setPersonalNoteText('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 overflow-y-auto"
      onClick={() => setSelectedApplicationId(null)}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-6 bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#25272b] dark:border-[#25272b] light:border-neutral-200">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0 mt-0.5"
              style={{ backgroundColor: (app.companyLogoColor || '#a1a4aa') + '24', color: app.companyLogoColor || '#a1a4aa' }}
            >
              {app.company.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 truncate">
                  {app.company}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
                {app.role}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {app.jobUrl && (
              <a
                href={app.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium border-[#25272b] hover:bg-white/5 transition-colors text-neutral-300 hover:text-white"
                title="Abrir vaga original"
              >
                <span>Vaga original</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={() => {
                setEditingApplicationId(app.id);
                setSelectedApplicationId(null);
              }}
              className="p-1.5 rounded-lg border border-[#25272b] text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors"
              title="Editar candidatura"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              onClick={() => deleteApplication(app.id)}
              className="p-1.5 rounded-lg border border-[#25272b] text-neutral-400 hover:text-[#e5484d] hover:bg-white/5 transition-colors"
              title="Excluir candidatura"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedApplicationId(null)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-white/5 ml-1"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* SEÇÃO 1: Resumo da oportunidade */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#f4f5f6]">
              Resumo da oportunidade
            </h3>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#202226] border-[#25272b]/80 text-xs">
              <div>
                <span className="text-xs text-neutral-500 block">Modalidade</span>
                <span className={`font-medium ${modalityCfg.text}`}>{modalityCfg.label}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Contratação</span>
                <span className="text-neutral-300">{app.contractType}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Salário estimado</span>
                <span className="text-neutral-300 tabular-nums">
                  {app.salaryRange || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Plataforma</span>
                <span className="text-neutral-300">{app.platform}</span>
              </div>
            </div>

            <div className="text-xs text-neutral-400 space-y-1">
              <div>
                <span className="text-neutral-500 mr-1.5">Localização:</span>
                <span className="text-neutral-300">{app.location}</span>
              </div>
              <div>
                <span className="text-neutral-500 mr-1.5">Versão do currículo:</span>
                <span className="text-neutral-300">{app.cvVersion}</span>
              </div>
            </div>

            {/* Technologies */}
            <div>
              <span className="text-xs text-neutral-400 block mb-1.5">Stack e tecnologias:</span>
              <div className="flex flex-wrap gap-1.5">
                {app.technologies.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded text-xs bg-white/5 border border-[#25272b] text-neutral-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            {app.description && (
              <div className="pt-2">
                <span className="text-xs text-neutral-400 block mb-1">Descrição da vaga:</span>
                <p className="text-xs text-neutral-300 bg-[#0b0c0e]/30 p-3 rounded-lg border border-[#25272b]/60 leading-relaxed whitespace-pre-wrap">
                  {app.description}
                </p>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: Atualizar Status */}
          <div className="p-4 rounded-xl bg-[#202226] border-[#25272b] space-y-3">
            <h3 className="text-sm font-medium text-[#f4f5f6]">
              Atualizar etapa / status do processo
            </h3>

            <form onSubmit={handleStatusChangeSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-2.5 py-1.5 rounded-lg border text-xs bg-[#16181b] border-[#25272b] text-neutral-200 outline-hidden"
                  >
                    <option value="candidatado" className="bg-[#16181b]">Candidatado</option>
                    <option value="em_analise" className="bg-[#16181b]">Em análise</option>
                    <option value="entrevista" className="bg-[#16181b]">Entrevista</option>
                    <option value="teste_tecnico" className="bg-[#16181b]">Teste técnico</option>
                    <option value="proposta" className="bg-[#16181b]">Proposta</option>
                    <option value="aprovado" className="bg-[#16181b]">Aprovado</option>
                    <option value="reprovado" className="bg-[#16181b]">Reprovado</option>
                    <option value="sem_resposta" className="bg-[#16181b]">Sem resposta</option>
                    <option value="desistencia" className="bg-[#16181b]">Desistência</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Observação opcional sobre a mudança (ex: chamada marcada para quarta)..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border text-xs bg-[#16181b] border-[#25272b] text-neutral-200 placeholder:text-neutral-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors"
                >
                  Salvar novo status
                </button>
              </div>
            </form>
          </div>

          {/* SEÇÃO 3: Anotações pessoais */}
          <div className="p-4 rounded-xl bg-[#202226] border-[#25272b] space-y-3">
            <h3 className="text-sm font-medium text-[#f4f5f6]">
              Anotações pessoais & feedback
            </h3>

            {app.notes && (
              <div className="p-3 rounded-lg bg-[#16181b] border border-[#25272b] text-xs text-neutral-300 leading-relaxed">
                <span className="text-xs text-neutral-500 block mb-1">Anotação fixada:</span>
                {app.notes}
              </div>
            )}

            <form onSubmit={handleAddNoteSubmit} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Adicione um novo registro (perguntas feitas, feedback recebido, impressões)..."
                value={personalNoteText}
                onChange={(e) => setPersonalNoteText(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-xs bg-[#16181b] border-[#25272b] text-neutral-200 placeholder:text-neutral-500 outline-hidden resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!personalNoteText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3 h-3" />
                  <span>Adicionar ao histórico</span>
                </button>
              </div>
            </form>
          </div>

          {/* SEÇÃO 4: Histórico de atividades (Vertical Timeline) */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#f4f5f6]">
              Histórico de atividades & timeline
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#25272b]">
              {app.activityHistory.map((item) => {
                const isInterview = item.type === 'interview';
                const isTest = item.type === 'test';
                const isStatus = item.type === 'status_change';

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline bullet dot */}
                    <div
                      className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-[#16181b] ${
                        isInterview
                          ? 'bg-[#3FBF8A]'
                          : isTest
                          ? 'bg-[#e5a93b]'
                          : isStatus
                          ? 'bg-[#3FBF8A]'
                          : 'bg-neutral-400'
                      }`}
                    />

                    <div className="p-3 rounded-lg border-[#25272b]/80 bg-[#202226] text-xs space-y-1">
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span className="font-semibold text-neutral-200">{item.title}</span>
                        <span>
                          {formatDatePT(item.date)}
                          {item.time ? ` às ${item.time}` : ''}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-neutral-400 text-xs leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
