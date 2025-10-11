-- Update the handle_new_user trigger to store first_name and last_name separately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  random_color TEXT;
  color_options TEXT[] := ARRAY['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  full_name TEXT;
BEGIN
  random_color := color_options[floor(random() * array_length(color_options, 1) + 1)];
  
  -- Create full name from first_name and last_name if available
  IF NEW.raw_user_meta_data->>'first_name' IS NOT NULL AND NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
    full_name := (NEW.raw_user_meta_data->>'first_name') || ' ' || (NEW.raw_user_meta_data->>'last_name');
  ELSE
    full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  END IF;
  
  -- Insert profile with separate first_name and last_name
  INSERT INTO public.profiles (id, name, first_name, last_name, color)
  VALUES (
    NEW.id,
    full_name,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    random_color
  );
  
  RETURN NEW;
END;
$function$;