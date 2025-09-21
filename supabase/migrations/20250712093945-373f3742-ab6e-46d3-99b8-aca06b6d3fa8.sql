
-- Remove the spreadsheet_id column from firms table since we're removing Google Sheets integration
ALTER TABLE public.firms DROP COLUMN IF EXISTS spreadsheet_id;

-- Drop any Google Sheets related functions if they exist in the database
-- (Most of the sync logic appears to be in Edge Functions, but checking for any DB functions)
DROP FUNCTION IF EXISTS public.sync_to_google_sheets() CASCADE;
DROP FUNCTION IF EXISTS public.google_sheets_webhook() CASCADE;
DROP FUNCTION IF EXISTS public.handle_spreadsheet_sync() CASCADE;

-- Remove any triggers related to Google Sheets syncing
DROP TRIGGER IF EXISTS sync_event_to_sheets ON public.events;
DROP TRIGGER IF EXISTS sync_expense_to_sheets ON public.expenses;
DROP TRIGGER IF EXISTS sync_task_to_sheets ON public.tasks;
DROP TRIGGER IF EXISTS sync_payment_to_sheets ON public.payments;

-- Clean up any spreadsheet-related columns from other tables (if any exist)
-- Note: Based on the schema, I don't see any other spreadsheet-specific columns
