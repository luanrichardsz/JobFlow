import { CalendarEvent, EventType } from '../types';

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

export const isGoogleCalendarConfigured = Boolean(GOOGLE_CLIENT_ID);

const GCAL_TOKEN_STORAGE_KEY = 'jobflow_gcal_token_v1';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  entrevista: 'Entrevista',
  teste_tecnico: 'Teste técnico',
  lembrete: 'Lembrete',
  outro: 'Compromisso',
};

// ============================================================================
// 1. Direct Google Calendar Template URL (1-click fallback, no API key needed)
// ============================================================================

function toLocalDateTimeBasic(dateStr: string, timeStr: string, addMinutes = 0): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const [hh, mm] = (timeStr || '09:00').split(':').map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 9, (mm || 0) + addMinutes, 0);

  const yy = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const da = String(dt.getDate()).padStart(2, '0');
  const hr = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${yy}${mo}${da}T${hr}${mi}00`;
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const typeLabel = EVENT_TYPE_LABEL[event.type] || 'Evento';
  const title = `${event.title} · ${event.company}`;
  const start = toLocalDateTimeBasic(event.date, event.time, 0);
  const end = toLocalDateTimeBasic(event.date, event.time, 60);

  const detailLines = [
    `Tipo: ${typeLabel}`,
    `Empresa: ${event.company}`,
    `Cargo: ${event.role}`,
  ];
  if (event.meetingUrl) {
    detailLines.push(`Link da reunião: ${event.meetingUrl}`);
  }
  if (event.notes) {
    detailLines.push('', `Observações: ${event.notes}`);
  }
  detailLines.push('', 'Agendado via JobFlow');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: detailLines.join('\n'),
  });

  if (event.meetingUrl) {
    params.set('location', event.meetingUrl);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openInGoogleCalendar(event: CalendarEvent): void {
  const url = buildGoogleCalendarUrl(event);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ============================================================================
// 2. Universal .ics Generator (iPhone / Android / Outlook with 30m reminder)
// ============================================================================

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function buildVEventBlock(event: CalendarEvent): string {
  const start = toLocalDateTimeBasic(event.date, event.time, 0);
  const end = toLocalDateTimeBasic(event.date, event.time, 60);
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const typeLabel = EVENT_TYPE_LABEL[event.type] || 'Evento';

  const descParts = [
    `${typeLabel} — ${event.company} (${event.role})`,
    event.meetingUrl ? `Link: ${event.meetingUrl}` : '',
    event.notes ? `Notas: ${event.notes}` : '',
  ].filter(Boolean);

  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@jobflow.local`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(`${event.title} · ${event.company}`)}`,
    `DESCRIPTION:${escapeICS(descParts.join('\n'))}`,
  ];

  if (event.meetingUrl) {
    lines.push(`LOCATION:${escapeICS(event.meetingUrl)}`);
    lines.push(`URL:${escapeICS(event.meetingUrl)}`);
  }

  // Native 30-minute phone notification alarm
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICS(`Lembrete: ${event.title} (${event.company})`)}`,
    'END:VALARM',
    'END:VEVENT'
  );

  return lines.join('\r\n');
}

function triggerICSDownload(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadEventICS(event: CalendarEvent): void {
  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobFlow//Agenda de Entrevistas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    buildVEventBlock(event),
    'END:VCALENDAR',
  ].join('\r\n');

  const safeSlug = `${event.company}_${event.date}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_');
  triggerICSDownload(cal, `jobflow_${safeSlug}.ics`);
}

export function exportAllEventsICS(events: CalendarEvent[]): void {
  const datedEvents = events.filter((e) => Boolean(e.date && e.date.trim()));
  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobFlow//Agenda de Entrevistas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:JobFlow · Entrevistas',
    ...datedEvents.map(buildVEventBlock),
    'END:VCALENDAR',
  ].join('\r\n');

  const today = new Date().toISOString().split('T')[0];
  triggerICSDownload(cal, `jobflow_agenda_${today}.ics`);
}

// ============================================================================
// 3. Automatic Google Calendar API v3 Sync (OAuth 2.0 via Google Identity)
// ============================================================================

interface StoredGCalToken {
  accessToken: string;
  expiresAt: number;
}

export function getStoredGoogleToken(): string | null {
  try {
    const raw = localStorage.getItem(GCAL_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGCalToken;
    // Give 60s buffer before expiry
    if (parsed.accessToken && parsed.expiresAt > Date.now() + 60_000) {
      return parsed.accessToken;
    }
    localStorage.removeItem(GCAL_TOKEN_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function clearStoredGoogleToken(): void {
  try {
    localStorage.removeItem(GCAL_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Falha ao carregar Google Identity Services'))
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
    document.head.appendChild(script);
  });
}

export async function requestGoogleCalendarToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID não configurado no .env');
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      reject(new Error('SDK de autenticação do Google indisponível'));
      return;
    }

    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GCAL_SCOPE,
      callback: (resp: GoogleTokenResponse) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || 'Autorização cancelada'));
          return;
        }
        const expiresInSec = Number(resp.expires_in) || 3599;
        const stored: StoredGCalToken = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + expiresInSec * 1000,
        };
        localStorage.setItem(GCAL_TOKEN_STORAGE_KEY, JSON.stringify(stored));
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        reject(new Error(err?.message || err?.type || 'Falha ao autenticar com o Google'));
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}

function buildGoogleApiEventPayload(event: CalendarEvent) {
  const [y, m, d] = event.date.split('-').map((n) => parseInt(n, 10));
  const [hh, mm] = (event.time || '09:00').split(':').map((n) => parseInt(n, 10));
  const startDt = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0, 0);
  const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  const typeLabel = EVENT_TYPE_LABEL[event.type] || 'Evento';

  const descLines = [
    `Tipo: ${typeLabel}`,
    `Empresa: ${event.company}`,
    `Cargo: ${event.role}`,
    event.meetingUrl ? `Link da reunião: ${event.meetingUrl}` : '',
    event.notes ? `\nObservações:\n${event.notes}` : '',
    '\nSincronizado automaticamente pelo JobFlow',
  ].filter(Boolean);

  return {
    summary: `${event.title} · ${event.company}`,
    location: event.meetingUrl || undefined,
    description: descLines.join('\n'),
    start: {
      dateTime: startDt.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDt.toISOString(),
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<string | null> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGoogleApiEventPayload(event)),
    }
  );

  if (res.status === 401) {
    clearStoredGoogleToken();
    throw new Error('Sessão do Google Calendar expirada. Reconecte sua conta Google.');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro Google Calendar API (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { id?: string };
  return data.id || null;
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string,
  event: CalendarEvent
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      googleEventId
    )}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGoogleApiEventPayload(event)),
    }
  );

  if (res.status === 401) {
    clearStoredGoogleToken();
    throw new Error('Sessão do Google Calendar expirada.');
  }

  return res.ok;
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      googleEventId
    )}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (res.status === 401) {
    clearStoredGoogleToken();
  }

  return res.ok || res.status === 404 || res.status === 410;
}

