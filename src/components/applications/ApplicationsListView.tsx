import React, { useState, useMemo } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  Building2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  STATUS_CONFIG,
  MODALITY_CONFIG,
  PRIORITY_CONFIG,
  formatDatePT,
  formatRelativeTime,
} from '../../utils/formatters';
import { ApplicationStatus, Modality } from '../../types';

export const ApplicationsListView: React.FC = () => {
  const {
    applications,
    setSelectedApplicationId,
    setEditingApplicationId,
    deleteApplication,
    setIsNewApplicationModalOpen,
  } = useJobContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [modalityFilter, setModalityFilter] = useState<string>('todos');
  const [periodFilter, setPeriodFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'recent' | 'updated' | 'company'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);

  // Filter & sort logic
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCompany = app.company.toLowerCase().includes(q);
          const matchRole = app.role.toLowerCase().includes(q);
          const matchTech = app.technologies.some((t) => t.toLowerCase().includes(q));
          if (!matchCompany && !matchRole && !matchTech) return false;
        }

        // Status
        if (statusFilter !== 'todos' && app.status !== statusFilter) {
          return false;
        }

        // Modality
        if (modalityFilter !== 'todos' && app.modality !== modalityFilter) {
          return false;
        }

        // Period
        if (periodFilter !== 'todos') {
          const now = new Date();
          const days = periodFilter === '7d' ? 7 : periodFilter === '30d' ? 30 : 90;
          const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          if (new Date(app.appliedDate + 'T12:00:00') < cutoff) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
        }
        if (sortBy === 'updated') {
          return new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime();
        }
        if (sortBy === 'company') {
          return a.company.localeCompare(b.company);
        }
        return 0;
      });
  }, [applications, searchQuery, statusFilter, modalityFilter, periodFilter, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('todos');
    setModalityFilter('todos');
    setPeriodFilter('todos');
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'todos' ||
    modalityFilter !== 'todos' ||
    periodFilter !== 'todos';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Minhas candidaturas
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
            Gerencie todas as oportunidades em um só lugar.
          </p>
        </div>

        <button
          onClick={() => setIsNewApplicationModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova candidatura</span>
        </button>
      </div>

      {/* Control Bar: Search, Filters, Sorters, View Switcher */}
      <div className="p-3 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por empresa, cargo ou tecnologia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] dark:bg-[#0b0c0e] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-neutral-50 light:border-neutral-200 light:text-neutral-900 placeholder:text-neutral-500 focus:outline-hidden focus:border-[#5a5d63]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right controls: View toggle & Sort */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs border-[#25272b] dark:border-[#25272b] light:border-neutral-200 bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50">
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Ordenar candidaturas por"
                className="bg-transparent text-xs text-neutral-300 dark:text-neutral-300 light:text-neutral-700 outline-hidden cursor-pointer"
              >
                <option value="updated" className="bg-[#16181b]">
                  Última atualização
                </option>
                <option value="recent" className="bg-[#16181b]">
                  Mais recentes
                </option>
                <option value="company" className="bg-[#16181b]">
                  Empresa (A-Z)
                </option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg border border-[#25272b] dark:border-[#25272b] light:border-neutral-200 bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-100">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#2a2c30] text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Visualização em cards"
                aria-label="Visualização em cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#2a2c30] text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Visualização em tabela"
                aria-label="Visualização em tabela"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-200 text-xs">
          {/* Status selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-400 dark:text-[#a1a4aa] mr-1">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por status"
              className="px-2 py-1 rounded-md border text-xs bg-[#0b0c0e] border-[#25272b] text-neutral-300 dark:bg-[#0b0c0e] dark:border-[#25272b] dark:text-neutral-300 light:bg-neutral-50 light:border-neutral-200 light:text-neutral-800 outline-hidden"
            >
              <option value="todos" className="bg-[#16181b]">
                Todos os status
              </option>
              <option value="candidatado" className="bg-[#16181b]">
                Candidatado
              </option>
              <option value="em_analise" className="bg-[#16181b]">
                Em análise
              </option>
              <option value="entrevista" className="bg-[#16181b]">
                Entrevista
              </option>
              <option value="teste_tecnico" className="bg-[#16181b]">
                Teste técnico
              </option>
              <option value="proposta" className="bg-[#16181b]">
                Proposta
              </option>
              <option value="aprovado" className="bg-[#16181b]">
                Aprovado
              </option>
              <option value="reprovado" className="bg-[#16181b]">
                Reprovado
              </option>
              <option value="sem_resposta" className="bg-[#16181b]">
                Sem resposta
              </option>
              <option value="desistencia" className="bg-[#16181b]">
                Desistência
              </option>
            </select>
          </div>

          {/* Modality selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-400 dark:text-[#a1a4aa] mr-1">Modalidade:</span>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              aria-label="Filtrar por modalidade"
              className="px-2 py-1 rounded-md border text-xs bg-[#0b0c0e] border-[#25272b] text-neutral-300 dark:bg-[#0b0c0e] dark:border-[#25272b] dark:text-neutral-300 light:bg-neutral-50 light:border-neutral-200 light:text-neutral-800 outline-hidden"
            >
              <option value="todos" className="bg-[#16181b]">
                Todas modalidades
              </option>
              <option value="remoto" className="bg-[#16181b]">
                Remoto
              </option>
              <option value="hibrido" className="bg-[#16181b]">
                Híbrido
              </option>
              <option value="presencial" className="bg-[#16181b]">
                Presencial
              </option>
            </select>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-neutral-400 dark:text-[#a1a4aa] mr-1">Período:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              aria-label="Filtrar por período"
              className="px-2 py-1 rounded-md border text-xs bg-[#0b0c0e] border-[#25272b] text-neutral-300 dark:bg-[#0b0c0e] dark:border-[#25272b] dark:text-neutral-300 light:bg-neutral-50 light:border-neutral-200 light:text-neutral-800 outline-hidden"
            >
              <option value="todos" className="bg-[#16181b]">
                Todo o período
              </option>
              <option value="7d" className="bg-[#16181b]">
                Últimos 7 dias
              </option>
              <option value="30d" className="bg-[#16181b]">
                Últimos 30 dias
              </option>
              <option value="90d" className="bg-[#16181b]">
                Últimos 90 dias
              </option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 underline decoration-dotted transition-colors ml-auto"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Applications Content: Grid or Table */}
      {filteredApplications.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-3">
          <Building2 className="w-10 h-10 text-neutral-500 mx-auto" />
          <h3 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Nenhuma candidatura encontrada
          </h3>
          <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de busca.'
              : 'Você ainda não cadastrou nenhuma candidatura. Comece adicionando sua primeira vaga.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-[#25272b] text-[#f4f5f6] hover:bg-white/5"
            >
              Resetar filtros
            </button>
          ) : (
            <button
              onClick={() => setIsNewApplicationModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5]"
            >
              + Cadastrar primeira vaga
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((app) => {
            const statusCfg = STATUS_CONFIG[app.status];
            const modalityCfg = MODALITY_CONFIG[app.modality];
            const priorityCfg = PRIORITY_CONFIG[app.priority];
            const isMenuOpen = activeMenuJobId === app.id;

            return (
              <div
                key={app.id}
                onClick={() => setSelectedApplicationId(app.id)}
                className="group relative p-4 rounded-2xl transition-colors duration-150 cursor-pointer bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 hover:bg-[#1c1f24] flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar inside Card */}
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

                    {/* Actions menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuJobId(isMenuOpen ? null : app.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                        aria-label="Opções"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-32 rounded-lg border shadow-lg py-1 z-20 bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900">
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

                  {/* Badges: Status, Modality, Priority */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
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

                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border}`}
                      title={`Prioridade ${priorityCfg.label}`}
                    >
                      {priorityCfg.indicator} {priorityCfg.label}
                    </span>
                  </div>

                  {/* Salary and Contract */}
                  {(app.salaryRange || app.contractType) && (
                    <div className="flex items-center gap-2 mt-2.5 text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600">
                      {app.contractType && (
                        <span className="text-xs bg-white/5 px-1.5 py-0.2 rounded">
                          {app.contractType}
                        </span>
                      )}
                      {app.salaryRange && (
                        <span className="text-xs tabular-nums text-neutral-300 dark:text-neutral-300 light:text-neutral-700">
                          {app.salaryRange}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Technologies tags */}
                  <div className="flex flex-wrap items-center gap-1 mt-2.5">
                    {app.technologies.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="text-xs px-1.5 py-0.2 rounded bg-neutral-500/10 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-300 light:text-neutral-600"
                      >
                        {tech}
                      </span>
                    ))}
                    {app.technologies.length > 4 && (
                      <span className="text-xs text-neutral-500">
                        +{app.technologies.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-500 mt-3 pt-2.5 border-t border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-100">
                  <span>{app.platform}</span>
                  <span>Atualizado {formatRelativeTime(app.updatedDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Linear High Density) */
        <div className="rounded-2xl overflow-hidden bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#25272b] dark:border-[#25272b] light:border-neutral-200 bg-[#0b0c0e]/40 text-neutral-400 dark:text-[#a1a4aa]">
                  <th className="py-2.5 px-4 font-medium">Empresa & Cargo</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Modalidade</th>
                  <th className="py-2.5 px-4 font-medium">Plataforma</th>
                  <th className="py-2.5 px-4 font-medium">Salário</th>
                  <th className="py-2.5 px-4 font-medium">Candidatura</th>
                  <th className="py-2.5 px-4 font-medium">Atualizado</th>
                  <th className="py-2.5 px-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25272b]/50 dark:divide-[#25272b]/50 light:divide-neutral-100">
                {filteredApplications.map((app) => {
                  const statusCfg = STATUS_CONFIG[app.status];
                  const modalityCfg = MODALITY_CONFIG[app.modality];

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApplicationId(app.id)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      {/* Empresa & Cargo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center font-semibold text-xs shrink-0"
                            style={{ backgroundColor: (app.companyLogoColor || '#a1a4aa') + '24', color: app.companyLogoColor || '#a1a4aa' }}
                          >
                            {app.company.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 group-hover:underline transition-colors">
                              {app.company}
                            </span>
                            <span className="block text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600">
                              {app.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Modalidade */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${modalityCfg.bg} ${modalityCfg.text}`}
                        >
                          {modalityCfg.label}
                        </span>
                      </td>

                      {/* Plataforma */}
                      <td className="py-3 px-4 text-neutral-400 dark:text-[#a1a4aa] text-xs">
                        {app.platform}
                      </td>

                      {/* Salário */}
                      <td className="py-3 px-4 text-neutral-300 dark:text-neutral-300 light:text-neutral-700 text-xs tabular-nums">
                        {app.salaryRange || '—'}
                      </td>

                      {/* Data Candidatura */}
                      <td className="py-3 px-4 text-neutral-400 dark:text-[#a1a4aa] text-xs">
                        {formatDatePT(app.appliedDate)}
                      </td>

                      {/* Atualizado */}
                      <td className="py-3 px-4 text-neutral-400 dark:text-[#a1a4aa] text-xs">
                        {formatRelativeTime(app.updatedDate)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedApplicationId(app.id)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-white/10"
                            title="Visualizar detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingApplicationId(app.id)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-white/10"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteApplication(app.id)}
                            className="p-1 rounded text-neutral-400 hover:text-[#e5484d] hover:bg-white/10"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
