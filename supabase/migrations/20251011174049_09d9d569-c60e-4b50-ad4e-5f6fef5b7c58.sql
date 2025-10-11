-- Clean up orphaned units and addresses before adding CASCADE constraints

-- Step 1: Delete orphaned units (units pointing to non-existent addresses)
DELETE FROM public.units 
WHERE address_id NOT IN (SELECT id FROM public.addresses);

-- Step 2: Delete orphaned addresses (addresses pointing to non-existent lists)
DELETE FROM public.addresses 
WHERE list_id IS NOT NULL 
AND list_id NOT IN (SELECT id FROM public.project_address_lists);

-- Step 3: Now add CASCADE constraints
ALTER TABLE public.units 
DROP CONSTRAINT IF EXISTS units_address_id_fkey;

ALTER TABLE public.addresses 
DROP CONSTRAINT IF EXISTS addresses_list_id_fkey;

ALTER TABLE public.units
ADD CONSTRAINT units_address_id_fkey 
FOREIGN KEY (address_id) 
REFERENCES public.addresses(id) 
ON DELETE CASCADE;

ALTER TABLE public.addresses
ADD CONSTRAINT addresses_list_id_fkey 
FOREIGN KEY (list_id) 
REFERENCES public.project_address_lists(id) 
ON DELETE CASCADE;

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_list_id ON public.addresses(list_id);
CREATE INDEX IF NOT EXISTS idx_addresses_project_id ON public.addresses(project_id);