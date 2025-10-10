-- Phase 1a: App Role Enum erweitern

DO $$ 
BEGIN
  -- Füge neue Werte zum bestehenden app_role enum hinzu
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'project_manager';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'rocket';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;