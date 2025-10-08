-- Create tables for RAG-based AI learning system

-- 1. Provider-specific AI instructions
CREATE TABLE public.provider_ai_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  instruction_text TEXT NOT NULL,
  instruction_category TEXT DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.provider_ai_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view provider AI instructions"
  ON public.provider_ai_instructions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert provider AI instructions"
  ON public.provider_ai_instructions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update provider AI instructions"
  ON public.provider_ai_instructions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete provider AI instructions"
  ON public.provider_ai_instructions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_provider_ai_instructions_updated_at
  BEFORE UPDATE ON public.provider_ai_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Project/Area-specific AI instructions
CREATE TABLE public.project_ai_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  area_name TEXT,
  instruction_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.project_ai_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view project AI instructions"
  ON public.project_ai_instructions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert project AI instructions"
  ON public.project_ai_instructions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update project AI instructions"
  ON public.project_ai_instructions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete project AI instructions"
  ON public.project_ai_instructions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_project_ai_instructions_updated_at
  BEFORE UPDATE ON public.project_ai_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. User AI Memory (for Rokki)
CREATE TABLE public.user_ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL,
  memory_content TEXT NOT NULL,
  importance SMALLINT DEFAULT 5 NOT NULL,
  last_referenced TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI memory"
  ON public.user_ai_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI memory"
  ON public.user_ai_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI memory"
  ON public.user_ai_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI memory"
  ON public.user_ai_memory FOR DELETE
  USING (auth.uid() = user_id);

-- 4. User Conversations (for Rokki)
CREATE TABLE public.user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_role TEXT NOT NULL,
  message_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.user_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON public.user_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. User Daily Context (for Rokki)
CREATE TABLE public.user_daily_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  context_date DATE DEFAULT CURRENT_DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_contacts INTEGER DEFAULT 0,
  working_hours NUMERIC DEFAULT 0,
  mood_score SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, context_date)
);

ALTER TABLE public.user_daily_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily context"
  ON public.user_daily_context FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily context"
  ON public.user_daily_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily context"
  ON public.user_daily_context FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_provider_ai_instructions_provider_id ON public.provider_ai_instructions(provider_id);
CREATE INDEX idx_project_ai_instructions_project_id ON public.project_ai_instructions(project_id);
CREATE INDEX idx_user_ai_memory_user_id ON public.user_ai_memory(user_id);
CREATE INDEX idx_user_ai_memory_importance ON public.user_ai_memory(importance DESC);
CREATE INDEX idx_user_conversations_user_id ON public.user_conversations(user_id);
CREATE INDEX idx_user_conversations_created_at ON public.user_conversations(created_at DESC);
CREATE INDEX idx_user_daily_context_user_date ON public.user_daily_context(user_id, context_date DESC);