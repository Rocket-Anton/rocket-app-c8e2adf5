-- Phase 1b: Events-Tabelle erweitern und RLS-Policies aktualisieren

-- 1. Events-Tabelle erweitern mit Adress-, Unit- und Projekt-Verknüpfungen
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS address_id integer REFERENCES addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_external boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_source text;

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_events_address_id ON events(address_id);
CREATE INDEX IF NOT EXISTS idx_events_unit_id ON events(unit_id);
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_external ON events(external_id, external_source) WHERE is_external = true;
CREATE INDEX IF NOT EXISTS idx_events_user_start ON events(user_id, start_datetime);

-- 2. Tabelle für externe Kalender-Verbindungen
CREATE TABLE IF NOT EXISTS external_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('google', 'outlook')),
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamp with time zone,
  calendar_id text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS für external_calendar_connections
ALTER TABLE external_calendar_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own calendar connections" ON external_calendar_connections;
CREATE POLICY "Users can manage their own calendar connections"
ON external_calendar_connections FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. RLS-Policies für Events aktualisieren
DROP POLICY IF EXISTS "Users can create their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;

-- Admin Policies
DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
ON events FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage all events" ON events;
CREATE POLICY "Admins can manage all events"
ON events FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Project Manager Policies
DROP POLICY IF EXISTS "Project managers can view their projects events" ON events;
CREATE POLICY "Project managers can view their projects events"
ON events FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) AND
  (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects
      WHERE project_manager_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Project managers can create events in their projects" ON events;
CREATE POLICY "Project managers can create events in their projects"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_manager'::app_role) AND
  (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects
      WHERE project_manager_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Project managers can update their projects events" ON events;
CREATE POLICY "Project managers can update their projects events"
ON events FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) AND
  (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects
      WHERE project_manager_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Project managers can delete their projects events" ON events;
CREATE POLICY "Project managers can delete their projects events"
ON events FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'project_manager'::app_role) AND
  (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects
      WHERE project_manager_id = auth.uid()
    )
  )
);

-- Rocket Policies
DROP POLICY IF EXISTS "Rockets can view own and assigned project events" ON events;
CREATE POLICY "Rockets can view own and assigned project events"
ON events FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  project_id IN (
    SELECT project_id FROM project_rockets
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Rockets can create own events" ON events;
CREATE POLICY "Rockets can create own events"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  (
    project_id IS NULL OR
    project_id IN (
      SELECT project_id FROM project_rockets
      WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Rockets can update own events" ON events;
CREATE POLICY "Rockets can update own events"
ON events FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Rockets can delete own events" ON events;
CREATE POLICY "Rockets can delete own events"
ON events FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 4. Trigger für updated_at auf external_calendar_connections
DROP TRIGGER IF EXISTS update_external_calendar_connections_updated_at ON external_calendar_connections;
CREATE TRIGGER update_external_calendar_connections_updated_at
BEFORE UPDATE ON external_calendar_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();