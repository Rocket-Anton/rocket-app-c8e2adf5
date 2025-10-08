-- Add locality (Ortschaft) field to addresses table
ALTER TABLE addresses 
ADD COLUMN locality TEXT;

-- Add system_notes to units table (non-deletable notes from CSV import)
ALTER TABLE units 
ADD COLUMN system_notes TEXT,
ADD COLUMN system_notes_created_by TEXT DEFAULT 'Rocket System';

-- Create table for saved CSV column mappings
CREATE TABLE csv_column_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  mapping_name TEXT NOT NULL,
  column_mapping JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false
);

-- Enable RLS on csv_column_mappings
ALTER TABLE csv_column_mappings ENABLE ROW LEVEL SECURITY;

-- Admins can manage CSV mappings
CREATE POLICY "Admins can manage CSV mappings"
ON csv_column_mappings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Create index for faster lookups
CREATE INDEX idx_csv_mappings_provider ON csv_column_mappings(provider_id);
CREATE INDEX idx_csv_mappings_default ON csv_column_mappings(provider_id, is_default) WHERE is_default = true;

-- Add trigger for updated_at
CREATE TRIGGER update_csv_column_mappings_updated_at
BEFORE UPDATE ON csv_column_mappings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();