-- Create custom status table
CREATE TABLE IF NOT EXISTS public.custom_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Create custom rejection reasons table
CREATE TABLE IF NOT EXISTS public.rejection_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, reason)
);

-- Enable RLS
ALTER TABLE public.custom_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_statuses
CREATE POLICY "Admins can manage custom statuses"
  ON public.custom_statuses
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view custom statuses"
  ON public.custom_statuses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_rockets pr
      WHERE pr.project_id = custom_statuses.project_id
      AND pr.user_id = auth.uid()
    )
  );

-- RLS Policies for rejection_reasons
CREATE POLICY "Admins can manage rejection reasons"
  ON public.rejection_reasons
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view rejection reasons"
  ON public.rejection_reasons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_rockets pr
      WHERE pr.project_id = rejection_reasons.project_id
      AND pr.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_custom_statuses_updated_at
  BEFORE UPDATE ON public.custom_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default statuses (these are read-only and always available)
-- Note: These are just for reference, the actual default statuses are hardcoded in the app
COMMENT ON TABLE public.custom_statuses IS 'Custom project-specific statuses. Default statuses (offen, nicht-angetroffen, karte-eingeworfen, potenzial, neukunde, bestandskunde, kein-interesse, termin, nicht-vorhanden, gewerbe) are hardcoded and always available.';

-- Insert default rejection reasons
COMMENT ON TABLE public.rejection_reasons IS 'Custom project-specific rejection reasons. Default reasons include: Zu alt, Kein Besuch mehr erwünscht, Ziehen bald weg, Zur Miete, Anderer Grund (mandatory).';