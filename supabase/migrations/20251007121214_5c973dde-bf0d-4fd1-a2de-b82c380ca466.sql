-- Create a permanent addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
  id SERIAL PRIMARY KEY,
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  units JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Addresses are viewable by everyone
CREATE POLICY "Addresses are viewable by everyone"
ON public.addresses
FOR SELECT
USING (true);

-- Users can create addresses
CREATE POLICY "Users can create addresses"
ON public.addresses
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update their own addresses
CREATE POLICY "Users can update their own addresses"
ON public.addresses
FOR UPDATE
USING (auth.uid() = created_by);

-- Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses"
ON public.addresses
FOR DELETE
USING (auth.uid() = created_by);

-- Insert test addresses from Bielefeld
INSERT INTO public.addresses (street, house_number, postal_code, city, coordinates, units, created_by)
SELECT 
  'Am Pfarracker',
  house_number,
  '33659',
  'Bielefeld',
  coords::jsonb,
  units::jsonb,
  (SELECT id FROM auth.users LIMIT 1)
FROM (VALUES
  ('33 A', '[8.5599108, 52.0520281]', '[{"id": 1, "floor": "EG", "status": "offen", "position": "Links"}]'),
  ('33 B', '[8.5599108, 52.0520281]', '[{"id": 1, "floor": "EG", "status": "potenzial", "position": "Rechts"}]'),
  ('35', '[8.5591398, 52.0519427]', '[{"id": 1, "floor": "EG", "status": "termin", "position": "Links"}, {"id": 2, "floor": "1. OG", "status": "offen", "position": "Links"}]'),
  ('37 B', '[8.5586277, 52.0513426]', '[{"id": 1, "floor": "EG", "status": "bestandskunde", "position": "Mitte"}]'),
  ('33', '[8.5599108, 52.0520281]', '[{"id": 1, "floor": "EG", "status": "neukunde", "position": "Links"}, {"id": 2, "floor": "1. OG", "status": "potenzial", "position": "Links"}]'),
  ('37', '[8.5581904, 52.0513571]', '[{"id": 1, "floor": "EG", "status": "kein-interesse", "position": "Rechts"}]'),
  ('37 C', '[8.5581904, 52.0513571]', '[{"id": 1, "floor": "EG", "status": "nicht-angetroffen", "position": "Links"}, {"id": 2, "floor": "1. OG", "status": "gewerbe", "position": "Links"}]'),
  ('35 B', '[8.5591398, 52.0519427]', '[{"id": 1, "floor": "EG", "status": "offen", "position": "Mitte"}]'),
  ('37 A', '[8.5581904, 52.0513571]', '[{"id": 1, "floor": "EG", "status": "potenzial", "position": "Rechts"}, {"id": 2, "floor": "1. OG", "status": "termin", "position": "Rechts"}]'),
  ('35 A', '[8.5591619, 52.0517726]', '[{"id": 1, "floor": "EG", "status": "offen", "position": "Links"}, {"id": 2, "floor": "1. OG", "status": "neukunde", "position": "Links"}, {"id": 3, "floor": "2. OG", "status": "potenzial", "position": "Links"}]'),
  ('37 D', '[8.5581904, 52.0513571]', '[{"id": 1, "floor": "EG", "status": "offen", "position": "Rechts"}, {"id": 2, "floor": "1. OG", "status": "potenzial", "position": "Rechts"}]')
) AS t(house_number, coords, units)
ON CONFLICT DO NOTHING;