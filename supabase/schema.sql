-- ============================================================================
-- JobFlow — Schema PostgreSQL para Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================================

-- 1. Tabela de versões de currículo
CREATE TABLE IF NOT EXISTS public.cv_versions (
  id text PRIMARY KEY,
  title text NOT NULL,
  filename text NOT NULL,
  updated_at text NOT NULL,
  focus text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabela de candidaturas a vagas
CREATE TABLE IF NOT EXISTS public.job_applications (
  id text PRIMARY KEY,
  company text NOT NULL,
  role text NOT NULL,
  job_url text DEFAULT '',
  platform text NOT NULL,
  location text NOT NULL DEFAULT '',
  modality text NOT NULL CHECK (modality IN ('remoto', 'hibrido', 'presencial')),
  contract_type text NOT NULL CHECK (contract_type IN ('CLT', 'PJ', 'Estágio', 'Temporário')),
  salary_range text DEFAULT '',
  applied_date text NOT NULL,
  updated_date text NOT NULL,
  status text NOT NULL CHECK (
    status IN (
      'candidatado',
      'em_analise',
      'entrevista',
      'teste_tecnico',
      'proposta',
      'aprovado',
      'reprovado',
      'sem_resposta',
      'desistencia'
    )
  ),
  priority text NOT NULL CHECK (priority IN ('baixa', 'media', 'alta')),
  cv_version text NOT NULL DEFAULT '',
  technologies text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  activity_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  company_logo_color text DEFAULT '#3FBF8A',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Tabela de eventos da agenda (entrevistas, testes técnicos, lembretes)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id text PRIMARY KEY,
  application_id text REFERENCES public.job_applications(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('entrevista', 'teste_tecnico', 'lembrete', 'outro')),
  date text NOT NULL,
  time text NOT NULL,
  meeting_url text DEFAULT '',
  notes text DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Tabela de notificações do sistema
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  timestamp text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  type text NOT NULL CHECK (type IN ('interview', 'reminder', 'update', 'system')),
  application_id text REFERENCES public.job_applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices úteis para ordenação e filtros
CREATE INDEX IF NOT EXISTS idx_job_applications_applied_date ON public.job_applications(applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_updated_date ON public.job_applications(updated_date DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date ASC);

-- Habilitar RLS com políticas abertas para uso pessoal (acesso via anon key)
ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cv_versions' AND policyname = 'Allow all on cv_versions'
  ) THEN
    CREATE POLICY "Allow all on cv_versions" ON public.cv_versions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'job_applications' AND policyname = 'Allow all on job_applications'
  ) THEN
    CREATE POLICY "Allow all on job_applications" ON public.job_applications FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'calendar_events' AND policyname = 'Allow all on calendar_events'
  ) THEN
    CREATE POLICY "Allow all on calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Allow all on notifications'
  ) THEN
    CREATE POLICY "Allow all on notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
