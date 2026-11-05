export type ApplicationStatus =
  | 'candidatado'
  | 'em_analise'
  | 'entrevista'
  | 'teste_tecnico'
  | 'proposta'
  | 'aprovado'
  | 'reprovado'
  | 'sem_resposta'
  | 'desistencia';

export type Modality = 'remoto' | 'hibrido' | 'presencial';

export type ContractType = 'CLT' | 'PJ' | 'Estágio' | 'Temporário';

export type Priority = 'baixa' | 'media' | 'alta';

export type JobPlatform =
  | 'LinkedIn'
  | 'Gupy'
  | 'Indeed'
  | 'Site da empresa'
  | 'Glassdoor'
  | 'Catho'
  | 'Programa de Talentos'
  | 'Indicação'
  | 'Outra';

export interface ActivityEvent {
  id: string;
  date: string; // ISO date format YYYY-MM-DD
  time?: string; // HH:mm
  title: string;
  description?: string;
  type: 'status_change' | 'note' | 'interview' | 'test' | 'created';
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  jobUrl?: string;
  platform: JobPlatform;
  location: string;
  modality: Modality;
  contractType: ContractType;
  salaryRange?: string;
  appliedDate: string; // YYYY-MM-DD
  updatedDate: string; // YYYY-MM-DD
  status: ApplicationStatus;
  priority: Priority;
  cvVersion: string;
  technologies: string[];
  description: string;
  notes: string;
  activityHistory: ActivityEvent[];
  companyLogoColor?: string;
}

export type EventType = 'entrevista' | 'teste_tecnico' | 'lembrete' | 'outro';

export interface CalendarEvent {
  id: string;
  applicationId?: string;
  title: string;
  company: string;
  role: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  meetingUrl?: string;
  notes?: string;
  completed: boolean;
  googleEventId?: string;
}

export interface CVVersion {
  id: string;
  title: string;
  filename: string;
  updatedAt: string;
  focus: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'interview' | 'reminder' | 'update' | 'system';
  applicationId?: string;
}

export interface PendingScheduleDraft {
  eventId: string;
  applicationId: string;
  company: string;
  role: string;
  type: 'entrevista' | 'teste_tecnico';
  title: string;
}

export type ActiveView =
  | 'dashboard'
  | 'applications'
  | 'new_application'
  | 'kanban'
  | 'calendar'
  | 'stats'
  | 'settings';
