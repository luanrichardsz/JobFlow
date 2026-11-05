import React, { useState, useMemo, useEffect } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  Video,
  FileCode,
  Bell,
  Trash2,
  X,
  Building,
  Download,
  RefreshCw,
} from 'lucide-react';
import { CalendarEvent, EventType } from '../../types';
import { formatDatePT, findConflictingEvent } from '../../utils/formatters';
import {
  openInGoogleCalendar,
  downloadEventICS,
  exportAllEventsICS,
} from '../../utils/calendarSync';

export const CalendarView: React.FC = () => {
  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleEventCompleted,
    applications,
    pendingScheduleDraft,
    setPendingScheduleDraft,
    isGoogleCalendarConfigured,
    googleCalendarConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncEventToGoogleCalendar,
    showToast,
  } = useJobContext();

  const todayISO = new Date().toISOString().split('T')[0];
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [cameFromStatusUpdate, setCameFromStatusUpdate] = useState(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCompany, setNewEventCompany] = useState('');
  const [newEventRole, setNewEventRole] = useState('');
  const [newEventType, setNewEventType] = useState<EventType>('entrevista');
  const [newEventDate, setNewEventDate] = useState(todayISO);
  const [newEventTime, setNewEventTime] = useState('14:00');
  const [withoutDate, setWithoutDate] = useState(false);
  const [newEventMeetingUrl, setNewEventMeetingUrl] = useState('');
  const [newEventNotes, setNewEventNotes] = useState('');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [openInGCalAfterSave, setOpenInGCalAfterSave] = useState(true);

  // Auto-open modal pre-populated when redirected from status change (Entrevista / Teste técnico)
  // The event is already created as "Sem data definida" (date: '') in JobContext, so editingEventId
  // points to that event; closing the modal leaves it as "Sem data definida", while submitting sets the date.
  useEffect(() => {
    if (!pendingScheduleDraft) return;

    setEditingEventId(pendingScheduleDraft.eventId);
    setSelectedAppId(pendingScheduleDraft.applicationId);
    setNewEventCompany(pendingScheduleDraft.company);
    setNewEventRole(pendingScheduleDraft.role);
    setNewEventType(pendingScheduleDraft.type);
    setNewEventTitle(pendingScheduleDraft.title);
    setNewEventDate(todayISO);
    setNewEventTime('14:00');
    setWithoutDate(false);
    setNewEventMeetingUrl('');
    setNewEventNotes('');
    setCameFromStatusUpdate(true);
    setIsAddEventModalOpen(true);
    setPendingScheduleDraft(null);
  }, [pendingScheduleDraft, setPendingScheduleDraft, todayISO]);

  const monthsPT = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter((e) => e.type === filterType);
  }, [events, filterType]);

  // Days in month calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
          daysInPrevMonth - i
        ).padStart(2, '0')}`,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr,
      });
    }

    // Next month padding to fill 35 or 42 cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let nextD = 1; nextD <= remaining; nextD++) {
      days.push({
        dayNumber: nextD,
        isCurrentMonth: false,
        dateStr: `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-${String(
          nextD
        ).padStart(2, '0')}`,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const conflictingEvent = useMemo(() => {
    if (withoutDate) return null;
    return findConflictingEvent(events, {
      date: newEventDate,
      time: newEventTime,
      excludeEventId: editingEventId,
      excludeApplicationId: selectedAppId || null,
    });
  }, [withoutDate, events, newEventDate, newEventTime, editingEventId, selectedAppId]);

  const saveEventInternal = (forceWithoutDate = false) => {
    if (!newEventTitle.trim() || !newEventCompany.trim()) return;

    const isNoDate = forceWithoutDate || withoutDate;
    const finalDate = isNoDate ? '' : newEventDate;
    const finalTime = isNoDate ? '' : newEventTime;

    if (!isNoDate) {
      const conflict = findConflictingEvent(events, {
        date: finalDate,
        time: finalTime,
        excludeEventId: editingEventId,
        excludeApplicationId: selectedAppId || null,
      });
      if (conflict) {
        showToast(
          `Horário indisponível: "${conflict.title}" já está agendado às ${conflict.time}. Escolha um horário com pelo menos 1 hora de diferença.`,
          'error'
        );
        return;
      }
    }

    if (editingEventId) {
      updateEvent(
        editingEventId,
        {
          title: newEventTitle.trim(),
          company: newEventCompany.trim(),
          role: newEventRole.trim() || 'Candidatura',
          type: newEventType,
          date: finalDate,
          time: finalTime,
          meetingUrl: newEventMeetingUrl.trim() || undefined,
          notes: newEventNotes.trim() || undefined,
          applicationId: selectedAppId || undefined,
        },
        { openGoogleUrlFallback: !isNoDate && !googleCalendarConnected && openInGCalAfterSave }
      );
    } else {
      addEvent(
        {
          title: newEventTitle.trim(),
          company: newEventCompany.trim(),
          role: newEventRole.trim() || 'Candidatura',
          type: newEventType,
          date: finalDate,
          time: finalTime,
          meetingUrl: newEventMeetingUrl.trim() || undefined,
          notes: newEventNotes.trim() || undefined,
          applicationId: selectedAppId || undefined,
          completed: false,
        },
        { openGoogleUrlFallback: !isNoDate && !googleCalendarConnected && openInGCalAfterSave }
      );
    }

    setIsAddEventModalOpen(false);
    setEditingEventId(null);
    setCameFromStatusUpdate(false);
    setWithoutDate(false);
    setNewEventTitle('');
    setNewEventCompany('');
    setNewEventRole('');
    setNewEventMeetingUrl('');
    setNewEventNotes('');
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    saveEventInternal(false);
  };

  // When closing the modal (X, backdrop, or "Deixar sem data"):
  // If we came from a status change (Entrevista / Teste técnico), closing guarantees the event stays saved as "Sem data definida".
  const handleCloseModal = () => {
    if (cameFromStatusUpdate && editingEventId) {
      saveEventInternal(true);
      return;
    }
    setIsAddEventModalOpen(false);
    setEditingEventId(null);
    setCameFromStatusUpdate(false);
  };

  const openDefineDateModal = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setSelectedAppId(evt.applicationId || '');
    setNewEventTitle(evt.title);
    setNewEventCompany(evt.company);
    setNewEventRole(evt.role);
    setNewEventType(evt.type);
    setNewEventDate(evt.date || todayISO);
    setNewEventTime(evt.time || '14:00');
    setWithoutDate(false);
    setNewEventMeetingUrl(evt.meetingUrl || '');
    setNewEventNotes(evt.notes || '');
    setCameFromStatusUpdate(false);
    setIsAddEventModalOpen(true);
  };

  const openFreshAddModal = () => {
    setEditingEventId(null);
    setSelectedAppId('');
    setNewEventTitle('');
    setNewEventCompany('');
    setNewEventRole('');
    setNewEventType('entrevista');
    setNewEventDate(todayISO);
    setNewEventTime('14:00');
    setWithoutDate(false);
    setNewEventMeetingUrl('');
    setNewEventNotes('');
    setCameFromStatusUpdate(false);
    setIsAddEventModalOpen(true);
  };

  const undatedEvents = useMemo(
    () => filteredEvents.filter((e) => !e.completed && (!e.date || !e.date.trim())),
    [filteredEvents]
  );

  const scheduledEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => !e.completed && Boolean(e.date && e.date.trim()))
        .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`)),
    [filteredEvents]
  );

  const completedEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => e.completed)
        .sort((a, b) => `${b.date || ''}T${b.time || '00:00'}`.localeCompare(`${a.date || ''}T${a.time || '00:00'}`)),
    [filteredEvents]
  );

  const handleAppSelect = (appId: string) => {
    setSelectedAppId(appId);
    if (!appId) {
      if (!cameFromStatusUpdate) setEditingEventId(null);
      return;
    }

    const existingEvt = events.find((e) => e.applicationId === appId);
    const target = applications.find((a) => a.id === appId);

    if (existingEvt) {
      setEditingEventId(existingEvt.id);
      setNewEventCompany(existingEvt.company || target?.company || '');
      setNewEventRole(existingEvt.role || target?.role || '');
      setNewEventType(existingEvt.type);
      setNewEventTitle(existingEvt.title);
      if (existingEvt.date) {
        setNewEventDate(existingEvt.date);
        setNewEventTime(existingEvt.time || '14:00');
        setWithoutDate(false);
      }
      setNewEventMeetingUrl(existingEvt.meetingUrl || '');
      setNewEventNotes(existingEvt.notes || '');
      return;
    }

    setEditingEventId(null);
    if (target) {
      setNewEventCompany(target.company);
      setNewEventRole(target.role);
      const nextType: EventType =
        target.status === 'teste_tecnico' ? 'teste_tecnico' : 'entrevista';
      setNewEventType(nextType);
      setNewEventTitle(
        `${nextType === 'teste_tecnico' ? 'Teste técnico' : 'Entrevista'} · ${target.company}`
      );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Agenda & Entrevistas
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
            Acompanhe entrevistas agendadas, testes técnicos e prazos de retorno.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isGoogleCalendarConfigured && (
            <button
              onClick={() =>
                googleCalendarConnected
                  ? disconnectGoogleCalendar()
                  : void connectGoogleCalendar()
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                googleCalendarConnected
                  ? 'border-[#1f4632] bg-[#13261d] text-[#5ad19e]'
                  : 'border-[#25272b] bg-[#16181b] text-[#c8cace] hover:text-white'
              }`}
              title={
                googleCalendarConnected
                  ? 'Clique para desconectar o Google Agenda'
                  : 'Conectar Google Agenda para sincronização automática'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  googleCalendarConnected ? 'bg-[#3FBF8A]' : 'bg-[#6b6e74]'
                }`}
              />
              <span>
                {googleCalendarConnected ? 'Google Agenda ativo' : 'Conectar Google Agenda'}
              </span>
            </button>
          )}

          {events.length > 0 && (
            <button
              onClick={() => exportAllEventsICS(events)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#25272b] bg-[#16181b] text-xs font-medium text-[#c8cace] hover:text-white transition-colors"
              title="Baixar arquivo .ics compatível com Android, iPhone e Google Agenda"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar .ics</span>
            </button>
          )}

          <button
            onClick={openFreshAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar evento</span>
          </button>
        </div>
      </div>

      {/* Calendar Controls Bar */}
      <div className="p-3 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-[#25272b] text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 min-w-36 text-center">
            {monthsPT[currentMonth]} {currentYear}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-[#25272b] text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const now = new Date();
              setCurrentMonth(now.getMonth());
              setCurrentYear(now.getFullYear());
            }}
            className="px-2.5 py-1 text-xs rounded-md border border-[#25272b] text-neutral-300 hover:text-white hover:bg-white/5"
          >
            Hoje
          </button>
        </div>

        {/* Filter by event type */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'entrevista', label: 'Entrevistas' },
            { key: 'teste_tecnico', label: 'Testes técnicos' },
            { key: 'lembrete', label: 'Lembretes' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterType(item.key)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterType === item.key
                  ? 'bg-[#2a2c30] text-white'
                  : 'text-neutral-400 hover:text-neutral-200 dark:text-[#a1a4aa] dark:hover:text-[#f4f5f6]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Calendar Days */}
      <div className="rounded-2xl overflow-hidden bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200">
        {/* Day Names Header */}
        <div className="grid grid-cols-7 border-b border-[#25272b] dark:border-[#25272b] light:border-neutral-200 bg-[#202226] text-center text-xs font-semibold text-neutral-400 py-2.5">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 auto-rows-[115px] sm:auto-rows-[130px] divide-x divide-y divide-[#25272b]/60 dark:divide-[#25272b]/60 light:divide-neutral-200">
          {calendarGrid.map((cell, idx) => {
            const dayEvents = filteredEvents.filter((e) => e.date === cell.dateStr);
            const isToday = cell.dateStr === todayISO;

            return (
              <div
                key={idx}
                className={`p-1.5 sm:p-2 overflow-y-auto flex flex-col justify-between transition-colors ${
                  !cell.isCurrentMonth
                    ? 'opacity-30 bg-[#0b0c0e]/20'
                    : isToday
                    ? 'bg-white/[0.06]'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs tabular-nums tabular-nums ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-[#3FBF8A] text-black flex items-center justify-center font-semibold'
                        : 'text-neutral-400'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs tabular-nums text-neutral-500">
                      {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
                    </span>
                  )}
                </div>

                {/* Event Tags inside Day Cell */}
                <div className="space-y-1 mt-1 flex-1">
                  {dayEvents.map((evt) => {
                    const isInterview = evt.type === 'entrevista';
                    const isTest = evt.type === 'teste_tecnico';

                    return (
                      <div
                        key={evt.id}
                        className={`p-1 rounded text-xs border truncate leading-tight cursor-pointer ${
                          evt.completed
                            ? 'opacity-40 line-through bg-neutral-800/40 border-neutral-700 text-neutral-400'
                            : isInterview
                            ? 'bg-white/[0.06] border-[#5a5d63] text-white'
                            : isTest
                            ? 'bg-[#e5a93b]/20 border-[#e5a93b]/40 text-[#f3c276]'
                            : 'bg-[#3FBF8A]/20 border-[#3FBF8A]/40 text-[#5ce0a8]'
                        }`}
                        title={`${evt.title} (${evt.time})`}
                        onClick={() => toggleEventCompleted(evt.id)}
                      >
                        <span className="tabular-nums mr-1">{evt.time}</span>
                        <span className="font-medium truncate">{evt.company}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Undated / Pending Date Events Section */}
      {undatedEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
                Aguardando definição de data ({undatedEvents.length})
              </h2>
              <p className="text-xs text-[#a1a4aa]">
                Entrevistas e testes técnicos com data ainda em aberto pelo recrutador.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {undatedEvents.map((evt) => {
              const isInterview = evt.type === 'entrevista';
              const isTest = evt.type === 'teste_tecnico';

              return (
                <div
                  key={evt.id}
                  className={`p-4 rounded-2xl bg-[#16181b] border border-[#4a3c1c] flex flex-col justify-between ${
                    evt.completed ? 'opacity-60' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isInterview
                              ? 'bg-[#3FBF8A]'
                              : isTest
                              ? 'bg-[#e5a93b]'
                              : 'bg-[#3FBF8A]'
                          }`}
                        />
                        <h3 className="font-semibold text-xs text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 truncate">
                          {evt.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleEventCompleted(evt.id)}
                          className={`p-1 rounded transition-colors ${
                            evt.completed
                              ? 'text-[#3FBF8A]'
                              : 'text-neutral-400 hover:text-[#3FBF8A]'
                          }`}
                          title={evt.completed ? 'Reabrir' : 'Concluir'}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEvent(evt.id)}
                          className="p-1 rounded text-neutral-400 hover:text-[#e5484d]"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 truncate">
                        {evt.company} · {evt.role}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#2b2414] text-[#e5a93b] border border-[#4a3c1c] text-xs shrink-0">
                        Sem data definida
                      </span>
                    </div>

                    {evt.notes && (
                      <p className="text-xs text-neutral-300 dark:text-neutral-300 bg-[#202226] p-2.5 rounded-lg border-[#25272b]/60 mt-2.5 leading-relaxed">
                        {evt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs mt-3 pt-2.5 border-t border-[#25272b]/60">
                    <span className="text-[#a1a4aa]">Data a definir</span>
                    <button
                      type="button"
                      onClick={() => openDefineDateModal(evt)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Definir data e horário</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled Active Events List below Calendar */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
          Lista de compromissos agendados ({scheduledEvents.length})
        </h2>

        {scheduledEvents.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#16181b] border border-[#25272b] text-center">
            <p className="text-xs text-[#a1a4aa]">
              Nenhum compromisso futuro agendado no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {scheduledEvents.map((evt) => {
              const isInterview = evt.type === 'entrevista';
              const isTest = evt.type === 'teste_tecnico';

              return (
                <div
                  key={evt.id}
                  className="p-4 rounded-2xl bg-[#16181b] border border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isInterview
                              ? 'bg-[#3FBF8A]'
                              : isTest
                              ? 'bg-[#e5a93b]'
                              : 'bg-[#3FBF8A]'
                          }`}
                        />
                        <h3 className="font-semibold text-xs text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 truncate">
                          {evt.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleEventCompleted(evt.id)}
                          className="p-1 rounded transition-colors text-neutral-400 hover:text-[#3FBF8A]"
                          title="Marcar como concluído"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEvent(evt.id)}
                          className="p-1 rounded text-neutral-400 hover:text-[#e5484d]"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 truncate">
                        {evt.company} · {evt.role}
                      </p>
                      {evt.googleEventId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#13261d] text-[#5ad19e] border border-[#1f4632] text-xs shrink-0">
                          Sincronizado
                        </span>
                      )}
                    </div>

                    {evt.notes && (
                      <p className="text-xs text-neutral-300 dark:text-neutral-300 bg-[#202226] p-2.5 rounded-lg border-[#25272b]/60 mt-2.5 leading-relaxed">
                        {evt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-neutral-400 mt-3 pt-2.5 border-t border-[#25272b]/60">
                    <button
                      type="button"
                      onClick={() => openDefineDateModal(evt)}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      title="Clique para editar data ou horário"
                    >
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>
                        {formatDatePT(evt.date)} às {evt.time}
                      </span>
                    </button>

                    <div className="flex items-center gap-2.5">
                      {!evt.googleEventId && (
                        <button
                          type="button"
                          onClick={() => void syncEventToGoogleCalendar(evt.id)}
                          className="flex items-center gap-1 text-[#c8cace] hover:text-white hover:underline"
                          title="Enviar para o Google Agenda"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Google Agenda</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => downloadEventICS(evt)}
                        className="flex items-center gap-1 text-[#a1a4aa] hover:text-white hover:underline"
                        title="Baixar arquivo .ics para Agenda do Celular (iOS / Android)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.ics</span>
                      </button>

                      {evt.meetingUrl && (
                        <a
                          href={evt.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#f4f5f6] hover:underline"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Entrar</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Events List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
              Lista de eventos concluídos ({completedEvents.length})
            </h2>
            <p className="text-xs text-[#a1a4aa]">
              Compromissos já realizados ou encerrados automaticamente após a data agendada.
            </p>
          </div>
        </div>

        {completedEvents.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#16181b] border border-[#25272b] text-center">
            <p className="text-xs text-[#a1a4aa]">
              Nenhum evento concluído registrado ainda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {completedEvents.map((evt) => {
              const isInterview = evt.type === 'entrevista';
              const isTest = evt.type === 'teste_tecnico';

              return (
                <div
                  key={evt.id}
                  className="p-4 rounded-2xl bg-[#16181b] border border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 flex flex-col justify-between opacity-75"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isInterview
                              ? 'bg-[#3FBF8A]'
                              : isTest
                              ? 'bg-[#e5a93b]'
                              : 'bg-[#3FBF8A]'
                          }`}
                        />
                        <h3 className="font-semibold text-xs text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 truncate line-through">
                          {evt.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleEventCompleted(evt.id)}
                          className="p-1 rounded transition-colors text-[#3FBF8A] hover:text-[#f4f5f6]"
                          title="Reabrir compromisso"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEvent(evt.id)}
                          className="p-1 rounded text-neutral-400 hover:text-[#e5484d]"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 truncate">
                        {evt.company} · {evt.role}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#13261d] text-[#5ad19e] border border-[#1f4632] text-xs shrink-0">
                        Concluído
                      </span>
                    </div>

                    {evt.notes && (
                      <p className="text-xs text-neutral-300 dark:text-neutral-300 bg-[#202226] p-2.5 rounded-lg border-[#25272b]/60 mt-2.5 leading-relaxed">
                        {evt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-neutral-400 mt-3 pt-2.5 border-t border-[#25272b]/60">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>
                        {evt.date
                          ? `${formatDatePT(evt.date)}${evt.time ? ` às ${evt.time}` : ''}`
                          : 'Concluído sem data'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDefineDateModal(evt)}
                      className="flex items-center gap-1 text-[#a1a4aa] hover:text-white hover:underline"
                      title="Reagendar para uma nova data"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Reagendar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Agendar Evento / Definir Data */}
      {isAddEventModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl p-6 bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#25272b]">
              <div>
                <h3 className="text-sm font-semibold">
                  {cameFromStatusUpdate
                    ? `Agendar ${newEventType === 'entrevista' ? 'Entrevista' : 'Teste técnico'} na Agenda`
                    : editingEventId
                    ? 'Definir data e horário do compromisso'
                    : 'Agendar nova atividade'}
                </h3>
                {cameFromStatusUpdate && (
                  <p className="text-xs text-[#a1a4aa] mt-0.5">
                    Defina a data abaixo ou simplesmente feche este card para manter como &quot;Sem data definida&quot;.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded text-neutral-400 hover:text-white"
                title={cameFromStatusUpdate ? 'Fechar e manter sem data definida' : 'Fechar'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
              {/* Vincular candidatura */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Vincular a uma candidatura existente
                </label>
                <select
                  value={selectedAppId}
                  onChange={(e) => handleAppSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] outline-hidden"
                >
                  <option value="">Selecione uma vaga (opcional)...</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id} className="bg-[#16181b]">
                      {app.company} · {app.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título do evento */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Título do evento <span className="text-[#e5484d]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Entrevista com Tech Lead"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Empresa */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Empresa <span className="text-[#e5484d]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da empresa"
                    value={newEventCompany}
                    onChange={(e) => setNewEventCompany(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] outline-hidden"
                  />
                </div>

                {/* Tipo de evento */}
                <div>
                  <label className="block text-xs font-medium mb-1">Tipo de evento</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as EventType)}
                    className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] outline-hidden"
                  >
                    <option value="entrevista" className="bg-[#16181b]">Entrevista</option>
                    <option value="teste_tecnico" className="bg-[#16181b]">Teste técnico</option>
                    <option value="lembrete" className="bg-[#16181b]">Lembrete / Follow-up</option>
                    <option value="outro" className="bg-[#16181b]">Outro</option>
                  </select>
                </div>
              </div>

              {/* Opção Sem Data Definida */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#25272b] bg-[#202226] text-xs text-[#c8cace] cursor-pointer">
                <input
                  type="checkbox"
                  checked={withoutDate}
                  onChange={(e) => setWithoutDate(e.target.checked)}
                  className="rounded border-[#5a5d63] accent-white"
                />
                <span>Ainda sem data definida (deixar pendente para agendar depois)</span>
              </label>

              {!withoutDate ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Data */}
                    <div>
                      <label className="block text-xs font-medium mb-1">Data</label>
                      <input
                        type="date"
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        required={!withoutDate}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] outline-hidden"
                      />
                    </div>

                    {/* Horário */}
                    <div>
                      <label className="block text-xs font-medium mb-1">Horário (mín. 1h entre eventos)</label>
                      <input
                        type="time"
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                        required={!withoutDate}
                        className={`w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] text-[#f4f5f6] outline-hidden ${
                          conflictingEvent ? 'border-[#e5484d]' : 'border-[#25272b]'
                        }`}
                      />
                    </div>
                  </div>

                  {conflictingEvent && (
                    <div className="p-2.5 rounded-lg bg-[#2c1a1c] border border-[#4d2427] text-xs text-[#f07a7e]">
                      Conflito de horário: <strong>{conflictingEvent.title}</strong> ({conflictingEvent.company}) já está agendado para este dia às <strong>{conflictingEvent.time}</strong>. Só é permitido salvar com pelo menos <strong>1 hora de diferença</strong>.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#2b2414] border border-[#4a3c1c] text-xs text-[#e5a93b]">
                  O evento ficará salvo em <strong>Aguardando definição de data</strong>. Assim que o recrutador confirmar o dia e horário, basta clicar em <em>Definir data e horário</em>.
                </div>
              )}

              {/* Link da reunião */}
              <div>
                <label className="block text-xs font-medium mb-1">Link da reunião / Sala</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={newEventMeetingUrl}
                  onChange={(e) => setNewEventMeetingUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] outline-hidden"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium mb-1">Notas de preparação</label>
                <textarea
                  rows={2}
                  placeholder="Pontos para revisar antes da reunião..."
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border text-xs bg-[#0b0c0e] border-[#25272b] text-[#f4f5f6] outline-hidden resize-none"
                />
              </div>

              {/* Google Calendar Sync Mode */}
              {!withoutDate && (
                googleCalendarConnected ? (
                  <div className="p-2.5 rounded-lg bg-[#13261d] border border-[#1f4632] text-xs text-[#5ad19e] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3FBF8A] shrink-0" />
                    <span>
                      Sincronização automática ativa: esta reunião será salva direto na sua agenda do Google.
                    </span>
                  </div>
                ) : (
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#202226] text-xs text-[#c8cace] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openInGCalAfterSave}
                      onChange={(e) => setOpenInGCalAfterSave(e.target.checked)}
                      className="rounded border-[#5a5d63] accent-white"
                    />
                    <span>Abrir no Google Agenda automaticamente após salvar</span>
                  </label>
                )
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[#25272b]">
                {!cameFromStatusUpdate && (
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-3 py-1.5 rounded-lg border border-[#25272b] text-xs text-neutral-300 hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                )}

                {!withoutDate && (
                  <button
                    type="button"
                    onClick={() => saveEventInternal(true)}
                    className="px-3 py-1.5 rounded-lg border border-[#4a3c1c] bg-[#2b2414] text-xs font-medium text-[#e5a93b] hover:opacity-90 transition-opacity"
                  >
                    Deixar sem data
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!withoutDate && Boolean(conflictingEvent)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-opacity ${
                    !withoutDate && conflictingEvent
                      ? 'bg-[#25272b] text-[#6b6e74] cursor-not-allowed opacity-60'
                      : 'text-black bg-white hover:bg-[#e5e5e5]'
                  }`}
                >
                  {withoutDate
                    ? 'Salvar sem data'
                    : editingEventId
                    ? 'Salvar data na Agenda'
                    : 'Salvar na Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
