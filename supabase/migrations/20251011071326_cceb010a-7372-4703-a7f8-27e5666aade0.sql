-- Update the handle_new_user trigger to also assign 'rocket' role by default
CREATE OR REPLACE FUNCTION public.handle_new_user_with_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  random_color TEXT;
  color_options TEXT[] := ARRAY['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
BEGIN
  random_color := color_options[floor(random() * array_length(color_options, 1) + 1)];
  
  -- Insert profile
  INSERT INTO public.profiles (id, name, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    random_color
  );
  
  -- Assign default 'rocket' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'rocket');
  
  RETURN NEW;
END;
$function$;

-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger with the updated function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_role();