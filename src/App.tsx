import React, { useState } from 'react';
import { JobProvider, useJobContext } from './context/JobContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ApplicationsListView } from './components/applications/ApplicationsListView';
import { ApplicationFormModal } from './components/applications/ApplicationFormModal';
import { ApplicationDetailModal } from './components/applications/ApplicationDetailModal';
import { KanbanView } from './components/kanban/KanbanView';
import { CalendarView } from './components/calendar/CalendarView';
import { StatsView } from './components/stats/StatsView';
import { SettingsView } from './components/settings/SettingsView';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastContainer } from './components/common/ToastContainer';

const MainLayout: React.FC = () => {
  const { activeView, supabaseError, refreshFromSupabase } = useJobContext();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c0e] text-[#f4f5f6] dark:bg-[#0b0c0e] dark:text-[#f4f5f6] light:bg-[#F8F9FA] light:text-neutral-900 transition-colors duration-150">
      {/* Sidebar (Desktop collapsible & Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        desktopOpen={desktopSidebarOpen}
        setDesktopOpen={setDesktopSidebarOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ${
          desktopSidebarOpen ? 'lg:ml-60' : 'lg:ml-0'
        }`}
      >
        <Header
          setMobileOpen={setMobileSidebarOpen}
          desktopOpen={desktopSidebarOpen}
          setDesktopOpen={setDesktopSidebarOpen}
        />

        {supabaseError && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3.5 rounded-lg border border-[#4a3c1c] bg-[#2b2414] text-xs text-[#e5a93b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>{supabaseError}</span>
            <button
              onClick={() => void refreshFromSupabase()}
              className="px-3 py-1 rounded bg-[#202226] text-[#f4f5f6] hover:bg-[#2a2c30] font-medium self-start sm:self-auto shrink-0"
            >
              Reconectar
            </button>
          </div>
        )}

        <main
          className={`flex-1 max-w-full ${
            activeView === 'kanban' ? 'p-3 sm:p-4 lg:p-5' : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'applications' && <ApplicationsListView />}
          {activeView === 'kanban' && <KanbanView />}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'stats' && <StatsView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals & System Overlays */}
      <ApplicationDetailModal />
      <ApplicationFormModal />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <JobProvider>
      <MainLayout />
    </JobProvider>
  );
}
