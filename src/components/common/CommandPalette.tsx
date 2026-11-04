import React, { useState, useEffect, useRef } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  Search,
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Columns3,
  CalendarDays,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Download,
  Building2,
  X,
} from 'lucide-react';
import { ActiveView } from '../../types';

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveView,
    applications,
    setSelectedApplicationId,
    setIsNewApplicationModalOpen,
    theme,
    setTheme,
    exportDataCSV,
  } = useJobContext();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  // Navigation commands
  const navCommands = [
    {
      id: 'nav-dashboard',
      title: 'Ir para Visão geral',
      category: 'Navegação',
      icon: LayoutDashboard,
      action: () => {
        setActiveView('dashboard');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-apps',
      title: 'Ir para Minhas candidaturas',
      category: 'Navegação',
      icon: Briefcase,
      action: () => {
        setActiveView('applications');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-kanban',
      title: 'Ir para Kanban de processos',
      category: 'Navegação',
      icon: Columns3,
      action: () => {
        setActiveView('kanban');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-calendar',
      title: 'Ir para Agenda & Entrevistas',
      category: 'Navegação',
      icon: CalendarDays,
      action: () => {
        setActiveView('calendar');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-stats',
      title: 'Ir para Estatísticas',
      category: 'Navegação',
      icon: BarChart3,
      action: () => {
        setActiveView('stats');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'nav-settings',
      title: 'Ir para Configurações',
      category: 'Navegação',
      icon: Settings,
      action: () => {
        setActiveView('settings');
        setCommandPaletteOpen(false);
      },
    },
  ];

  // Action commands
  const actionCommands = [
    {
      id: 'act-new-job',
      title: 'Nova candidatura',
      category: 'Ações rápidas',
      icon: PlusCircle,
      action: () => {
        setIsNewApplicationModalOpen(true);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act-theme',
      title: theme === 'dark' ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro',
      category: 'Preferências',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'act-export',
      title: 'Exportar dados para CSV',
      category: 'Dados',
      icon: Download,
      action: () => {
        exportDataCSV();
        setCommandPaletteOpen(false);
      },
    },
  ];

  // Application search results
  const matchingApps = query.trim()
    ? applications
        .filter(
          (a) =>
            a.company.toLowerCase().includes(query.toLowerCase()) ||
            a.role.toLowerCase().includes(query.toLowerCase()) ||
            a.technologies.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 5)
        .map((app) => ({
          id: `app-${app.id}`,
          title: `${app.company} · ${app.role}`,
          category: 'Candidaturas',
          icon: Building2,
          action: () => {
            setSelectedApplicationId(app.id);
            setCommandPaletteOpen(false);
          },
        }))
    : [];

  const filteredCommands = [
    ...navCommands.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),
    ...actionCommands.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),
    ...matchingApps,
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden transition-colors bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 border-b border-[#25272b] dark:border-[#25272b] light:border-neutral-200">
          <Search className="w-4 h-4 text-neutral-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite um comando ou busque uma empresa/cargo..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full py-3.5 bg-transparent border-0 text-sm outline-hidden placeholder:text-neutral-500"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Nenhum comando ou vaga encontrada para &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-white/[0.06] text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900'
                      : 'text-neutral-300 dark:text-neutral-300 light:text-neutral-700 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-xs text-neutral-500 tabular-nums shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#25272b] dark:border-[#25272b] light:border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span>↑↓ para navegar</span>
            <span>↵ para executar</span>
            <span>ESC para fechar</span>
          </div>
          <span className="tabular-nums text-xs">JobFlow ⌘K</span>
        </div>
      </div>
    </div>
  );
};
