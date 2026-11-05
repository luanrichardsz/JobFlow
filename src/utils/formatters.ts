import { ApplicationStatus, Priority, Modality } from '../types';

// Status colour carries meaning, not category: neutral while waiting, amber when something
// needs preparing (interview, test), the data green for offers, red for a rejection.
export const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    kanbanColumn: string;
  }
> = {
  candidatado: {
    label: 'Candidatado',
    bg: 'bg-[#222428]',
    text: 'text-[#f4f5f6]',
    border: 'border-[#2e3034]',
    dot: 'bg-[#6b6e74]',
    kanbanColumn: 'Candidatado',
  },
  em_analise: {
    label: 'Em análise',
    bg: 'bg-[#222428]',
    text: 'text-[#f4f5f6]',
    border: 'border-[#2e3034]',
    dot: 'bg-[#a1a4aa]',
    kanbanColumn: 'Em análise',
  },
  entrevista: {
    label: 'Entrevista',
    bg: 'bg-[#2b2414]',
    text: 'text-[#e5a93b]',
    border: 'border-[#4a3c1c]',
    dot: 'bg-[#e5a93b]',
    kanbanColumn: 'Entrevista',
  },
  teste_tecnico: {
    label: 'Teste técnico',
    bg: 'bg-[#2b2414]',
    text: 'text-[#e5a93b]',
    border: 'border-[#4a3c1c]',
    dot: 'bg-[#e5a93b]',
    kanbanColumn: 'Teste técnico',
  },
  proposta: {
    label: 'Proposta',
    bg: 'bg-[#13261d]',
    text: 'text-[#5ad19e]',
    border: 'border-[#1f4632]',
    dot: 'bg-[#3FBF8A]',
    kanbanColumn: 'Proposta',
  },
  aprovado: {
    label: 'Aprovado',
    bg: 'bg-[#13261d]',
    text: 'text-[#5ad19e]',
    border: 'border-[#1f4632]',
    dot: 'bg-[#3FBF8A]',
    kanbanColumn: 'Finalizado',
  },
  reprovado: {
    label: 'Reprovado',
    bg: 'bg-[#2c1a1c]',
    text: 'text-[#f07a7e]',
    border: 'border-[#4d2427]',
    dot: 'bg-[#e5484d]',
    kanbanColumn: 'Finalizado',
  },
  sem_resposta: {
    label: 'Sem resposta',
    bg: 'bg-[#1c1e21]',
    text: 'text-[#a1a4aa]',
    border: 'border-[#2a2c30]',
    dot: 'bg-[#6b6e74]',
    kanbanColumn: 'Sem resposta',
  },
  desistencia: {
    label: 'Desistência',
    bg: 'bg-[#1c1e21]',
    text: 'text-[#a1a4aa]',
    border: 'border-[#2a2c30]',
    dot: 'bg-[#4a4d52]',
    kanbanColumn: 'Finalizado',
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; text: string; bg: string; border: string; indicator: string }
> = {
  alta: {
    label: 'Alta',
    text: 'text-[#e5a93b]',
    bg: 'bg-[#2b2414]',
    border: 'border-[#4a3c1c]',
    indicator: '!!!',
  },
  media: {
    label: 'Média',
    text: 'text-[#f4f5f6]',
    bg: 'bg-[#222428]',
    border: 'border-[#2e3034]',
    indicator: '!!',
  },
  baixa: {
    label: 'Baixa',
    text: 'text-[#a1a4aa]',
    bg: 'bg-[#1c1e21]',
    border: 'border-[#2a2c30]',
    indicator: '!',
  },
};

// Modality is a category, not a state: it stays grey.
export const MODALITY_CONFIG: Record<
  Modality,
  { label: string; text: string; bg: string }
> = {
  remoto: { label: 'Remoto', text: 'text-[#c8cace]', bg: 'bg-[#222428]' },
  hibrido: { label: 'Híbrido', text: 'text-[#c8cace]', bg: 'bg-[#222428]' },
  presencial: { label: 'Presencial', text: 'text-[#c8cace]', bg: 'bg-[#222428]' },
};

export function formatDatePT(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return 'Data a definir';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${day} ${months[mIdx] || month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  if (dateStr === todayStr) return 'Hoje';
  const past = new Date(dateStr + 'T12:00:00');
  const todayNoon = new Date(todayStr + 'T12:00:00');
  const diffTime = Math.abs(todayNoon.getTime() - past.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem`;
  return formatDatePT(dateStr);
}

/**
 * Checks whether a scheduled calendar event's date/time has already passed.
 * - Undated events (date === '') never expire automatically.
 * - Any date strictly before today is considered passed.
 * - For today's events with a defined time (HH:mm), considers passed 1h after start time.
 */
export function hasEventPassed(
  evt: { date: string; time?: string },
  now: Date = new Date()
): boolean {
  if (!evt.date || !evt.date.trim()) return false;
  const parts = evt.date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;

  const [year, month, day] = parts;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const eventDayStart = new Date(year, month - 1, day).getTime();

  if (eventDayStart < todayStart) return true;
  if (eventDayStart > todayStart) return false;

  if (!evt.time || !evt.time.trim()) return false;
  const [hh, mm] = evt.time.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;

  const eventEndTime = new Date(year, month - 1, day, hh + 1, mm).getTime();
  return now.getTime() >= eventEndTime;
}
