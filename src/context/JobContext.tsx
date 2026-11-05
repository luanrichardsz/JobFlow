import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  JobApplication,
  CalendarEvent,
  CVVersion,
  AppNotification,
  ActiveView,
  ApplicationStatus,
  ActivityEvent,
  PendingScheduleDraft,
} from '../types';
import {
  supabase,
  isSupabaseConfigured,
  mapRowToApplication,
  mapApplicationToRow,
  mapRowToEvent,
  mapEventToRow,
  mapRowToCV,
  mapCVToRow,
  mapRowToNotification,
  mapNotificationToRow,
  DbJobApplicationRow,
  DbCalendarEventRow,
  DbCVVersionRow,
  DbNotificationRow,
} from '../lib/supabase';
import {
  computeSmartNotifications,
  getDismissedNotificationIds,
  addDismissedNotificationIds,
  clearDismissedNotificationIds,
} from '../utils/smartNotifications';
import {
  isGoogleCalendarConfigured,
  getStoredGoogleToken,
  clearStoredGoogleToken,
  requestGoogleCalendarToken,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  openInGoogleCalendar,
} from '../utils/calendarSync';
import { hasEventPassed } from '../utils/formatters';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface JobContextType {
  applications: JobApplication[];
  events: CalendarEvent[];
  cvVersions: CVVersion[];
  notifications: AppNotification[];
  isLoading: boolean;
  supabaseConnected: boolean;
  supabaseError: string | null;
  refreshFromSupabase: () => Promise<void>;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedApplicationId: string | null;
  setSelectedApplicationId: (id: string | null) => void;
  editingApplicationId: string | null;
  setEditingApplicationId: (id: string | null) => void;
  isNewApplicationModalOpen: boolean;
  setIsNewApplicationModalOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  pendingScheduleDraft: PendingScheduleDraft | null;
  setPendingScheduleDraft: (draft: PendingScheduleDraft | null) => void;
  theme: 'dark' | 'light' | 'system';
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;

  // CRUD Application
  addApplication: (app: Omit<JobApplication, 'id' | 'activityHistory'>) => void;
  updateApplication: (id: string, updates: Partial<JobApplication>) => void;
  deleteApplication: (id: string) => void;
  updateStatus: (id: string, newStatus: ApplicationStatus, note?: string) => void;
  addActivityToApplication: (
    id: string,
    activity: Omit<ActivityEvent, 'id' | 'date' | 'time'> & { date?: string; time?: string }
  ) => void;

  // Events
  addEvent: (
    event: Omit<CalendarEvent, 'id'>,
    options?: { openGoogleUrlFallback?: boolean }
  ) => void;
  updateEvent: (
    id: string,
    updates: Partial<CalendarEvent>,
    options?: { openGoogleUrlFallback?: boolean }
  ) => void;
  deleteEvent: (id: string) => void;
  toggleEventCompleted: (id: string) => void;

  // Google Calendar integration
  isGoogleCalendarConfigured: boolean;
  googleCalendarConnected: boolean;
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => void;
  syncEventToGoogleCalendar: (eventId: string) => Promise<void>;

  // CVs
  addCVVersion: (cv: Omit<CVVersion, 'id'>) => void;
  deleteCVVersion: (id: string) => void;

  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Data management
  exportDataJSON: () => void;
  exportDataCSV: () => void;
  importDataJSON: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
}

const STORAGE_KEY = 'jobflow_data_v1';
const LEGACY_STORAGE_KEY = 'job_tracker_data_v2';

const JobContext = createContext<JobContextType | undefined>(undefined);

