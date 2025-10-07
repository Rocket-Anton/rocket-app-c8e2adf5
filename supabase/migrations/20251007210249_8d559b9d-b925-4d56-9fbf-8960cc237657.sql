-- Sichere RLS Policies mit Performance-Optimierung für große Datenmengen

-- 1. PROFILES: Nur eigenes Profil + Kollegen in gemeinsamen Listen
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view own profile and collaborators"
ON profiles FOR SELECT
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM lauflisten
    WHERE (created_by = auth.uid() OR assigned_to = auth.uid())
    AND (created_by = profiles.id OR assigned_to = profiles.id)
    LIMIT 1
  )
);

-- 2. ADDRESSES: Nur authentifizierte Nutzer sehen ihre eigenen oder zugewiesene Adressen
DROP POLICY IF EXISTS "Addresses are viewable by everyone" ON addresses;

CREATE POLICY "Users can view their addresses"
ON addresses FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 
      FROM lauflisten_addresses la
      JOIN lauflisten l ON l.id = la.laufliste_id
      WHERE la.address_id = addresses.id
      AND (l.created_by = auth.uid() OR l.assigned_to = auth.uid())
      LIMIT 1
    )
  )
);

-- Index für Performance bei großen Datenmengen
CREATE INDEX IF NOT EXISTS idx_lauflisten_addresses_address_id ON lauflisten_addresses(address_id);
CREATE INDEX IF NOT EXISTS idx_lauflisten_created_by ON lauflisten(created_by);
CREATE INDEX IF NOT EXISTS idx_lauflisten_assigned_to ON lauflisten(assigned_to);
CREATE INDEX IF NOT EXISTS idx_addresses_created_by ON addresses(created_by);

-- 3. LAUFLISTEN: Nur eigene oder zugewiesene Listen
DROP POLICY IF EXISTS "Lauflisten are viewable by everyone" ON lauflisten;

CREATE POLICY "Users can view their lauflisten"
ON lauflisten FOR SELECT
USING (
  auth.uid() = created_by OR
  auth.uid() = assigned_to
);

-- 4. LAUFLISTEN_ADDRESSES: Zugriff wie bei Lauflisten
DROP POLICY IF EXISTS "Lauflisten addresses are viewable by everyone" ON lauflisten_addresses;

CREATE POLICY "Users can view addresses in their lauflisten"
ON lauflisten_addresses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lauflisten
    WHERE lauflisten.id = lauflisten_addresses.laufliste_id
    AND (lauflisten.created_by = auth.uid() OR lauflisten.assigned_to = auth.uid())
    LIMIT 1
  )
);

-- Performance-Index für user_activities (Millionen von Status-Änderungen)
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id_created_at ON user_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);

-- Performance-Optimierung: Partitionierung vorbereiten (für später bei sehr großen Datenmengen)
COMMENT ON TABLE user_activities IS 'Consider partitioning by created_at when reaching millions of records';