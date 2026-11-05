import { AppNotification, CalendarEvent, JobApplication } from '../types';
import { formatDatePT, STATUS_CONFIG } from './formatters';

const DISMISSED_NOTIFS_KEY = 'jobflow_dismissed_notifs_v1';

export function getDismissedNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function addDismissedNotificationIds(ids: string[]): void {
  try {
    const current = getDismissedNotificationIds();
    ids.forEach((id) => current.add(id));
    // Keep only the most recent 300 dismissed IDs to prevent unbounded growth
    const trimmed = Array.from(current).slice(-300);
    localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export function clearDismissedNotificationIds(): void {
  try {
    localStorage.removeItem(DISMISSED_NOTIFS_KEY);
  } catch {
    // Ignore storage errors
  }
}

function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(dateStrA: string, dateStrB: string): number {
  const a = new Date(dateStrA + 'T12:00:00').getTime();
  const b = new Date(dateStrB + 'T12:00:00').getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export interface SmartNotificationDiff {
  nextNotifications: AppNotification[];
  toInsert: AppNotification[];
  toDeleteIds: string[];
}

/**
 * Evaluates applications and calendar events against the 5 smart alert rules:
 * 1. Event scheduled for TODAY (!completed)
 * 2. Event scheduled for TOMORROW (!completed)
 * 3. Event OVERDUE (date < today && !completed)
 * 4. Advanced stage follow-up (entrevista / teste_tecnico with >= 7 days without update)
 * 5. Stale application / possible ghosting (candidatado / em_analise with >= 14 days without update)
 */
export function computeSmartNotifications(
  applications: JobApplication[],
  events: CalendarEvent[],
  existingNotifications: AppNotification[],
  dismissedIds: Set<string>
): SmartNotificationDiff {
  const now = new Date();
  const todayISO = toLocalISODate(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowISO = toLocalISODate(tomorrowDate);

  const candidates: AppNotification[] = [];
  const validAutoIds = new Set<string>();

  // 1, 2, 3: Calendar Event Rules
  for (const evt of events) {
    if (evt.completed) continue;

    if (evt.date === todayISO) {
      const id = `notif_evt_today_${evt.id}_${evt.date}`;
      validAutoIds.add(id);
      candidates.push({
        id,
        title: `Hoje às ${evt.time}: ${evt.title}`,
        message: `${evt.company} · ${evt.role}. Prepare-se para o compromisso de hoje.`,
        timestamp: 'Hoje',
        read: false,
        type: 'interview',
        applicationId: evt.applicationId,
      });
    } else if (evt.date === tomorrowISO) {
      const id = `notif_evt_tomorrow_${evt.id}_${evt.date}`;
      validAutoIds.add(id);
      candidates.push({
        id,
        title: `Amanhã às ${evt.time}: ${evt.title}`,
        message: `${evt.company} · ${evt.role} agendado para amanhã.`,
        timestamp: 'Amanhã',
        read: false,
        type: 'interview',
        applicationId: evt.applicationId,
      });
    } else if (evt.date < todayISO) {
      const id = `notif_evt_overdue_${evt.id}_${evt.date}`;
      validAutoIds.add(id);
      candidates.push({
        id,
        title: `Compromisso pendente: ${evt.company}`,
        message: `"${evt.title}" (${formatDatePT(evt.date)}) ainda não foi concluído. Registre o feedback!`,
        timestamp: formatDatePT(evt.date),
        read: false,
        type: 'reminder',
        applicationId: evt.applicationId,
      });
    }
  }

  // 4 & 5: Application Follow-up & Stale Rules
  for (const app of applications) {
    const refDate = app.updatedDate || app.appliedDate;
    const elapsedDays = daysBetween(refDate, todayISO);

    if (
      (app.status === 'entrevista' || app.status === 'teste_tecnico') &&
      elapsedDays >= 7
    ) {
      const id = `notif_followup7_${app.id}_${refDate}`;
      validAutoIds.add(id);
      const statusLabel = STATUS_CONFIG[app.status]?.label || app.status;
      candidates.push({
        id,
        title: `Hora de follow-up · ${app.company}`,
        message: `A etapa "${statusLabel}" para ${app.role} está sem atualização há ${elapsedDays} dias.`,
        timestamp: `Há ${elapsedDays}d`,
        read: false,
        type: 'update',
        applicationId: app.id,
      });
    } else if (
      (app.status === 'candidatado' || app.status === 'em_analise') &&
      elapsedDays >= 14
    ) {
      const id = `notif_stale14_${app.id}_${refDate}`;
      validAutoIds.add(id);
      candidates.push({
        id,
        title: `${elapsedDays} dias sem retorno · ${app.company}`,
        message: `Considere cobrar retorno da vaga de ${app.role} ou marcar como "Sem resposta".`,
        timestamp: `Há ${elapsedDays}d`,
        read: false,
        type: 'reminder',
        applicationId: app.id,
      });
    }
  }

  // Identify obsolete auto-notifications (e.g. event was completed/deleted or app status changed)
  const isAutoNotification = (id: string) =>
    id.startsWith('notif_evt_') ||
    id.startsWith('notif_followup7_') ||
    id.startsWith('notif_stale14_');

  const toDeleteIds: string[] = [];
  const keptExisting: AppNotification[] = [];
  const existingById = new Map<string, AppNotification>();

  for (const existing of existingNotifications) {
    if (isAutoNotification(existing.id) && !validAutoIds.has(existing.id)) {
      toDeleteIds.push(existing.id);
    } else {
      keptExisting.push(existing);
      existingById.set(existing.id, existing);
    }
  }

  const toInsert: AppNotification[] = [];
  for (const candidate of candidates) {
    if (existingById.has(candidate.id) || dismissedIds.has(candidate.id)) {
      continue;
    }
    toInsert.push(candidate);
  }

  const nextNotifications = [...toInsert, ...keptExisting];

  return {
    nextNotifications,
    toInsert,
    toDeleteIds,
  };
}

