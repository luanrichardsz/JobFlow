import React from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Columns3,
  CalendarDays,
  BarChart3,
  Settings,
  Database,
  Github,
  X,
} from 'lucide-react';
import { ActiveView } from '../../types';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const {
    activeView,
    setActiveView,
    setIsNewApplicationModalOpen,
    applications,
    events,
    isLoading,
    supabaseConnected,
  } = useJobContext();

  const pendingEventsCount = events.filter((e) => !e.completed).length;

  const navItems: {
    id: ActiveView | 'new_modal';
    label: string;
    icon: React.ElementType;
    badge?: number;
    onClick?: () => void;
  }[] = [
    {
      id: 'dashboard',
      label: 'Visão geral',
      icon: LayoutDashboard,
    },
    {
      id: 'applications',
      label: 'Minhas candidaturas',
      icon: Briefcase,
      badge: applications.length,
    },
    {
      id: 'new_modal',
      label: 'Nova candidatura',
      icon: PlusCircle,
      onClick: () => {
        setIsNewApplicationModalOpen(true);
        setMobileOpen(false);
      },
    },
    {
      id: 'kanban',
      label: 'Kanban',
      icon: Columns3,
    },
    {
      id: 'calendar',
      label: 'Agenda',
      icon: CalendarDays,
      badge: pendingEventsCount > 0 ? pendingEventsCount : undefined,
    },
    {
      id: 'stats',
      label: 'Estatísticas',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
    },
  ];

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.id !== 'new_modal') {
      setActiveView(item.id as ActiveView);
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 border-r bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] dark:bg-[#0b0c0e] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-[#FAFAFB] light:border-neutral-200 light:text-neutral-900 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top brand */}
        <div className="flex flex-col">
          <div className="h-14 flex items-center justify-between px-4 border-b border-[#25272b] dark:border-[#25272b] light:border-neutral-200">
            <div className="flex items-center gap-2.5">
              {/* JobFlow mark: the pipeline, three stages stepping up to the offer */}
              <img
                src="/icon.png"
                alt="JobFlow"
                className="w-6 h-6 object-contain"
              />
              <span className="font-semibold text-sm tracking-tight">JobFlow</span>
            </div>

            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded lg:hidden text-neutral-400 hover:text-neutral-200"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-2 pb-1.5 text-xs font-medium text-[#a1a4aa] dark:text-[#a1a4aa] light:text-neutral-500">
              Workspace
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isNewBtn = item.id === 'new_modal';

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.05] text-white'
                      : 'text-[#a1a4aa] hover:text-[#f4f5f6] hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#7d8086]'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-xs tabular-nums px-1.5 py-0.2 rounded-full tabular-nums ${
                        isActive
                          ? 'bg-[#2a2c30] text-white'
                          : 'bg-white/10 dark:bg-white/10 light:bg-neutral-200 text-neutral-400 dark:text-neutral-300 light:text-neutral-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom indicator & GitHub open source */}
        <div className="p-3 border-t border-[#25272b] dark:border-[#25272b] light:border-neutral-200 space-y-2">
          {/* Supabase Cloud status badge */}
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-[#16181b] dark:bg-[#16181b] light:bg-neutral-100 text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 border border-[#25272b] dark:border-[#25272b] light:border-neutral-200">
            <Database
              className={`w-3.5 h-3.5 shrink-0 ${
                supabaseConnected
                  ? 'text-[#3FBF8A]'
                  : isLoading
                  ? 'text-[#a1a4aa]'
                  : 'text-[#e5a93b]'
              }`}
            />
            <div className="truncate">
              <span className="block font-medium text-xs text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
                Supabase Cloud
              </span>
              <span className="block text-xs truncate">
                {isLoading
                  ? 'Sincronizando...'
                  : supabaseConnected
                  ? 'Sincronizado'
                  : 'Verificar tabelas SQL'}
              </span>
            </div>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Github className="w-3.5 h-3.5" />
              <span>Open Source v1.2</span>
            </div>
            <span className="text-xs tabular-nums text-neutral-500">MIT</span>
          </a>
        </div>
      </aside>
    </>
  );
};
