import { createClient } from '@supabase/supabase-js';
import {
  JobApplication,
  CalendarEvent,
  CVVersion,
  AppNotification,
  ActivityEvent,
  ApplicationStatus,
  Modality,
  ContractType,
  Priority,
  JobPlatform,
  EventType,
} from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================================================
// Database Row <-> Domain Model Mappers
// ============================================================================

export interface DbJobApplicationRow {
  id: string;
  company: string;
  role: string;
  job_url: string | null;
  platform: string;
  location: string;
  modality: string;
  contract_type: string;
  salary_range: string | null;
  applied_date: string;
  updated_date: string;
  status: string;
  priority: string;
  cv_version: string;
  technologies: string[] | null;
  description: string | null;
  notes: string | null;
  activity_history: ActivityEvent[] | null;
  company_logo_color: string | null;
}

export function mapRowToApplication(row: DbJobApplicationRow): JobApplication {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    jobUrl: row.job_url || '',
    platform: row.platform as JobPlatform,
    location: row.location || '',
    modality: row.modality as Modality,
    contractType: row.contract_type as ContractType,
    salaryRange: row.salary_range || '',
    appliedDate: row.applied_date,
    updatedDate: row.updated_date,
    status: row.status as ApplicationStatus,
    priority: row.priority as Priority,
    cvVersion: row.cv_version || '',
    technologies: Array.isArray(row.technologies) ? row.technologies : [],
    description: row.description || '',
    notes: row.notes || '',
    activityHistory: Array.isArray(row.activity_history) ? row.activity_history : [],
    companyLogoColor: row.company_logo_color || '#3FBF8A',
  };
}

export function mapApplicationToRow(app: JobApplication): DbJobApplicationRow {
  return {
    id: app.id,
    company: app.company,
    role: app.role,
    job_url: app.jobUrl || '',
    platform: app.platform,
    location: app.location,
    modality: app.modality,
    contract_type: app.contractType,
    salary_range: app.salaryRange || '',
    applied_date: app.appliedDate,
    updated_date: app.updatedDate,
    status: app.status,
    priority: app.priority,
    cv_version: app.cvVersion,
    technologies: app.technologies,
    description: app.description,
    notes: app.notes,
    activity_history: app.activityHistory,
    company_logo_color: app.companyLogoColor || '#3FBF8A',
  };
}

export interface DbCalendarEventRow {
  id: string;
  application_id: string | null;
  title: string;
  company: string;
  role: string;
  type: string;
  date: string;
  time: string;
  meeting_url: string | null;
  notes: string | null;
  completed: boolean;
  google_event_id?: string | null;
}

export function mapRowToEvent(row: DbCalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    applicationId: row.application_id || undefined,
    title: row.title,
    company: row.company || '',
    role: row.role || '',
    type: row.type as EventType,
    date: row.date,
    time: row.time,
    meetingUrl: row.meeting_url || '',
    notes: row.notes || '',
    completed: Boolean(row.completed),
    googleEventId: row.google_event_id || undefined,
  };
}

export function mapEventToRow(evt: CalendarEvent): DbCalendarEventRow {
  const row: DbCalendarEventRow = {
    id: evt.id,
    application_id: evt.applicationId || null,
    title: evt.title,
    company: evt.company,
    role: evt.role,
    type: evt.type,
    date: evt.date,
    time: evt.time,
    meeting_url: evt.meetingUrl || '',
    notes: evt.notes || '',
    completed: evt.completed,
  };
  if (evt.googleEventId !== undefined) {
    row.google_event_id = evt.googleEventId;
  }
  return row;
}

export interface DbCVVersionRow {
  id: string;
  title: string;
  filename: string;
  updated_at: string;
  focus: string;
}

export function mapRowToCV(row: DbCVVersionRow): CVVersion {
  return {
    id: row.id,
    title: row.title,
    filename: row.filename,
    updatedAt: row.updated_at,
    focus: row.focus || '',
  };
}

export function mapCVToRow(cv: CVVersion): DbCVVersionRow {
  return {
    id: cv.id,
    title: cv.title,
    filename: cv.filename,
    updated_at: cv.updatedAt,
    focus: cv.focus,
  };
}

export interface DbNotificationRow {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: string;
  application_id: string | null;
}

export function mapRowToNotification(row: DbNotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    timestamp: row.timestamp,
    read: Boolean(row.read),
    type: row.type as AppNotification['type'],
    applicationId: row.application_id || undefined,
  };
}

export function mapNotificationToRow(n: AppNotification): DbNotificationRow {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    timestamp: n.timestamp,
    read: n.read,
    type: n.type,
    application_id: n.applicationId || null,
  };
}

