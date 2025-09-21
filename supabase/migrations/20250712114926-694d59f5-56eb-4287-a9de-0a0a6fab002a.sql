-- Add spreadsheet_id column to firms table
ALTER TABLE public.firms 
ADD COLUMN spreadsheet_id TEXT;