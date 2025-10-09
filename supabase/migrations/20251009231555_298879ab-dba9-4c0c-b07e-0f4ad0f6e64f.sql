-- Create table for tracking unit activities (creation and deletion)
CREATE TABLE IF NOT EXISTS public.unit_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_id INTEGER NOT NULL REFERENCES public.addresses(id) ON DELETE CASCADE,
  unit_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.unit_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own unit activities"
  ON public.unit_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own unit activities"
  ON public.unit_activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all unit activities for analytics
CREATE POLICY "Admins can view all unit activities"
  ON public.unit_activities
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_unit_activities_user_id ON public.unit_activities(user_id);
CREATE INDEX idx_unit_activities_address_id ON public.unit_activities(address_id);
CREATE INDEX idx_unit_activities_created_at ON public.unit_activities(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.unit_activities IS 'Tracks creation and deletion of units for analytics and potential automatic blocking';
COMMENT ON COLUMN public.unit_activities.activity_type IS 'Type of activity: created or deleted';
COMMENT ON COLUMN public.unit_activities.metadata IS 'Additional information like unit floor, position, etc.';