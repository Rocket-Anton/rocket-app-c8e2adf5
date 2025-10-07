-- Create profiles table for users (Raketen)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create lauflisten (running lists) table
CREATE TABLE public.lauflisten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  color TEXT NOT NULL,
  address_count INTEGER DEFAULT 0,
  unit_count INTEGER DEFAULT 0,
  factor DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.lauflisten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lauflisten are viewable by everyone"
  ON public.lauflisten FOR SELECT
  USING (true);

CREATE POLICY "Users can create lauflisten"
  ON public.lauflisten FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update lauflisten"
  ON public.lauflisten FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete lauflisten"
  ON public.lauflisten FOR DELETE
  USING (auth.uid() = created_by);

-- Create lauflisten_addresses junction table
CREATE TABLE public.lauflisten_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laufliste_id UUID NOT NULL REFERENCES public.lauflisten(id) ON DELETE CASCADE,
  address_id INTEGER NOT NULL,
  street TEXT NOT NULL,
  house_number TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  units JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.lauflisten_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lauflisten addresses are viewable by everyone"
  ON public.lauflisten_addresses FOR SELECT
  USING (true);

CREATE POLICY "Users can add addresses to lauflisten"
  ON public.lauflisten_addresses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lauflisten
      WHERE id = laufliste_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete addresses from lauflisten"
  ON public.lauflisten_addresses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lauflisten
      WHERE id = laufliste_id AND created_by = auth.uid()
    )
  );

-- Trigger to update user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  random_color TEXT;
  color_options TEXT[] := ARRAY['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
BEGIN
  random_color := color_options[floor(random() * array_length(color_options, 1) + 1)];
  
  INSERT INTO public.profiles (id, name, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    random_color
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();