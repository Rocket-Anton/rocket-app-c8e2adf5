-- Temporarily remove Bielefeld addresses
-- This is a one-time cleanup operation
DELETE FROM addresses WHERE city ILIKE '%bielefeld%';