import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  JobApplication,
  CalendarEvent,
  CVVersion,
  AppNotification,
  ActiveView,
  ApplicationStatus,
  ActivityEvent,
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
  DbJobApplicationRow,
  DbCalendarEventRow,
  DbCVVersionRow,
  DbNotificationRow,
} from '../lib/supabase';
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
  theme: 'dark' | 'light' | 'system';
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
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
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
        setApplications(((appsRes.data || []) as DbJobApplicationRow[]).map(mapRowToApplication));
        setEvents(((eventsRes.data || []) as DbCalendarEventRow[]).map(mapRowToEvent));
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

  // Sync theme with HTML class
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem(`${STORAGE_KEY}_theme`, theme);
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
  };

  const deleteApplication = (id: string) => {
    const target = applications.find((a) => a.id === id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setEvents((prev) => prev.filter((e) => e.applicationId !== id));
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
    const newEvent: CalendarEvent = {
      ...eventData,
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
    };
    setEvents((prev) => [...prev, newEvent]);
    showToast('Atividade agendada com sucesso!', 'success');

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

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    const existingEvt = events.find((e) => e.id === id);
    if (!existingEvt) return;

    const updatedEvt: CalendarEvent = { ...existingEvt, ...updates };
    setEvents((prev) => prev.map((e) => (e.id === id ? updatedEvt : e)));
    showToast('Atividade atualizada.', 'info');

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

    const token = getStoredGoogleToken();
    if (token && updatedEvt.googleEventId) {
      void updateGoogleCalendarEvent(token, updatedEvt.googleEventId, updatedEvt).catch(
        (err) => {
          console.error('Google Calendar update error:', err);
          setGoogleCalendarConnected(Boolean(getStoredGoogleToken()));
        }
      );
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

  // Notifications
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
    setNotifications([]);
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
        theme,
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