export const JobProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cvVersions, setCvVersions] = useState<CVVersion[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(() =>
    Boolean(getStoredGoogleToken())
  );

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [isNewApplicationModalOpen, setIsNewApplicationModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [pendingScheduleDraft, setPendingScheduleDraft] = useState<PendingScheduleDraft | null>(
    null
  );

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    try {
      const storedTheme =
        localStorage.getItem(`${STORAGE_KEY}_theme`) ||
        localStorage.getItem(`${LEGACY_STORAGE_KEY}_theme`);
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        return storedTheme;
      }
    } catch (e) {
      console.error('Theme reading error', e);
    }
    return 'dark';
  });

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Clear any legacy localStorage mock data on startup
  useEffect(() => {
    try {
      const suffixes = ['apps', 'events', 'cvs', 'notifs'];
      for (const s of suffixes) {
        localStorage.removeItem(`${STORAGE_KEY}_${s}`);
        localStorage.removeItem(`${LEGACY_STORAGE_KEY}_${s}`);
      }
    } catch (e) {
      console.error('Failed clearing legacy storage', e);
    }
  }, []);

  // Load all data from Supabase
  const refreshFromSupabase = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      setSupabaseConnected(false);
      setSupabaseError('Credenciais VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes no .env');
      return;
    }

    setIsLoading(true);
    try {
      const [appsRes, eventsRes, cvsRes, notifsRes] = await Promise.all([
        supabase
          .from('job_applications')
          .select('*')
          .order('updated_date', { ascending: false }),
        supabase
          .from('calendar_events')
          .select('*')
          .order('date', { ascending: true }),
        supabase
          .from('cv_versions')
          .select('*')
          .order('updated_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      const firstError = appsRes.error || eventsRes.error || cvsRes.error || notifsRes.error;
      if (firstError) {
        console.error('Supabase fetch error:', firstError);
        const isMissingTable =
          firstError.code === '42P01' ||
          firstError.code === 'PGRST205' ||
          firstError.message.includes('does not exist') ||
          firstError.message.includes('schema cache');
        setSupabaseConnected(false);
        setSupabaseError(
          isMissingTable
            ? 'Tabelas ainda não criadas no Supabase. Execute o arquivo supabase/schema.sql no SQL Editor.'
            : firstError.message
        );
      } else {
        const mappedApps = ((appsRes.data || []) as DbJobApplicationRow[]).map(mapRowToApplication);
        const rawEvents = ((eventsRes.data || []) as DbCalendarEventRow[]).map(mapRowToEvent);

        // Enforce 1 event per applicationId and remove events for applications no longer in 'entrevista' or 'teste_tecnico'
        const appStatusMap = new Map<string, ApplicationStatus>(
          mappedApps.map((a) => [a.id, a.status])
        );
        const seenAppIds = new Map<string, CalendarEvent>();
        const deduplicatedEvents: CalendarEvent[] = [];
        const duplicateEventIdsToDelete: string[] = [];

        for (const evt of rawEvents) {
          if (!evt.applicationId) {
            deduplicatedEvents.push(evt);
            continue;
          }
          const linkedStatus = appStatusMap.get(evt.applicationId);
          if (linkedStatus && linkedStatus !== 'entrevista' && linkedStatus !== 'teste_tecnico') {
            duplicateEventIdsToDelete.push(evt.id);
            continue;
          }
          const prev = seenAppIds.get(evt.applicationId);
          if (!prev) {
            seenAppIds.set(evt.applicationId, evt);
            deduplicatedEvents.push(evt);
          } else {
            // Keep the later/newer event and mark the older duplicate for deletion
            duplicateEventIdsToDelete.push(prev.id);
            seenAppIds.set(evt.applicationId, evt);
            const idx = deduplicatedEvents.findIndex((e) => e.id === prev.id);
            if (idx !== -1) deduplicatedEvents[idx] = evt;
          }
        }

        // Auto-mark events whose date/time has already passed as completed
        const now = new Date();
        const autoCompletedIds: string[] = [];
        const normalizedEvents = deduplicatedEvents.map((evt) => {
          if (!evt.completed && hasEventPassed(evt, now)) {
            autoCompletedIds.push(evt.id);
            return { ...evt, completed: true };
          }
          return evt;
        });

        if (duplicateEventIdsToDelete.length > 0 && supabase) {
          void supabase
            .from('calendar_events')
            .delete()
            .in('id', duplicateEventIdsToDelete);
        }

        if (autoCompletedIds.length > 0 && supabase) {
          void supabase
            .from('calendar_events')
            .update({ completed: true })
            .in('id', autoCompletedIds);
        }

        setApplications(mappedApps);
        setEvents(normalizedEvents);
        setCvVersions(((cvsRes.data || []) as DbCVVersionRow[]).map(mapRowToCV));
        setNotifications(((notifsRes.data || []) as DbNotificationRow[]).map(mapRowToNotification));
        setSupabaseConnected(true);
        setSupabaseError(null);
      }
    } catch (err) {
      console.error('Unexpected Supabase error:', err);
      setSupabaseConnected(false);
      setSupabaseError(err instanceof Error ? err.message : 'Falha de conexão com o Supabase');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFromSupabase();
  }, [refreshFromSupabase]);

  // Periodically check (every 60s and on window focus) if any scheduled event has passed its date/time
  useEffect(() => {
    const checkExpiredEvents = () => {
      const now = new Date();
      setEvents((prev) => {
        const expiredIds: string[] = [];
        const next = prev.map((evt) => {
          if (!evt.completed && hasEventPassed(evt, now)) {
            expiredIds.push(evt.id);
            return { ...evt, completed: true };
          }
          return evt;
        });
        if (expiredIds.length === 0) return prev;

        if (supabase) {
          void supabase
            .from('calendar_events')
            .update({ completed: true })
            .in('id', expiredIds);
        }
        return next;
      });
    };

    checkExpiredEvents();
    const interval = window.setInterval(checkExpiredEvents, 60_000);
    window.addEventListener('focus', checkExpiredEvents);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', checkExpiredEvents);
    };
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (theme === 'light') return 'light';
    if (theme === 'dark') return 'dark';
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Sync theme with HTML class (.dark / .light) and OS preference listener
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      const nextResolved = isDark ? 'dark' : 'light';
      setResolvedTheme(nextResolved);

      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();
    localStorage.setItem(`${STORAGE_KEY}_theme`, theme);

    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  // Keyboard shortcut for command palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper: Remove all calendar events linked to an application when it leaves 'entrevista'/'teste_tecnico' or is deleted
  const cleanupApplicationEvents = (appId: string) => {
    const linkedEvents = events.filter((e) => e.applicationId === appId);
    if (linkedEvents.length === 0) return;

    const linkedIds = linkedEvents.map((e) => e.id);
    setEvents((prev) => prev.filter((e) => e.applicationId !== appId));
    setPendingScheduleDraft((prev) => (prev?.applicationId === appId ? null : prev));

    if (supabase) {
      void supabase
        .from('calendar_events')
        .delete()
        .in('id', linkedIds)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase cleanup calendar_events error:', error);
          }
        });
    }

    const token = getStoredGoogleToken();
    if (token) {
      for (const evt of linkedEvents) {
        if (evt.googleEventId) {
          void deleteGoogleCalendarEvent(token, evt.googleEventId).catch((err) => {
            console.error('Google Calendar delete on cleanup error:', err);
          });
        }
      }
    }
  };

  // Helper: Redirect to Calendar when an application enters 'entrevista' or 'teste_tecnico'
  // Enforces 1 single CalendarEvent per applicationId: if the application already has an event,
  // reuses and updates that existing event for the new stage instead of duplicating it.
  const triggerScheduleRedirect = (app: JobApplication, status: ApplicationStatus) => {
    if (status !== 'entrevista' && status !== 'teste_tecnico') return;

    const label = status === 'entrevista' ? 'Entrevista' : 'Teste técnico';
    const defaultTitle = `${label} · ${app.company}`;

    const existingForApp = events.find((e) => e.applicationId === app.id);

    let targetEventId: string;
    let draftTitle = defaultTitle;

    if (existingForApp) {
      targetEventId = existingForApp.id;
      const stageChanged = existingForApp.type !== status || existingForApp.completed;

      if (stageChanged) {
        const token = getStoredGoogleToken();
        if (token && existingForApp.googleEventId) {
          void deleteGoogleCalendarEvent(token, existingForApp.googleEventId).catch((err) => {
            console.error('Google Calendar delete on stage transition error:', err);
          });
        }

        const updatedAutoEvent: CalendarEvent = {
          ...existingForApp,
          title: defaultTitle,
          company: app.company,
          role: app.role,
          type: status,
          date: '',
          time: '',
          completed: false,
          googleEventId: undefined,
        };

        setEvents((prev) =>
          prev.map((e) => (e.id === existingForApp.id ? updatedAutoEvent : e))
        );

        if (supabase) {
          void supabase
            .from('calendar_events')
            .update(mapEventToRow(updatedAutoEvent))
            .eq('id', existingForApp.id)
            .then(({ error }) => {
              if (error) {
                console.error('Supabase auto-update calendar_events error:', error);
                showToast(`Erro ao atualizar evento na Agenda: ${error.message}`, 'error');
              }
            });
        }
      } else {
        draftTitle = existingForApp.title || defaultTitle;
      }
    } else {
      targetEventId = 'evt_' + Math.random().toString(36).substring(2, 9);
      const autoEvent: CalendarEvent = {
        id: targetEventId,
        applicationId: app.id,
        title: defaultTitle,
        company: app.company,
        role: app.role,
        type: status,
        date: '',
        time: '',
        completed: false,
      };
      setEvents((prev) => [...prev, autoEvent]);

      if (supabase) {
        void supabase
          .from('calendar_events')
          .insert(mapEventToRow(autoEvent))
          .then(({ error }) => {
            if (error) {
              console.error('Supabase auto-insert calendar_events error:', error);
              showToast(`Erro ao salvar evento na Agenda: ${error.message}`, 'error');
            }
          });
      }
    }

    setSelectedApplicationId(null);
    setEditingApplicationId(null);
    setIsNewApplicationModalOpen(false);
    setPendingScheduleDraft({
      eventId: targetEventId,
      applicationId: app.id,
      company: app.company,
      role: app.role,
      type: status,
      title: draftTitle,
    });
    setActiveView('calendar');
  };

  // CRUD Operations
  const addApplication = (appData: Omit<JobApplication, 'id' | 'activityHistory'>) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newId = 'job_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const initialActivity: ActivityEvent = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      date: todayStr,
      time: timeStr,
      title: `Candidatura cadastrada (${appData.platform})`,
      description: `Inscrição para ${appData.role} na empresa ${appData.company}.`,
      type: 'created',
    };

    const newApp: JobApplication = {
      ...appData,
      id: newId,
      appliedDate: appData.appliedDate || todayStr,
      updatedDate: todayStr,
      activityHistory: [initialActivity],
    };

    setApplications((prev) => [newApp, ...prev]);
    showToast(`Candidatura em "${appData.company}" adicionada com sucesso!`, 'success');

    if (supabase) {
      void supabase
        .from('job_applications')
        .insert(mapApplicationToRow(newApp))
        .then(({ error }) => {
          if (error) {
            console.error('Supabase insert job_applications error:', error);
            showToast(`Erro ao salvar no Supabase: ${error.message}`, 'error');
          }
        });
    }

    if (newApp.status === 'entrevista' || newApp.status === 'teste_tecnico') {
      triggerScheduleRedirect(newApp, newApp.status);
    }
  };

  const statusDisplayNames: Record<ApplicationStatus, string> = {
    candidatado: 'Candidatado',
    em_analise: 'Em análise',
    entrevista: 'Entrevista',
    teste_tecnico: 'Teste técnico',
    proposta: 'Proposta',
    aprovado: 'Aprovado',
    reprovado: 'Reprovado',
    sem_resposta: 'Sem resposta',
    desistencia: 'Desistência',
  };

  const updateApplication = (id: string, updates: Partial<JobApplication>) => {
    const existingApp = applications.find((app) => app.id === id);
    if (!existingApp) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const statusChanged = Boolean(updates.status && updates.status !== existingApp.status);
    let nextHistory = existingApp.activityHistory;
    if (updates.status && updates.status !== existingApp.status) {
      const statusLabel = statusDisplayNames[updates.status] || updates.status;
      const statusEvent: ActivityEvent = {
        id: 'act_' + Math.random().toString(36).substring(2, 9),
        date: todayStr,
        time: timeStr,
        title: `Status alterado para "${statusLabel}"`,
        description: `Etapa do processo atualizada de ${statusDisplayNames[existingApp.status]} para ${statusLabel}.`,
        type: 'status_change',
      };
      nextHistory = [statusEvent, ...existingApp.activityHistory];
    }

    const updatedApp: JobApplication = {
      ...existingApp,
      ...updates,
      updatedDate: todayStr,
      activityHistory: updates.activityHistory ?? nextHistory,
    };

    setApplications((prev) => prev.map((app) => (app.id === id ? updatedApp : app)));
    showToast('Candidatura atualizada.', 'info');

    if (supabase) {
      void supabase
        .from('job_applications')
        .update(mapApplicationToRow(updatedApp))
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase update job_applications error:', error);
            showToast(`Erro ao atualizar no Supabase: ${error.message}`, 'error');
          }
        });
    }

    if (statusChanged) {
      if (updatedApp.status === 'entrevista' || updatedApp.status === 'teste_tecnico') {
        triggerScheduleRedirect(updatedApp, updatedApp.status);
      } else {
        cleanupApplicationEvents(id);
      }
    }
  };

  const deleteApplication = (id: string) => {
    const target = applications.find((a) => a.id === id);
    cleanupApplicationEvents(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    if (selectedApplicationId === id) setSelectedApplicationId(null);
    if (editingApplicationId === id) setEditingApplicationId(null);
    showToast(`Candidatura em "${target?.company || 'vaga'}" removida.`, 'warning');

    if (supabase) {
      void supabase
        .from('job_applications')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase delete job_applications error:', error);
            showToast(`Erro ao excluir no Supabase: ${error.message}`, 'error');
          }
        });
    }
  };

  const updateStatus = (id: string, newStatus: ApplicationStatus, note?: string) => {
    const existingApp = applications.find((app) => app.id === id);
    if (!existingApp) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const prevStatusLabel = statusDisplayNames[existingApp.status] || existingApp.status;
    const statusLabel = statusDisplayNames[newStatus] || newStatus;
    const newEvent: ActivityEvent = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      date: todayStr,
      time: timeStr,
      title: `Status alterado para "${statusLabel}"`,
      description: note || `Etapa alterada de "${prevStatusLabel}" para "${statusLabel}".`,
      type: 'status_change',
    };

    const nextHistory: ActivityEvent[] = [newEvent, ...existingApp.activityHistory];
    const updatedApp: JobApplication = {
      ...existingApp,
      status: newStatus,
      updatedDate: todayStr,
      activityHistory: nextHistory,
    };

    setApplications((prev) => prev.map((app) => (app.id === id ? updatedApp : app)));

    showToast(`"${existingApp.company}" movida para ${statusLabel}.`, 'success');

    if (supabase) {
      void supabase
        .from('job_applications')
        .update(mapApplicationToRow(updatedApp))
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase updateStatus error:', error);
            showToast(`Erro ao salvar status no Supabase: ${error.message}`, 'error');
          }
        });
    }

    if (newStatus !== existingApp.status) {
      if (newStatus === 'entrevista' || newStatus === 'teste_tecnico') {
        triggerScheduleRedirect(updatedApp, newStatus);
      } else {
        cleanupApplicationEvents(id);
      }
    }
  };

  const addActivityToApplication = (
    id: string,
    activity: Omit<ActivityEvent, 'id' | 'date' | 'time'> & { date?: string; time?: string }
  ) => {
    const existingApp = applications.find((app) => app.id === id);
    if (!existingApp) return;

    const now = new Date();
    const todayStr = activity.date || now.toISOString().split('T')[0];
    const timeStr =
      activity.time ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newActivity: ActivityEvent = {
      id: 'act_' + Math.random().toString(36).substring(2, 9),
      date: todayStr,
      time: timeStr,
      title: activity.title,
      description: activity.description,
      type: activity.type,
    };

    const nextHistory: ActivityEvent[] = [newActivity, ...existingApp.activityHistory];
    const updatedApp: JobApplication = {
      ...existingApp,
      updatedDate: todayStr,
      activityHistory: nextHistory,
    };

    setApplications((prev) => prev.map((app) => (app.id === id ? updatedApp : app)));
    showToast('Nova anotação registrada no histórico.', 'info');

    if (supabase) {
      void supabase
        .from('job_applications')
        .update({
          updated_date: todayStr,
          activity_history: nextHistory,
        })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase addActivity error:', error);
            showToast(`Erro ao salvar anotação no Supabase: ${error.message}`, 'error');
          }
        });
    }
  };

  // Google Calendar OAuth & Sync
  const connectGoogleCalendar = async () => {
    try {
      const token = await requestGoogleCalendarToken();
      if (token) {
        setGoogleCalendarConnected(true);
        showToast('Google Agenda conectado! Suas reuniões serão sincronizadas automaticamente.', 'success');
      }
    } catch (err) {
      setGoogleCalendarConnected(false);
      showToast(
        err instanceof Error ? err.message : 'Não foi possível conectar ao Google Agenda.',
        'error'
      );
    }
  };

  const disconnectGoogleCalendar = () => {
    clearStoredGoogleToken();
    setGoogleCalendarConnected(false);
    showToast('Conta do Google Agenda desconectada.', 'info');
  };

  const syncEventToGoogleCalendar = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    if (!target.date || !target.date.trim()) {
      showToast('Defina uma data e horário para o evento antes de enviar ao Google Agenda.', 'warning');
      return;
    }

    let token = getStoredGoogleToken();
    if (!token) {
      if (!isGoogleCalendarConfigured) {
        openInGoogleCalendar(target);
        return;
      }
      try {
        token = await requestGoogleCalendarToken();
        setGoogleCalendarConnected(true);
      } catch {
        openInGoogleCalendar(target);
        return;
      }
    }

    try {
      const gcalId = await createGoogleCalendarEvent(token, target);
      if (gcalId) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, googleEventId: gcalId } : e))
        );
        if (supabase) {
          void supabase
            .from('calendar_events')
            .update({ google_event_id: gcalId })
            .eq('id', eventId);
        }
        showToast('Evento sincronizado automaticamente com o Google Agenda!', 'success');
      }
    } catch (err) {
      setGoogleCalendarConnected(Boolean(getStoredGoogleToken()));
      showToast(
        err instanceof Error ? err.message : 'Falha ao sincronizar com Google Agenda.',
        'error'
      );
    }
  };

  // Events CRUD
  const addEvent = (
    eventData: Omit<CalendarEvent, 'id'>,
    options?: { openGoogleUrlFallback?: boolean }
  ) => {
    const hasDate = Boolean(eventData.date && eventData.date.trim());

    // Enforce 1 event per applicationId: if an event already exists for this application, update it instead
    if (eventData.applicationId) {
      const existingForApp = events.find((e) => e.applicationId === eventData.applicationId);
      if (existingForApp) {
        updateEvent(
          existingForApp.id,
          {
            ...eventData,
            date: hasDate ? eventData.date : '',
            time: hasDate ? eventData.time || '14:00' : '',
          },
          options
        );
        return;
      }
    }

    const finalDate = hasDate ? eventData.date : '';
    const finalTime = hasDate ? eventData.time || '14:00' : '';
    const isAlreadyPast = hasDate && hasEventPassed({ date: finalDate, time: finalTime });

    const newEvent: CalendarEvent = {
      ...eventData,
      date: finalDate,
      time: finalTime,
      completed: isAlreadyPast ? true : Boolean(eventData.completed),
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
    };
    setEvents((prev) => [...prev, newEvent]);
    showToast(
      isAlreadyPast
        ? 'Atividade registrada diretamente em Eventos Concluídos (data passada)!'
        : hasDate
        ? 'Atividade agendada com sucesso!'
        : 'Compromisso registrado como "Sem data definida"!',
      'success'
    );

    if (supabase) {
      void supabase
        .from('calendar_events')
        .insert(mapEventToRow(newEvent))
        .then(({ error }) => {
          if (error) {
            console.error('Supabase insert calendar_events error:', error);
            showToast(`Erro ao salvar evento no Supabase: ${error.message}`, 'error');
          }
        });
    }

    // Automatically log this schedule entry in the linked application's activityHistory
    if (newEvent.applicationId) {
      const targetApp = applications.find((a) => a.id === newEvent.applicationId);
      if (targetApp) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;
        const activityType =
          newEvent.type === 'entrevista'
            ? 'interview'
            : newEvent.type === 'teste_tecnico'
            ? 'test'
            : 'note';
        const scheduleActivity: ActivityEvent = {
          id: 'act_' + Math.random().toString(36).substring(2, 9),
          date: todayStr,
          time: timeStr,
          title: hasDate
            ? `${newEvent.title} agendado para ${newEvent.date} às ${newEvent.time}`
            : `${newEvent.title} registrado (data a definir)`,
          description: newEvent.notes || undefined,
          type: activityType,
        };
        const nextHistory = [scheduleActivity, ...targetApp.activityHistory];
        setApplications((prev) =>
          prev.map((a) =>
            a.id === targetApp.id
              ? { ...a, updatedDate: todayStr, activityHistory: nextHistory }
              : a
          )
        );
        if (supabase) {
          void supabase
            .from('job_applications')
            .update({ updated_date: todayStr, activity_history: nextHistory })
            .eq('id', targetApp.id);
        }
      }
    }

    if (!hasDate) return;

    const token = getStoredGoogleToken();
    if (token) {
      void createGoogleCalendarEvent(token, newEvent)
        .then((gcalId) => {
          if (gcalId) {
            setEvents((prev) =>
              prev.map((e) => (e.id === newEvent.id ? { ...e, googleEventId: gcalId } : e))
            );
            if (supabase) {
              void supabase
                .from('calendar_events')
                .update({ google_event_id: gcalId })
                .eq('id', newEvent.id);
            }
            showToast('Sincronizado com sua agenda do Google!', 'info');
          }
        })
        .catch((err) => {
          console.error('Google Calendar auto-sync error:', err);
          setGoogleCalendarConnected(Boolean(getStoredGoogleToken()));
          showToast(
            err instanceof Error ? err.message : 'Erro ao sincronizar com Google Agenda.',
            'warning'
          );
        });
    } else if (options?.openGoogleUrlFallback) {
      openInGoogleCalendar(newEvent);
    }
  };

  const updateEvent = (
    id: string,
    updates: Partial<CalendarEvent>,
    options?: { openGoogleUrlFallback?: boolean }
  ) => {
    const existingEvt = events.find((e) => e.id === id);
    if (!existingEvt) return;

    const updatedEvt: CalendarEvent = { ...existingEvt, ...updates };
    const hadDate = Boolean(existingEvt.date && existingEvt.date.trim());
    const hasDate = Boolean(updatedEvt.date && updatedEvt.date.trim());

    // When date or time is modified and 'completed' wasn't explicitly overridden,
    // automatically set completed based on whether the chosen date/time has already passed.
    if (updates.completed === undefined && (updates.date !== undefined || updates.time !== undefined)) {
      updatedEvt.completed = hasDate ? hasEventPassed(updatedEvt) : false;
    }

    setEvents((prev) => prev.map((e) => (e.id === id ? updatedEvt : e)));
    showToast(
      updatedEvt.completed && !existingEvt.completed
        ? 'Data passada detectada — evento movido para Concluídos!'
        : !hadDate && hasDate
        ? 'Data e horário definidos na Agenda!'
        : hasDate
        ? 'Atividade atualizada.'
        : 'Compromisso mantido como "Sem data definida".',
      hasDate ? 'success' : 'info'
    );

    if (supabase) {
      void supabase
        .from('calendar_events')
        .update(mapEventToRow(updatedEvt))
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase update calendar_events error:', error);
            showToast(`Erro ao atualizar evento no Supabase: ${error.message}`, 'error');
          }
        });
    }

    // If a previously undated event just received a date, log it in the linked application's history
    if (!hadDate && hasDate && updatedEvt.applicationId) {
      const targetApp = applications.find((a) => a.id === updatedEvt.applicationId);
      if (targetApp) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;
        const activityType =
          updatedEvt.type === 'entrevista'
            ? 'interview'
            : updatedEvt.type === 'teste_tecnico'
            ? 'test'
            : 'note';
        const scheduleActivity: ActivityEvent = {
          id: 'act_' + Math.random().toString(36).substring(2, 9),
          date: todayStr,
          time: timeStr,
          title: `${updatedEvt.title} agendado para ${updatedEvt.date} às ${updatedEvt.time}`,
          description: updatedEvt.notes || undefined,
          type: activityType,
        };
        const nextHistory = [scheduleActivity, ...targetApp.activityHistory];
        setApplications((prev) =>
          prev.map((a) =>
            a.id === targetApp.id
              ? { ...a, updatedDate: todayStr, activityHistory: nextHistory }
              : a
          )
        );
        if (supabase) {
          void supabase
            .from('job_applications')
            .update({ updated_date: todayStr, activity_history: nextHistory })
            .eq('id', targetApp.id);
        }
      }
    }

    const token = getStoredGoogleToken();
    if (token && !hasDate && existingEvt.googleEventId) {
      void deleteGoogleCalendarEvent(token, existingEvt.googleEventId).catch((err) => {
        console.error('Google Calendar delete when clearing date error:', err);
      });
      updatedEvt.googleEventId = undefined;
      setEvents((prev) => prev.map((e) => (e.id === id ? updatedEvt : e)));
      if (supabase) {
        void supabase
          .from('calendar_events')
          .update({ google_event_id: null })
          .eq('id', id);
      }
    } else if (token && hasDate) {
      if (updatedEvt.googleEventId) {
        void updateGoogleCalendarEvent(token, updatedEvt.googleEventId, updatedEvt).catch(
          (err) => {
            console.error('Google Calendar update error:', err);
            setGoogleCalendarConnected(Boolean(getStoredGoogleToken()));
          }
        );
      } else {
        // Was previously 'Sem data' and now has a defined date -> auto-create in Google Calendar
        void createGoogleCalendarEvent(token, updatedEvt)
          .then((gcalId) => {
            if (gcalId) {
              setEvents((prev) =>
                prev.map((e) => (e.id === id ? { ...e, googleEventId: gcalId } : e))
              );
              if (supabase) {
                void supabase
                  .from('calendar_events')
                  .update({ google_event_id: gcalId })
                  .eq('id', id);
              }
              showToast('Data definida e sincronizada com o Google Agenda!', 'success');
            }
          })
          .catch((err) => {
            console.error('Google Calendar create after date set error:', err);
            setGoogleCalendarConnected(Boolean(getStoredGoogleToken()));
          });
      }
    } else if (!token && hasDate && options?.openGoogleUrlFallback) {
      openInGoogleCalendar(updatedEvt);
    }
  };

  const deleteEvent = (id: string) => {
    const targetEvt = events.find((e) => e.id === id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    showToast('Atividade removida.', 'warning');

    if (supabase) {
      void supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase delete calendar_events error:', error);
            showToast(`Erro ao remover evento no Supabase: ${error.message}`, 'error');
          }
        });
    }

    const token = getStoredGoogleToken();
    if (token && targetEvt?.googleEventId) {
      void deleteGoogleCalendarEvent(token, targetEvt.googleEventId).catch((err) => {
        console.error('Google Calendar delete error:', err);
      });
    }
  };

  const toggleEventCompleted = (id: string) => {
    const existingEvt = events.find((e) => e.id === id);
    if (!existingEvt) return;

    const nextCompleted = !existingEvt.completed;
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, completed: nextCompleted } : e))
    );
    showToast(
      nextCompleted ? 'Atividade marcada como concluída.' : 'Atividade reaberta.',
      'info'
    );

    if (supabase) {
      void supabase
        .from('calendar_events')
        .update({ completed: nextCompleted })
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase toggleEventCompleted error:', error);
            showToast(`Erro ao atualizar evento no Supabase: ${error.message}`, 'error');
          }
        });
    }
  };

  // CV CRUD
  const addCVVersion = (cvData: Omit<CVVersion, 'id'>) => {
    const newCV: CVVersion = {
      ...cvData,
      id: 'cv_' + Math.random().toString(36).substring(2, 9),
    };
    setCvVersions((prev) => [newCV, ...prev]);
    showToast('Nova versão de currículo registrada.', 'success');

    if (supabase) {
      void supabase
        .from('cv_versions')
        .insert(mapCVToRow(newCV))
        .then(({ error }) => {
          if (error) {
            console.error('Supabase insert cv_versions error:', error);
            showToast(`Erro ao salvar currículo no Supabase: ${error.message}`, 'error');
          }
        });
    }
  };

  const deleteCVVersion = (id: string) => {
    setCvVersions((prev) => prev.filter((c) => c.id !== id));
    showToast('Versão de currículo removida.', 'info');

    if (supabase) {
      void supabase
        .from('cv_versions')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase delete cv_versions error:', error);
            showToast(`Erro ao excluir currículo no Supabase: ${error.message}`, 'error');
          }
        });
    }
  };

  // Notifications: Smart Alerts Engine + manual controls
  useEffect(() => {
    if (isLoading) return;

    setNotifications((prev) => {
      const dismissedIds = getDismissedNotificationIds();
      const { nextNotifications, toInsert, toDeleteIds } = computeSmartNotifications(
        applications,
        events,
        prev,
        dismissedIds
      );

      if (toInsert.length === 0 && toDeleteIds.length === 0) {
        return prev;
      }

      if (supabase) {
        if (toDeleteIds.length > 0) {
          void supabase.from('notifications').delete().in('id', toDeleteIds);
        }
        if (toInsert.length > 0) {
          void supabase
            .from('notifications')
            .upsert(toInsert.map(mapNotificationToRow), { onConflict: 'id' });
        }
      }

      return nextNotifications;
    });
  }, [applications, events, isLoading]);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (supabase) {
      void supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('Todas as notificações marcadas como lidas.', 'info');
    if (supabase) {
      void supabase.from('notifications').update({ read: true }).eq('read', false);
    }
  };

  const clearNotifications = () => {
    setNotifications((prev) => {
      addDismissedNotificationIds(prev.map((n) => n.id));
      return [];
    });
    showToast('Notificações limpas.', 'info');
    if (supabase) {
      void supabase.from('notifications').delete().neq('id', '');
    }
  };

  // Export Data JSON
  const exportDataJSON = () => {
    const data = {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      applications,
      events,
      cvVersions,
    };
    const jsonStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute(
      'download',
      `jobflow_backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON exportado com sucesso!', 'success');
  };

  // Export Data CSV
  const exportDataCSV = () => {
    const headers = [
      'Empresa',
      'Cargo',
      'Status',
      'Modalidade',
      'Contrato',
      'Plataforma',
      'Data Candidatura',
      'Última Atualização',
      'Faixa Salarial',
      'Prioridade',
      'Tecnologias',
    ];

    const rows = applications.map((app) => [
      `"${app.company.replace(/"/g, '""')}"`,
      `"${app.role.replace(/"/g, '""')}"`,
      `"${app.status}"`,
      `"${app.modality}"`,
      `"${app.contractType}"`,
      `"${app.platform}"`,
      `"${app.appliedDate}"`,
      `"${app.updatedDate}"`,
      `"${(app.salaryRange || '').replace(/"/g, '""')}"`,
      `"${app.priority}"`,
      `"${app.technologies.join(', ')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute(
      'download',
      `jobflow_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Planilha CSV gerada e exportada!', 'success');
  };

  // Import Data JSON (upserts into Supabase as well)
  const importDataJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.applications)) {
        const importedApps: JobApplication[] = parsed.applications;
        const importedEvents: CalendarEvent[] = Array.isArray(parsed.events) ? parsed.events : [];
        const importedCVs: CVVersion[] = Array.isArray(parsed.cvVersions) ? parsed.cvVersions : [];

        setApplications(importedApps);
        setEvents(importedEvents);
        setCvVersions(importedCVs);

        if (supabase) {
          void (async () => {
            if (importedCVs.length > 0) {
              await supabase.from('cv_versions').upsert(importedCVs.map(mapCVToRow));
            }
            if (importedApps.length > 0) {
              await supabase.from('job_applications').upsert(importedApps.map(mapApplicationToRow));
            }
            if (importedEvents.length > 0) {
              await supabase.from('calendar_events').upsert(importedEvents.map(mapEventToRow));
            }
          })();
        }

        showToast('Backup restaurado e sincronizado com o Supabase!', 'success');
        return true;
      } else {
        showToast('Estrutura de arquivo JSON inválida.', 'error');
        return false;
      }
    } catch (e) {
      console.error('Import error', e);
      showToast('Erro ao ler arquivo JSON.', 'error');
      return false;
    }
  };

  // Clear all data in Supabase and local state
  const resetToDefaultData = () => {
    clearDismissedNotificationIds();
    setApplications([]);
    setEvents([]);
    setCvVersions([]);
    setNotifications([]);

    if (supabase) {
      void Promise.all([
        supabase.from('calendar_events').delete().neq('id', ''),
        supabase.from('job_applications').delete().neq('id', ''),
        supabase.from('cv_versions').delete().neq('id', ''),
        supabase.from('notifications').delete().neq('id', ''),
      ]).then(() => {
        showToast('Todos os registros foram limpos do Supabase.', 'info');
      });
    } else {
      showToast('Dados limpos.', 'info');
    }
  };

  return (
    <JobContext.Provider
      value={{
        applications,
        events,
        cvVersions,
        notifications,
        isLoading,
        supabaseConnected,
        supabaseError,
        refreshFromSupabase,
        activeView,
        setActiveView,
        selectedApplicationId,
        setSelectedApplicationId,
        editingApplicationId,
        setEditingApplicationId,
        isNewApplicationModalOpen,
        setIsNewApplicationModalOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        pendingScheduleDraft,
        setPendingScheduleDraft,
        theme,
        resolvedTheme,
        setTheme,
        toasts,
        showToast,
        dismissToast,
        addApplication,
        updateApplication,
        deleteApplication,
        updateStatus,
        addActivityToApplication,
        addEvent,
        updateEvent,
        deleteEvent,
        toggleEventCompleted,
        isGoogleCalendarConfigured,
        googleCalendarConnected,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        syncEventToGoogleCalendar,
        addCVVersion,
        deleteCVVersion,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        exportDataJSON,
        exportDataCSV,
        importDataJSON,
        resetToDefaultData,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJobContext = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobContext must be used within a JobProvider');
  }
  return context;
};
