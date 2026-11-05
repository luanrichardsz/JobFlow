import React, { useState, useRef, useEffect } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  Menu,
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  Check,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronRight,
  Trash2,
} from 'lucide-react';

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileOpen }) => {
  const {
    activeView,
    setActiveView,
    setCommandPaletteOpen,
    setIsNewApplicationModalOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    theme,
    resolvedTheme,
    setTheme,
    setSelectedApplicationId,
  } = useJobContext();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // View title translation
  const viewTitles: Record<string, string> = {
    dashboard: 'Visão geral',
    applications: 'Minhas candidaturas',
    kanban: 'Kanban de processos',
    calendar: 'Agenda & Entrevistas',
    stats: 'Estatísticas',
    settings: 'Configurações',
  };

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-30 h-14 w-full flex items-center justify-between px-4 md:px-6 border-b bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] dark:bg-[#0b0c0e] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white/80 light:border-neutral-200 light:text-neutral-900">
      {/* Left zone: Mobile hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-md lg:hidden text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <span className="text-neutral-500 dark:text-[#a1a4aa] light:text-neutral-500 hidden sm:inline">
            JobFlow
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600 hidden sm:inline" />
          <span className="font-medium text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            {viewTitles[activeView] || 'Painel'}
          </span>
        </nav>
      </div>

      {/* Right zone: Search trigger (⌘K), New App CTA, Notifications, Theme */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search trigger button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-500 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 bg-[#16181b]/50 dark:bg-[#16181b]/50 light:bg-neutral-100/70 hover:border-neutral-500 transition-colors"
          title="Buscar ou executar comando"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Buscar vagas...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs tabular-nums rounded bg-white/10 dark:bg-white/10 light:bg-neutral-200 text-neutral-400 dark:text-neutral-300 light:text-neutral-600">
            ⌘K
          </kbd>
        </button>

        {/* Primary CTA button: + Nova candidatura */}
        <button
          onClick={() => setIsNewApplicationModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Nova candidatura</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative p-2 rounded-md text-neutral-400 hover:text-neutral-200 dark:text-[#a1a4aa] dark:hover:text-[#f4f5f6] light:text-neutral-600 light:hover:text-neutral-900 hover:bg-white/5 transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3FBF8A]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl overflow-hidden z-50 bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#25272b] dark:border-[#25272b] light:border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-white/[0.06] text-[#f4f5f6] tabular-nums">
                      {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="p-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded"
                      title="Marcar todas como lidas"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="p-1 text-xs text-neutral-400 hover:text-[#e5484d] hover:bg-white/5 rounded"
                      title="Limpar histórico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#25272b]/50 dark:divide-[#25272b]/50 light:divide-neutral-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    Nenhuma notificação no momento
                  </div>
                ) : (
                  notifications.map((notif) => {
                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          if (notif.applicationId) {
                            setSelectedApplicationId(notif.applicationId);
                            setNotificationsOpen(false);
                          } else if (notif.type === 'interview' || notif.id.startsWith('notif_evt_')) {
                            setActiveView('calendar');
                            setNotificationsOpen(false);
                          }
                        }}
                        className={`p-3 text-xs transition-colors cursor-pointer hover:bg-white/5 ${
                          !notif.read ? 'bg-white/[0.06]' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {notif.type === 'interview' ? (
                              <Calendar className="w-3.5 h-3.5 text-[#3FBF8A] mt-0.5 shrink-0" />
                            ) : notif.type === 'update' ? (
                              <Clock className="w-3.5 h-3.5 text-[#e5a93b] mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-[#e5a93b] mt-0.5 shrink-0" />
                            )}
                            <div>
                              <p className="font-medium text-xs text-[#f4f5f6]">{notif.title}</p>
                              <p className="text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 text-xs mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-neutral-500 tabular-nums shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark / Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md text-neutral-400 hover:text-neutral-200 dark:text-[#a1a4aa] dark:hover:text-[#f4f5f6] light:text-neutral-600 light:hover:text-neutral-900 hover:bg-white/5 transition-colors"
          aria-label={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          title={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
