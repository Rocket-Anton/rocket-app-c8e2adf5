-- Create helper function for admin checks
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
$$;

-- PROJECTS TABLE
DROP POLICY IF EXISTS "Admins can view all projects" ON projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

CREATE POLICY "Admins can view all projects" ON projects FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can insert projects" ON projects FOR INSERT WITH CHECK (is_admin_or_super());
CREATE POLICY "Admins can update projects" ON projects FOR UPDATE USING (is_admin_or_super());
CREATE POLICY "Admins can delete projects" ON projects FOR DELETE USING (is_admin_or_super());

-- PROVIDERS TABLE
DROP POLICY IF EXISTS "Admins can view all providers" ON providers;
DROP POLICY IF EXISTS "Admins can insert providers" ON providers;
DROP POLICY IF EXISTS "Admins can update providers" ON providers;
DROP POLICY IF EXISTS "Admins can delete providers" ON providers;

CREATE POLICY "Admins can view all providers" ON providers FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can insert providers" ON providers FOR INSERT WITH CHECK (is_admin_or_super());
CREATE POLICY "Admins can update providers" ON providers FOR UPDATE USING (is_admin_or_super());
CREATE POLICY "Admins can delete providers" ON providers FOR DELETE USING (is_admin_or_super());

-- PROVIDER_CONTACTS TABLE
DROP POLICY IF EXISTS "Admins can view all provider contacts" ON provider_contacts;
DROP POLICY IF EXISTS "Admins can insert provider contacts" ON provider_contacts;
DROP POLICY IF EXISTS "Admins can update provider contacts" ON provider_contacts;
DROP POLICY IF EXISTS "Admins can delete provider contacts" ON provider_contacts;

CREATE POLICY "Admins can view all provider contacts" ON provider_contacts FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can insert provider contacts" ON provider_contacts FOR INSERT WITH CHECK (is_admin_or_super());
CREATE POLICY "Admins can update provider contacts" ON provider_contacts FOR UPDATE USING (is_admin_or_super());
CREATE POLICY "Admins can delete provider contacts" ON provider_contacts FOR DELETE USING (is_admin_or_super());

-- PROVIDER_AI_INSTRUCTIONS TABLE
DROP POLICY IF EXISTS "Admins can view provider AI instructions" ON provider_ai_instructions;
DROP POLICY IF EXISTS "Admins can insert provider AI instructions" ON provider_ai_instructions;
DROP POLICY IF EXISTS "Admins can update provider AI instructions" ON provider_ai_instructions;
DROP POLICY IF EXISTS "Admins can delete provider AI instructions" ON provider_ai_instructions;

CREATE POLICY "Admins can view provider AI instructions" ON provider_ai_instructions FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can insert provider AI instructions" ON provider_ai_instructions FOR INSERT WITH CHECK (is_admin_or_super());
CREATE POLICY "Admins can update provider AI instructions" ON provider_ai_instructions FOR UPDATE USING (is_admin_or_super());
CREATE POLICY "Admins can delete provider AI instructions" ON provider_ai_instructions FOR DELETE USING (is_admin_or_super());

-- PROJECT_AI_INSTRUCTIONS TABLE
DROP POLICY IF EXISTS "Admins can view project AI instructions" ON project_ai_instructions;
DROP POLICY IF EXISTS "Admins can insert project AI instructions" ON project_ai_instructions;
DROP POLICY IF EXISTS "Admins can update project AI instructions" ON project_ai_instructions;
DROP POLICY IF EXISTS "Admins can delete project AI instructions" ON project_ai_instructions;

CREATE POLICY "Admins can view project AI instructions" ON project_ai_instructions FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can insert project AI instructions" ON project_ai_instructions FOR INSERT WITH CHECK (is_admin_or_super());
CREATE POLICY "Admins can update project AI instructions" ON project_ai_instructions FOR UPDATE USING (is_admin_or_super());
CREATE POLICY "Admins can delete project AI instructions" ON project_ai_instructions FOR DELETE USING (is_admin_or_super());

-- PROJECT_ROCKETS TABLE
DROP POLICY IF EXISTS "Admins can manage project rockets" ON project_rockets;
CREATE POLICY "Admins can manage project rockets" ON project_rockets FOR ALL USING (is_admin_or_super());

-- PROJECT_TARIFFS TABLE
DROP POLICY IF EXISTS "Admins can view project tariffs" ON project_tariffs;
DROP POLICY IF EXISTS "Admins can manage project tariffs" ON project_tariffs;

CREATE POLICY "Admins can view project tariffs" ON project_tariffs FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can manage project tariffs" ON project_tariffs FOR ALL USING (is_admin_or_super());

-- PROJECT_ADDONS TABLE
DROP POLICY IF EXISTS "Admins can view project addons" ON project_addons;
DROP POLICY IF EXISTS "Admins can manage project addons" ON project_addons;

CREATE POLICY "Admins can view project addons" ON project_addons FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can manage project addons" ON project_addons FOR ALL USING (is_admin_or_super());

-- ADDONS TABLE
DROP POLICY IF EXISTS "Admins can view all addons" ON addons;
DROP POLICY IF EXISTS "Admins can manage addons" ON addons;

CREATE POLICY "Admins can view all addons" ON addons FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can manage addons" ON addons FOR ALL USING (is_admin_or_super());

-- TARIFFS TABLE
DROP POLICY IF EXISTS "Admins can view all tariffs" ON tariffs;
DROP POLICY IF EXISTS "Admins can manage tariffs" ON tariffs;

CREATE POLICY "Admins can view all tariffs" ON tariffs FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can manage tariffs" ON tariffs FOR ALL USING (is_admin_or_super());

-- CUSTOM_STATUSES TABLE
DROP POLICY IF EXISTS "Admins can manage custom statuses" ON custom_statuses;
CREATE POLICY "Admins can manage custom statuses" ON custom_statuses FOR ALL USING (is_admin_or_super()) WITH CHECK (is_admin_or_super());

-- REJECTION_REASONS TABLE
DROP POLICY IF EXISTS "Admins can manage rejection reasons" ON rejection_reasons;
CREATE POLICY "Admins can manage rejection reasons" ON rejection_reasons FOR ALL USING (is_admin_or_super()) WITH CHECK (is_admin_or_super());

-- CSV_COLUMN_MAPPINGS TABLE
DROP POLICY IF EXISTS "Admins can manage CSV mappings" ON csv_column_mappings;
CREATE POLICY "Admins can manage CSV mappings" ON csv_column_mappings FOR ALL USING (is_admin_or_super());

-- PROJECT_ADDRESS_LISTS TABLE
DROP POLICY IF EXISTS "Admins can view project address lists" ON project_address_lists;
DROP POLICY IF EXISTS "Admins can manage project address lists" ON project_address_lists;

CREATE POLICY "Admins can view project address lists" ON project_address_lists FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can manage project address lists" ON project_address_lists FOR ALL USING (is_admin_or_super());

-- EVENTS TABLE
DROP POLICY IF EXISTS "Admins can view all events" ON events;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;

CREATE POLICY "Admins can view all events" ON events FOR SELECT USING (is_admin_or_super());
CREATE POLICY "Admins can manage all events" ON events FOR ALL USING (is_admin_or_super()) WITH CHECK (is_admin_or_super());

-- UNIT_ACTIVITIES TABLE
DROP POLICY IF EXISTS "Admins can view all unit activities" ON unit_activities;
CREATE POLICY "Admins can view all unit activities" ON unit_activities FOR SELECT USING (is_admin_or_super());