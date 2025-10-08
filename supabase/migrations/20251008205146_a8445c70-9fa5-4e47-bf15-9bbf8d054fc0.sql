-- Fix nullable created_by columns to prevent orphaned records

-- First, update any existing NULL values in addresses table
UPDATE addresses 
SET created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE created_by IS NULL;

-- Add NOT NULL constraint to addresses.created_by
ALTER TABLE addresses 
ALTER COLUMN created_by SET NOT NULL;

-- Update any existing NULL values in lauflisten table
UPDATE lauflisten 
SET created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE created_by IS NULL;

-- Add NOT NULL constraint to lauflisten.created_by
ALTER TABLE lauflisten 
ALTER COLUMN created_by SET NOT NULL;