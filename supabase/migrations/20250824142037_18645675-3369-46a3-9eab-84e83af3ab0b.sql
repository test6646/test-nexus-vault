-- Add reflect_to_company field to accounting_entries table
ALTER TABLE public.accounting_entries 
ADD COLUMN reflect_to_company BOOLEAN NOT NULL DEFAULT false;

-- Add index for better query performance when filtering by reflect_to_company
CREATE INDEX idx_accounting_entries_reflect_to_company 
ON public.accounting_entries(firm_id, reflect_to_company) 
WHERE reflect_to_company = true;