-- Tabelle für User-Aktivitäten (Tracking von Aufträgen, Statusänderungen)
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'order_created', 'status_changed', 'login', 'goal_set'
  metadata JSONB DEFAULT '{}'::jsonb, -- z.B. {"order_count": 1, "status_from": "neu", "status_to": "kontaktiert"}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index für schnellere Abfragen
CREATE INDEX idx_user_activities_user_date ON public.user_activities(user_id, created_at DESC);
CREATE INDEX idx_user_activities_type ON public.user_activities(activity_type, created_at DESC);

-- RLS Policies
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities"
ON public.user_activities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
ON public.user_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tabelle für Tages-Ziele
CREATE TABLE IF NOT EXISTS public.daily_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  planned_hours NUMERIC,
  target_orders INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_date)
);

-- RLS Policies für daily_goals
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
ON public.daily_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON public.daily_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.daily_goals
FOR UPDATE
USING (auth.uid() = user_id);

-- Funktion zur Berechnung der Conversion Rate
CREATE OR REPLACE FUNCTION public.get_user_conversion_rate(p_user_id UUID)
RETURNS TABLE(
  total_status_changes BIGINT,
  total_orders BIGINT,
  conversion_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE activity_type = 'status_changed') as total_status_changes,
    COUNT(*) FILTER (WHERE activity_type = 'order_created') as total_orders,
    CASE 
      WHEN COUNT(*) FILTER (WHERE activity_type = 'order_created') > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE activity_type = 'status_changed')::numeric / 
        NULLIF(COUNT(*) FILTER (WHERE activity_type = 'order_created'), 0)::numeric, 
        2
      )
      ELSE 0
    END as conversion_rate
  FROM public.user_activities
  WHERE user_id = p_user_id;
END;
$$;

-- Funktion für heutige Statistiken
CREATE OR REPLACE FUNCTION public.get_today_stats(p_user_id UUID)
RETURNS TABLE(
  orders_today BIGINT,
  status_changes_today BIGINT,
  goal_hours NUMERIC,
  goal_orders INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE activity_type = 'order_created' AND created_at::date = CURRENT_DATE) as orders_today,
    COUNT(*) FILTER (WHERE activity_type = 'status_changed' AND created_at::date = CURRENT_DATE) as status_changes_today,
    COALESCE(dg.planned_hours, 0) as goal_hours,
    COALESCE(dg.target_orders, 0) as goal_orders
  FROM public.user_activities ua
  LEFT JOIN public.daily_goals dg ON dg.user_id = p_user_id AND dg.goal_date = CURRENT_DATE
  WHERE ua.user_id = p_user_id
  GROUP BY dg.planned_hours, dg.target_orders;
END;
$$;