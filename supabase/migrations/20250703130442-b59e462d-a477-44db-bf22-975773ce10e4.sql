
-- Add a new column to store detailed quotation breakdown as JSON
ALTER TABLE public.quotations 
ADD COLUMN quotation_details JSONB;

-- Add a comment to document the structure
COMMENT ON COLUMN public.quotations.quotation_details IS 'Stores detailed breakdown including days configuration, post-production settings, add-ons, and totals';
