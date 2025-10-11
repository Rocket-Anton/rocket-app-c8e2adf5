-- Create address_assignments table for tracking address assignment history
CREATE TABLE public.address_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address_id INTEGER NOT NULL REFERENCES public.addresses(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create address_status_history table for tracking address status changes
CREATE TABLE public.address_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address_id INTEGER NOT NULL REFERENCES public.addresses(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create unit_assignments table for tracking unit assignment history
CREATE TABLE public.unit_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unit_status_history table for tracking unit status changes
CREATE TABLE public.unit_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_id INTEGER NOT NULL REFERENCES public.addresses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, address_id)
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  total_amount NUMERIC,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Add status field to addresses table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'addresses' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.addresses ADD COLUMN status TEXT DEFAULT 'Offen';
  END IF;
END $$;

-- Add assigned_to field to addresses table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'addresses' 
    AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.addresses ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add assigned_to field to units table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'units' 
    AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.units ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.address_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.address_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for address_assignments
CREATE POLICY "Users can view address assignments for their addresses"
ON public.address_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.addresses
    WHERE addresses.id = address_assignments.address_id
    AND (addresses.created_by = auth.uid() OR addresses.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can create address assignments"
ON public.address_assignments FOR INSERT
WITH CHECK (assigned_by = auth.uid());

-- RLS Policies for address_status_history
CREATE POLICY "Users can view address status history for their addresses"
ON public.address_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.addresses
    WHERE addresses.id = address_status_history.address_id
    AND (addresses.created_by = auth.uid() OR addresses.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can create address status history"
ON public.address_status_history FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- RLS Policies for unit_assignments
CREATE POLICY "Users can view unit assignments for their units"
ON public.unit_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.addresses a ON a.id = u.address_id
    WHERE u.id = unit_assignments.unit_id
    AND (a.created_by = auth.uid() OR u.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can create unit assignments"
ON public.unit_assignments FOR INSERT
WITH CHECK (assigned_by = auth.uid());

-- RLS Policies for unit_status_history
CREATE POLICY "Users can view unit status history for their units"
ON public.unit_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.addresses a ON a.id = u.address_id
    WHERE u.id = unit_status_history.unit_id
    AND (a.created_by = auth.uid() OR u.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can create unit status history"
ON public.unit_status_history FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- RLS Policies for customers
CREATE POLICY "Users can view customers for their addresses"
ON public.customers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.addresses
    WHERE addresses.id = customers.address_id
    AND (addresses.created_by = auth.uid() OR addresses.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can create customers"
ON public.customers FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their customers"
ON public.customers FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their customers"
ON public.customers FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for orders
CREATE POLICY "Users can view orders for their customers"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.addresses a ON a.id = c.address_id
    WHERE c.id = orders.customer_id
    AND (a.created_by = auth.uid() OR a.assigned_to = auth.uid())
  )
);

CREATE POLICY "Users can create orders"
ON public.orders FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their orders"
ON public.orders FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their orders"
ON public.orders FOR DELETE
USING (created_by = auth.uid());

-- Admins can manage everything
CREATE POLICY "Admins can manage address assignments"
ON public.address_assignments FOR ALL
USING (is_admin_or_super());

CREATE POLICY "Admins can manage address status history"
ON public.address_status_history FOR ALL
USING (is_admin_or_super());

CREATE POLICY "Admins can manage unit assignments"
ON public.unit_assignments FOR ALL
USING (is_admin_or_super());

CREATE POLICY "Admins can manage unit status history"
ON public.unit_status_history FOR ALL
USING (is_admin_or_super());

CREATE POLICY "Admins can manage customers"
ON public.customers FOR ALL
USING (is_admin_or_super());

CREATE POLICY "Admins can manage orders"
ON public.orders FOR ALL
USING (is_admin_or_super());

-- Trigger function to log unit status changes
CREATE OR REPLACE FUNCTION public.log_unit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.unit_status_history (unit_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function to log address status changes
CREATE OR REPLACE FUNCTION public.log_address_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.address_status_history (address_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function to log unit assignments
CREATE OR REPLACE FUNCTION public.log_unit_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.unit_assignments (unit_id, assigned_by, assigned_to)
    VALUES (NEW.id, auth.uid(), NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function to log address assignments
CREATE OR REPLACE FUNCTION public.log_address_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO public.address_assignments (address_id, assigned_by, assigned_to)
    VALUES (NEW.id, auth.uid(), NEW.assigned_to);
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS unit_status_change_trigger ON public.units;
CREATE TRIGGER unit_status_change_trigger
AFTER UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.log_unit_status_change();

DROP TRIGGER IF EXISTS address_status_change_trigger ON public.addresses;
CREATE TRIGGER address_status_change_trigger
AFTER UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.log_address_status_change();

DROP TRIGGER IF EXISTS unit_assignment_trigger ON public.units;
CREATE TRIGGER unit_assignment_trigger
AFTER UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.log_unit_assignment();

DROP TRIGGER IF EXISTS address_assignment_trigger ON public.addresses;
CREATE TRIGGER address_assignment_trigger
AFTER UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION public.log_address_assignment();

-- Add updated_at trigger for customers and orders
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();