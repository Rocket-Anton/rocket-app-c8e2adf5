-- Add CASCADE DELETE to lauflisten_addresses foreign key
-- This ensures that when a laufliste is deleted, all its addresses are also removed
ALTER TABLE lauflisten_addresses 
DROP CONSTRAINT IF EXISTS lauflisten_addresses_laufliste_id_fkey;

ALTER TABLE lauflisten_addresses 
ADD CONSTRAINT lauflisten_addresses_laufliste_id_fkey 
FOREIGN KEY (laufliste_id) 
REFERENCES lauflisten(id) 
ON DELETE CASCADE;