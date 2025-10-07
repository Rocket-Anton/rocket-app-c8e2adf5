-- Add UPDATE policy for lauflisten_addresses
CREATE POLICY "Users can update addresses in their lauflisten"
ON lauflisten_addresses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM lauflisten
    WHERE lauflisten.id = lauflisten_addresses.laufliste_id
    AND lauflisten.created_by = auth.uid()
  )
);

-- Update the coordinates for Am Pfarracker 35 A from [0,0] to correct location
-- This is a one-time fix for the test data
UPDATE lauflisten_addresses
SET coordinates = '[8.5591619, 52.0517726]'::jsonb
WHERE house_number = '35 A' 
AND street = 'Am Pfarracker' 
AND postal_code = '33659'
AND city = 'Bielefeld'
AND coordinates = '[0, 0]'::jsonb;